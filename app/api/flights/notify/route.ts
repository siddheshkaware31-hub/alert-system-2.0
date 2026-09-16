import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/doubletick'
import { flightConfirmationEmail } from '@/lib/email/templates/flightConfirmation'
import { FlightBooking } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { bookingIds, batchId } = body as { bookingIds?: string[]; batchId?: string }

  const db = createServiceClient()
  let query = db.from('flight_bookings').select('*')

  if (batchId) {
    query = query.eq('import_batch_id', batchId)
  } else if (bookingIds?.length) {
    query = query.in('id', bookingIds)
  } else {
    return NextResponse.json({ error: 'Provide bookingIds or batchId' }, { status: 400 })
  }

  const { data: bookings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let failed = 0
  const results: Array<{ id: string; email: string; whatsapp: string }> = []

  for (const booking of (bookings as FlightBooking[])) {
    const emailResult = { status: 'skipped', error: '' }
    const waResult = { status: 'skipped', error: '' }

    // Send confirmation email
    try {
      const { subject, html } = flightConfirmationEmail(booking)
      const { messageId } = await sendEmail({ to: booking.traveler_email, subject, html })
      await db.from('notification_logs').insert({
        entity_type: 'flight',
        entity_id: booking.id,
        channel: 'email',
        notification_type: 'confirmation',
        recipient_email: booking.traveler_email,
        status: 'sent',
        provider_message_id: messageId,
      })
      emailResult.status = 'sent'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      await db.from('notification_logs').insert({
        entity_type: 'flight',
        entity_id: booking.id,
        channel: 'email',
        notification_type: 'confirmation',
        recipient_email: booking.traveler_email,
        status: 'failed',
        error_message: msg,
      })
      emailResult.status = 'failed'
      emailResult.error = msg
    }

    // Send WhatsApp confirmation
    if (booking.traveler_phone) {
      try {
        const wa = await sendWhatsAppTemplate({
          to: booking.traveler_phone,
          templateName: process.env.DOUBLETICK_TEMPLATE_FLIGHT_CONFIRM!,
          variables: [
            booking.traveler_name,
            booking.pnr,
            booking.flight_number,
            booking.origin,
            booking.destination,
            booking.departure_date,
          ],
        })
        await db.from('notification_logs').insert({
          entity_type: 'flight',
          entity_id: booking.id,
          channel: 'whatsapp',
          notification_type: 'confirmation',
          recipient_phone: booking.traveler_phone,
          status: wa.error ? 'failed' : 'sent',
          provider_message_id: wa.messageId,
          error_message: wa.error,
        })
        waResult.status = wa.error ? 'failed' : 'sent'
      } catch (err: unknown) {
        waResult.status = 'failed'
      }
    }

    // Update booking flags
    await db
      .from('flight_bookings')
      .update({
        confirmation_email_sent: emailResult.status === 'sent',
        confirmation_whatsapp_sent: waResult.status === 'sent',
      })
      .eq('id', booking.id)

    if (emailResult.status === 'sent' || waResult.status === 'sent') sent++
    else failed++

    results.push({ id: booking.id, email: emailResult.status, whatsapp: waResult.status })
  }

  return NextResponse.json({ sent, failed, total: bookings.length, results })
}
