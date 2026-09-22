import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cronSecret'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getFlightStatus } from '@/lib/airlabs/client'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/doubletick'
import { flightDelayEmail, flightCancellationEmail } from '@/lib/email/templates/flightAlert'
import { flightConfirmationEmail } from '@/lib/email/templates/flightConfirmation'
import { FlightBooking } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  const isCron = verifyCronSecret(request)

  if (!session && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Query active upcoming flight bookings
  const { data: bookings, error } = await db
    .from('flight_bookings')
    .select('*')
    .gte('departure_date', today)
    .not('status', 'in', '("landed","cancelled")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings?.length) return NextResponse.json({ checked: 0, updated: 0, alerts_sent: 0, message: 'No active flights in tracking queue' })

  const uniqueFlights = [...new Set((bookings as FlightBooking[]).map(b => b.flight_number))]

  let checked = 0
  let alerts_sent = 0
  let updated = 0

  for (const flightNumber of uniqueFlights) {
    const { data: statusInfo } = await getFlightStatus(flightNumber, today)
    if (!statusInfo) continue
    checked++

    const affectedBookings = (bookings as FlightBooking[]).filter(b => b.flight_number === flightNumber)

    for (const booking of affectedBookings) {
      await db.from('flight_status_logs').insert({
        flight_booking_id: booking.id,
        flight_number: flightNumber,
        status_detected: statusInfo.status,
        delay_minutes: statusInfo.departureDelay,
        raw_response: { statusInfo },
      })

      const newStatus = statusInfo.status
      const newDelay = statusInfo.departureDelay

      const statusChanged = booking.status !== newStatus
      const delayIncreased = newDelay > (booking.delay_minutes + 14)
      const missingGateOrTerminal = !booking.gate || !booking.terminal

      if (statusChanged || delayIncreased || missingGateOrTerminal) {
        await db
          .from('flight_bookings')
          .update({
            status: newStatus,
            delay_minutes: newDelay,
            gate: statusInfo.gate || booking.gate || 'G4',
            terminal: statusInfo.terminal || booking.terminal || 'T2',
          })
          .eq('id', booking.id)
        updated++
      }

      const updatedBooking = {
        ...booking,
        status: newStatus,
        delay_minutes: newDelay,
        gate: statusInfo.gate || booking.gate || 'G4',
        terminal: statusInfo.terminal || booking.terminal || 'T2',
      } as FlightBooking

      // Check if we need to send Boarding Pass (e.g. 1 day before departure)
      // For this prototype, we'll send it if departure is tomorrow (or today) and not already sent
      const departureTime = new Date(booking.departure_date)
      const now = new Date()
      const timeDiffHours = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (timeDiffHours <= 48 && timeDiffHours >= -24) {
        // Check if boarding pass already sent
        const { data: existingBPLogs } = await db
          .from('notification_logs')
          .select('id')
          .eq('entity_id', booking.id)
          .eq('notification_type', 'boarding_pass_alert')
          .limit(1)

        if (!existingBPLogs || existingBPLogs.length === 0) {
          try {
            // Send email
            const template = flightConfirmationEmail(updatedBooking)
            const { messageId } = await sendEmail({ to: booking.traveler_email, ...template })
            await db.from('notification_logs').insert({
              entity_type: 'flight',
              entity_id: booking.id,
              channel: 'email',
              notification_type: 'boarding_pass_alert',
              recipient_email: booking.traveler_email,
              status: 'sent',
              provider_message_id: messageId,
            })
            alerts_sent++
          } catch (err: unknown) {
             await db.from('notification_logs').insert({
              entity_type: 'flight',
              entity_id: booking.id,
              channel: 'email',
              notification_type: 'boarding_pass_alert',
              recipient_email: booking.traveler_email,
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown',
            })
          }
        }
      }

      const shouldAlert =
        (newStatus === 'delayed' || newStatus === 'cancelled') &&
        booking.last_alert_status !== newStatus

      if (!shouldAlert) continue

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

  return NextResponse.json({ checked, updated, alerts_sent, date: today, success: true })
}
