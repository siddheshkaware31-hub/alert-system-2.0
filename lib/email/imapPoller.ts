import { ImapFlow } from 'imapflow'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzeHotelReply } from '@/lib/ai/parser'

export interface PollResult {
  awaitingReply: number   // bookings that had email sent, still waiting
  scanned: number         // emails fetched from IMAP
  matched: number         // emails that contained a booking ref
  confirmed: number       // bookings auto-confirmed from this poll
  failed: number          // bookings auto-failed from this poll
  errors: string[]
}

// Booking ref patterns: 26VELxxxxx or HBBxxxxx etc.
const BOOKING_REF_RE = /\b(26VEL\d{5}|HBB\w{6}|\w{2,4}\d{6,})\b/gi

function extractBookingRefs(text: string): string[] {
  const matches: string[] = [...(text.match(BOOKING_REF_RE) ?? [])]
  const labelMatch = text.match(/booking\s+ref(?:erence)?\s*[:\-#]?\s*([A-Z0-9\-]+)/gi) ?? []
  for (const m of labelMatch) {
    const val = m.replace(/^booking\s+ref(?:erence)?\s*[:\-#]?\s*/i, '').trim()
    if (val) matches.push(val)
  }
  return [...new Set(matches.map(r => r.trim().toUpperCase()))]
}

// Format a Date as DD-Mon-YYYY for IMAP SINCE criteria (e.g. "20-Aug-2026")
function imapDate(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
}

export async function pollEmailReplies(): Promise<PollResult> {
  const result: PollResult = { awaitingReply: 0, scanned: 0, matched: 0, confirmed: 0, failed: 0, errors: [] }
  const db = createServiceClient()

  // Only check bookings where we actually sent an email AND still awaiting reply.
  // This ensures we only search IMAP for agents who received a notification email
  // and haven't replied yet — confirmed/cancelled ones are already resolved.
  const { data: pendingBookings } = await db
    .from('hotel_bookings')
    .select('id, booking_ref, hotel_email, traveler_email, confirmation_status, created_at')
    .eq('confirmation_status', 'awaiting_reply')
    .eq('request_email_sent', true)

  if (!pendingBookings || pendingBookings.length === 0) {
    return result
  }
  result.awaitingReply = pendingBookings.length

  interface PendingBooking {
    id: string
    booking_ref: string
    hotel_email: string | null
    traveler_email: string | null
    confirmation_status: string
    created_at: string
  }
  const bookings = pendingBookings as PendingBooking[]

  // Unique hotel & traveler emails + earliest send date (SINCE that date in IMAP)
  const agentEmails = [...new Set(bookings.flatMap(b => [b.hotel_email, b.traveler_email]).filter(Boolean))] as string[]
  const earliest = bookings.reduce((min: string, b: PendingBooking) =>
    b.created_at < min ? b.created_at : min, bookings[0].created_at)

  // Index bookings by booking_ref for O(1) lookup
  const bookingByRef = new Map(bookings.map(b => [b.booking_ref.toUpperCase(), b]))

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
    logger: false,
  })

  await client.connect()

  try {
    await client.mailboxOpen('INBOX')

    // Build one search per agent email: UNSEEN FROM "email" SINCE date
    // imapflow accepts an array of criteria strings as OR when wrapped in arrays,
    // but the simplest correct approach is to union UIDs across per-email searches.
    const allUids = new Set<number>()

    for (const email of agentEmails) {
      // Use supported SearchObject form: { from, seen: false, since }
      const since = new Date(earliest)
      const uids = await client.search(
        { from: email as string, seen: false, since },
        { uid: true }
      )
      if (Array.isArray(uids)) {
        for (const uid of uids) allUids.add(uid)
      }
    }

    // Also search for delivery failure / bounce emails from Mailer Daemon
    try {
      const bounceUids = await client.search({ from: 'mailer-daemon', seen: false }, { uid: true })
      if (Array.isArray(bounceUids)) {
        for (const uid of bounceUids) allUids.add(uid)
      }
    } catch {}

    if (allUids.size === 0) {
      return result
    }

    for await (const msg of client.fetch([...allUids], {
      envelope: true,
      source: true,
    }, { uid: true })) {
      result.scanned++

      const rawSource = msg.source?.toString('utf-8') ?? ''
      const subject = msg.envelope?.subject ?? ''
      const from = msg.envelope?.from?.[0]?.address ?? ''
      const date = msg.envelope?.date?.toISOString() ?? new Date().toISOString()

      const bodyStart = rawSource.indexOf('\r\n\r\n')
      const body = bodyStart >= 0 ? rawSource.slice(bodyStart + 4) : rawSource
      const fullText = `${subject}\n${body}`

      // Check if this is a Mail Delivery Bounce (Address not found / Mailer Daemon)
      if (from.includes('mailer-daemon') || from.includes('postmaster') || subject.toLowerCase().includes('delivery status notification')) {
        for (const booking of bookings) {
          const targetEmail = booking.hotel_email || booking.traveler_email
          if (targetEmail && fullText.toLowerCase().includes(targetEmail.toLowerCase())) {
            await db.from('hotel_bookings').update({
              confirmation_status: 'failed',
            }).eq('id', booking.id)

            await db.from('notification_logs').insert({
              entity_type: 'hotel',
              entity_id: booking.id,
              channel: 'email',
              notification_type: 'email_bounced',
              recipient_email: targetEmail,
              status: 'failed',
              error_message: `Email bounced (Address Not Found): ${targetEmail}`,
            })
            result.failed++
          }
        }
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
        continue
      }

      const refs = extractBookingRefs(fullText)
      if (!refs.length) {
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
        continue
      }

      result.matched++

      for (const ref of refs) {
        const booking = bookingByRef.get(ref.toUpperCase())
        if (!booking) continue

        // Avoid duplicate reply records
        const { count } = await db
          .from('traveler_replies')
          .select('id', { count: 'exact', head: true })
          .eq('entity_id', booking.id)
          .eq('channel', 'email')
          .eq('received_at', date)

        if ((count ?? 0) > 0) continue

        await db.from('traveler_replies').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'email',
          from_number: from,
          message_body: body.slice(0, 2000),
          raw_payload: { subject, from, date, refs },
          received_at: date,
        })

        await db.from('notification_logs').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'email',
          notification_type: 'email_reply_received',
          recipient_email: from,
          status: 'sent',
          sent_at: date,
        })

        if (['pending', 'awaiting_reply'].includes(booking.confirmation_status)) {
          const aiAnalysis = await analyzeHotelReply(fullText)

          if (aiAnalysis === 'confirmed') {
            await db.from('hotel_bookings').update({
              confirmation_status: 'confirmed',
              confirmed_via: 'email',
              confirmed_at: date,
            }).eq('id', booking.id)

            // Update in-memory so a second ref in the same email doesn't double-confirm
            booking.confirmation_status = 'confirmed'
            result.confirmed++
          } else if (aiAnalysis === 'failed') {
            await db.from('hotel_bookings').update({
              confirmation_status: 'failed',
              confirmed_via: 'email',
              confirmed_at: date,
            }).eq('id', booking.id)

            booking.confirmation_status = 'failed'
            result.failed++
          }
        }
      }

      await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
    }
  } catch (err: unknown) {
    result.errors.push(err instanceof Error ? err.message : String(err))
  } finally {
    await client.logout()
  }

  return result
}
