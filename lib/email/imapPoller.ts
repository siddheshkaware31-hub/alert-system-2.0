import { ImapFlow } from 'imapflow'
import { createServiceClient } from '@/lib/supabase/server'

export interface PollResult {
  awaitingReply: number   // bookings that had email sent, still waiting
  scanned: number         // emails fetched from IMAP
  matched: number         // emails that contained a booking ref
  confirmed: number       // bookings auto-confirmed from this poll
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

function isConfirmationReply(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('confirm') ||
    lower.includes('reconfirm') ||
    lower.includes('yes') ||
    lower.includes('noted') ||
    lower.includes('acknowledged') ||
    lower.includes('received') ||
    lower.includes('booked')
  )
}

// Format a Date as DD-Mon-YYYY for IMAP SINCE criteria (e.g. "20-Aug-2026")
function imapDate(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
}

export async function pollEmailReplies(): Promise<PollResult> {
  const result: PollResult = { awaitingReply: 0, scanned: 0, matched: 0, confirmed: 0, errors: [] }
  const db = createServiceClient()

  // Only check bookings where we actually sent an email AND still awaiting reply.
  // This ensures we only search IMAP for agents who received a notification email
  // and haven't replied yet — confirmed/cancelled ones are already resolved.
  const { data: pendingBookings } = await db
    .from('hotel_bookings')
    .select('id, booking_ref, traveler_email, confirmation_status, created_at')
    .eq('confirmation_status', 'awaiting_reply')
    .eq('request_email_sent', true)
    .not('traveler_email', 'is', null)

  if (!pendingBookings || pendingBookings.length === 0) {
    return result
  }
  result.awaitingReply = pendingBookings.length

  interface PendingBooking {
    id: string
    booking_ref: string
    traveler_email: string
    confirmation_status: string
    created_at: string
  }
  const bookings = pendingBookings as PendingBooking[]

  // Unique agent emails + earliest send date (SINCE that date in IMAP)
  const agentEmails = [...new Set(bookings.map(b => b.traveler_email))]
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

        if (
          isConfirmationReply(fullText) &&
          ['pending', 'awaiting_reply'].includes(booking.confirmation_status)
        ) {
          await db.from('hotel_bookings').update({
            confirmation_status: 'confirmed',
            confirmed_via: 'email',
            confirmed_at: date,
          }).eq('id', booking.id)

          // Update in-memory so a second ref in the same email doesn't double-confirm
          booking.confirmation_status = 'confirmed'
          result.confirmed++
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
