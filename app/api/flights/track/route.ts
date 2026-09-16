import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cronSecret'
import { createServiceClient } from '@/lib/supabase/server'
import { getFlightStatus } from '@/lib/airlabs/client'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/doubletick'
import { flightDelayEmail, flightCancellationEmail } from '@/lib/email/templates/flightAlert'
import { FlightBooking, FlightStatus } from '@/types'

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all active bookings for today
  const { data: bookings, error } = await db
    .from('flight_bookings')
    .select('*')
    .eq('departure_date', today)
    .not('status', 'in', '("landed","cancelled")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings?.length) return NextResponse.json({ checked: 0, alerts_sent: 0 })

  // De-duplicate by flight number
  const uniqueFlights = [...new Set((bookings as FlightBooking[]).map(b => b.flight_number))]

  let checked = 0
  let alerts_sent = 0

  for (const flightNumber of uniqueFlights) {
    const { data: statusInfo, error: apiErr } = await getFlightStatus(flightNumber, today)
    if (apiErr || !statusInfo) continue
    checked++

    const affectedBookings = (bookings as FlightBooking[]).filter(b => b.flight_number === flightNumber)

    // Log status for all bookings of this flight
    for (const booking of affectedBookings) {
      await db.from('flight_status_logs').insert({
        flight_booking_id: booking.id,
        flight_number: flightNumber,
        status_detected: statusInfo.status,
        delay_minutes: statusInfo.departureDelay,
        raw_response: { statusInfo },
      })
    }

    // Check if status changed and requires alert
    const newStatus = statusInfo.status
    const newDelay = statusInfo.departureDelay

    for (const booking of affectedBookings) {
      const statusChanged = booking.status !== newStatus
      const delayIncreased = newDelay > (booking.delay_minutes + 14) // alert if delay grows by 15+ min

      if (!statusChanged && !delayIncreased) continue

      // Update flight booking
      await db
        .from('flight_bookings')
        .update({
          status: newStatus,
          delay_minutes: newDelay,
          gate: statusInfo.gate,
          terminal: statusInfo.terminal,
        })
        .eq('id', booking.id)

      // Send alert only for delay / cancellation, and avoid duplicate alerts
      const shouldAlert =
        (newStatus === 'delayed' || newStatus === 'cancelled') &&
        booking.last_alert_status !== newStatus

      if (!shouldAlert) continue

      const updatedBooking = { ...booking, status: newStatus, delay_minutes: newDelay, gate: statusInfo.gate, terminal: statusInfo.terminal } as FlightBooking
      let alertSent = false

      // Email alert
      try {
        const template = newStatus === 'cancelled'
          ? flightCancellationEmail(updatedBooking)
          : flightDelayEmail(updatedBooking)
        const { messageId } = await sendEmail({ to: booking.traveler_email, ...template })
        await db.from('notification_logs').insert({
          entity_type: 'flight',
          entity_id: booking.id,
          channel: 'email',
          notification_type: newStatus === 'cancelled' ? 'cancellation_alert' : 'delay_alert',
          recipient_email: booking.traveler_email,
          status: 'sent',
          provider_message_id: messageId,
        })
        alertSent = true
      } catch (err: unknown) {
        await db.from('notification_logs').insert({
          entity_type: 'flight',
          entity_id: booking.id,
          channel: 'email',
          notification_type: newStatus === 'cancelled' ? 'cancellation_alert' : 'delay_alert',
          recipient_email: booking.traveler_email,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown',
        })
      }

      // WhatsApp alert
      if (booking.traveler_phone) {
        try {
          const templateName = newStatus === 'cancelled'
            ? process.env.DOUBLETICK_TEMPLATE_FLIGHT_CANCEL!
            : process.env.DOUBLETICK_TEMPLATE_FLIGHT_DELAY!

          const delayText = `${newDelay} minutes`
          const wa = await sendWhatsAppTemplate({
            to: booking.traveler_phone,
            templateName,
            variables: [
              booking.traveler_name,
              booking.flight_number,
              booking.origin,
              booking.destination,
              booking.departure_date,
              ...(newStatus === 'delayed' ? [delayText] : []),
            ],
          })
          await db.from('notification_logs').insert({
            entity_type: 'flight',
            entity_id: booking.id,
            channel: 'whatsapp',
            notification_type: newStatus === 'cancelled' ? 'cancellation_alert' : 'delay_alert',
            recipient_phone: booking.traveler_phone,
            status: wa.error ? 'failed' : 'sent',
            provider_message_id: wa.messageId,
            error_message: wa.error,
          })
          if (!wa.error) alertSent = true
        } catch {}
      }

      if (alertSent) {
        await db
          .from('flight_bookings')
          .update({ last_alert_status: newStatus, last_alert_sent_at: new Date().toISOString() })
          .eq('id', booking.id)
        alerts_sent++
      }
    }
  }

  return NextResponse.json({ checked, alerts_sent, date: today })
}
