import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import { boardingPassEmail } from '@/lib/email/templates/boardingPassEmail'
import { FlightBooking } from '@/types'

/**
 * Virtual Employee: Boarding Pass Dispatcher
 *
 * POST /api/flights/boarding-pass
 * Dispatches the digital boarding pass link to the traveler via Email + WhatsApp,
 * replacing the manual workflow where employees would download the boarding pass
 * from the airline website and forward it to the client.
 *
 * Body: { bookingIds: string[] }  — one or multiple flight booking IDs
 */
function isWithinCheckinWindow(departureDateStr: string, departureTimeStr?: string | null): { isOpen: boolean; message: string } {
  const now = new Date()
  const dep = new Date(departureDateStr)
  if (departureTimeStr) {
    const match = departureTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const ampm = match[3] ? match[3].toUpperCase() : null
      if (ampm === 'PM' && hours < 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
      dep.setHours(hours, minutes, 0, 0)
    }
  } else {
    dep.setHours(23, 59, 59, 999)
  }
  const hoursUntil = (dep.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil > 48) {
    return {
      isOpen: false,
      message: `Boarding pass has not been issued yet. Departure date (${departureDateStr}) is more than 48 hours away. Web check-in opens 48 hours before departure.`,
    }
  }

  return { isOpen: true, message: 'Check-in window is open.' }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { bookingIds } = body as { bookingIds?: string[] }

  if (!bookingIds?.length) {
    return NextResponse.json({ error: 'Provide bookingIds array' }, { status: 400 })
  }

  const db = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data: bookings, error } = await db
    .from('flight_bookings')
    .select('*')
    .in('id', bookingIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings?.length) return NextResponse.json({ error: 'No bookings found' }, { status: 404 })

  // Check 48-hour window for single booking request
  if (bookings.length === 1) {
    const single = bookings[0] as FlightBooking
    const windowCheck = isWithinCheckinWindow(single.departure_date, single.departure_time)
    if (!windowCheck.isOpen) {
      return NextResponse.json(
        {
          error: 'Boarding pass has not been issued yet',
          message: windowCheck.message,
        },
        { status: 400 }
      )
    }
  }

  let sent = 0
  let failed = 0
  const results: Array<{ id: string; pnr: string; email: string; whatsapp: string; passUrl: string }> = []

  for (const booking of bookings as FlightBooking[]) {
    const windowCheck = isWithinCheckinWindow(booking.departure_date, booking.departure_time)
    if (!windowCheck.isOpen) {
      failed++
      continue
    }
    const passUrl = `${appUrl}/pass/${booking.pnr}`
    const emailStatus = { status: 'skipped', error: '' }
    const waStatus = { status: 'skipped', error: '' }

    // ── Email ──────────────────────────────────────────────────────────────
    try {
      const { subject, html } = boardingPassEmail(booking)
      const { messageId } = await sendEmail({ to: booking.traveler_email, subject, html })
      await db.from('notification_logs').insert({
        entity_type: 'flight',
        entity_id: booking.id,
        channel: 'email',
        notification_type: 'boarding_pass',
        recipient_email: booking.traveler_email,
        status: 'sent',
        provider_message_id: messageId,
      })
      emailStatus.status = 'sent'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown email error'
      await db.from('notification_logs').insert({
        entity_type: 'flight',
        entity_id: booking.id,
        channel: 'email',
        notification_type: 'boarding_pass',
        recipient_email: booking.traveler_email,
        status: 'failed',
        error_message: msg,
      })
      emailStatus.status = 'failed'
      emailStatus.error = msg
    }

    // ── WhatsApp ───────────────────────────────────────────────────────────
    if (booking.traveler_phone) {
      try {
        const seat = booking.seat || '—'
        const gate = booking.gate || '—'
        const terminal = booking.terminal || '—'
        const text =
          `🎟️ *VeloTrav — Your Boarding Pass is Ready!*\n\n` +
          `Hi *${booking.traveler_name}*,\n` +
          `Your boarding pass for flight *${booking.flight_number}* has been automatically generated.\n\n` +
          `✈️ *${booking.origin} → ${booking.destination}*\n` +
          `📅 Date: ${booking.departure_date}\n` +
          `⏰ Departure: ${booking.departure_time || '—'}\n` +
          `💺 Seat: *${seat}* | 🚪 Gate: *${gate}* | 🏢 Terminal: *${terminal}*\n` +
          `🔖 PNR: *${booking.pnr}*\n\n` +
          `📱 *Open Your Boarding Pass (Live Gate & Delay Updates):*\n` +
          `${passUrl}\n\n` +
          `_No check-in required from your side — we handled it for you. Have a safe flight!_ ✈️`

        const wa = await sendWhatsAppText(booking.traveler_phone, text)
        await db.from('notification_logs').insert({
          entity_type: 'flight',
          entity_id: booking.id,
          channel: 'whatsapp',
          notification_type: 'boarding_pass',
          recipient_phone: booking.traveler_phone,
          status: wa.error ? 'failed' : 'sent',
          provider_message_id: wa.messageId,
          error_message: wa.error || null,
        })
        waStatus.status = wa.error ? 'failed' : 'sent'
        if (wa.error) waStatus.error = wa.error
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown WA error'
        await db.from('notification_logs').insert({
          entity_type: 'flight',
          entity_id: booking.id,
          channel: 'whatsapp',
          notification_type: 'boarding_pass',
          recipient_phone: booking.traveler_phone,
          status: 'failed',
          error_message: msg,
        })
        waStatus.status = 'failed'
        waStatus.error = msg
      }
    }

    // ── Mark boarding_pass_sent flag in DB ──────────────────────────────────
    // We reuse the `last_alert_status` + a dedicated update to track pass dispatch
    await db
      .from('flight_bookings')
      .update({ last_alert_status: 'boarding_pass_sent', last_alert_sent_at: new Date().toISOString() })
      .eq('id', booking.id)

    if (emailStatus.status === 'sent' || waStatus.status === 'sent') sent++
    else failed++

    results.push({
      id: booking.id,
      pnr: booking.pnr,
      email: emailStatus.status,
      whatsapp: waStatus.status,
      passUrl,
    })
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: bookings.length,
    results,
  })
}
