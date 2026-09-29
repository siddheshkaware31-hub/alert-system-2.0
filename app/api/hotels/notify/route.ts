import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import { hotelConfirmationRequestEmail } from '@/lib/email/templates/hotelTemplates'
import { HotelBooking } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { bookingIds, batchId } = body as { bookingIds?: string[]; batchId?: string }

  const db = createServiceClient()
  let query = db.from('hotel_bookings').select('*')

  if (batchId) {
    query = query.eq('import_batch_id', batchId)
  } else if (bookingIds?.length) {
    query = query.in('id', bookingIds)
  } else {
    return NextResponse.json({ error: 'Provide bookingIds or batchId' }, { status: 400 })
  }

  const { data: bookings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let sent = 0
  let failed = 0

  for (const booking of (bookings as HotelBooking[])) {
    const confirmUrl = `${appUrl}/confirm/hotel/${booking.confirmation_token}`
    let emailOk = false
    let waOk = false

    // ── Email to hotel ──────────────────────────────────────────────────────
    if (booking.hotel_email) {
      try {
        const { subject, html } = hotelConfirmationRequestEmail(booking, confirmUrl)
        const { messageId } = await sendEmail({ to: booking.hotel_email, subject, html })
        await db.from('notification_logs').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'email',
          notification_type: 'hotel_confirmation_request',
          recipient_email: booking.hotel_email,
          status: 'sent',
          provider_message_id: messageId,
        })
        emailOk = true
      } catch (err: unknown) {
        await db.from('notification_logs').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'email',
          notification_type: 'hotel_confirmation_request',
          recipient_email: booking.hotel_email,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown',
        })
      }
    }

    // ── WhatsApp to hotel ───────────────────────────────────────────────────
    if (booking.hotel_phone) {
      try {
        const templateName = process.env.DOUBLETICK_TEMPLATE_HOTEL_REQUEST
        let wa: { messageId?: string; error?: string } = {}
        if (templateName) {
          wa = await sendWhatsAppTemplate({
            to: booking.hotel_phone,
            templateName,
            variables: [
              booking.hotel_name,
              booking.booking_ref,
              booking.traveler_name,
              booking.check_in_date,
              booking.check_out_date,
              confirmUrl,
            ],
          })
        }
        if (!templateName || wa.error) {
          const textMsg = `🏨 *VeloTrav Hotel Reconfirmation Request*\n\nDear ${booking.hotel_name},\nPlease reconfirm booking ref *${booking.booking_ref}* for guest *${booking.traveler_name}* (${booking.check_in_date} to ${booking.check_out_date}).\n\n1-Click Confirmation Link:\n${confirmUrl}`
          wa = await sendWhatsAppText(booking.hotel_phone, textMsg)
        }
        await db.from('notification_logs').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'whatsapp',
          notification_type: 'hotel_confirmation_request',
          recipient_phone: booking.hotel_phone,
          status: wa.error ? 'failed' : 'sent',
          provider_message_id: wa.messageId,
          error_message: wa.error,
        })
        waOk = !wa.error
      } catch {}
    }

    // ── WhatsApp to traveler — booking acknowledgement ──────────────────────
    // Traveler is notified immediately that their booking has been placed
    // and confirmation is being awaited from the hotel.
    if (booking.traveler_phone) {
      try {
        const travelerMsg =
          `🏨 *VeloTrav — Hotel Booking Update*\n\n` +
          `Hi *${booking.traveler_name}*,\n` +
          `Your hotel booking has been placed and we are awaiting confirmation from the hotel.\n\n` +
          `🏩 Hotel: *${booking.hotel_name}*\n` +
          `📋 Booking Ref: *${booking.booking_ref}*\n` +
          `📅 Check-in: *${booking.check_in_date}*\n` +
          `📅 Check-out: *${booking.check_out_date}*\n` +
          `${booking.room_type ? `🛏️ Room: *${booking.room_type}* × ${booking.num_rooms}\n` : ''}` +
          `\nWe will notify you as soon as the hotel confirms. For any queries, contact your travel desk. 🙏`

        const wa = await sendWhatsAppText(booking.traveler_phone, travelerMsg)
        await db.from('notification_logs').insert({
          entity_type: 'hotel',
          entity_id: booking.id,
          channel: 'whatsapp',
          notification_type: 'hotel_booking_acknowledged',
          recipient_phone: booking.traveler_phone,
          status: wa.error ? 'failed' : 'sent',
          provider_message_id: wa.messageId,
          error_message: wa.error || null,
        })
      } catch {}
    }

    await db
      .from('hotel_bookings')
      .update({
        request_email_sent: emailOk,
        request_whatsapp_sent: waOk,
        confirmation_status: 'awaiting_reply',
      })
      .eq('id', booking.id)

    if (emailOk || waOk) sent++
    else failed++
  }

  return NextResponse.json({ sent, failed, total: bookings.length })
}
