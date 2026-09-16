import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/doubletick'
import { hotelConfirmedTravelerEmail } from '@/lib/email/templates/hotelTemplates'
import { HotelBooking } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const db = createServiceClient()

  const { data: booking, error } = await db
    .from('hotel_bookings')
    .select('*')
    .eq('confirmation_token', token)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const hb = booking as HotelBooking

  if (hb.confirmation_status === 'confirmed') {
    return NextResponse.json({ already_confirmed: true, booking_ref: hb.booking_ref })
  }

  // Mark confirmed
  await db
    .from('hotel_bookings')
    .update({
      confirmation_status: 'confirmed',
      confirmed_via: 'link',
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', hb.id)

  // Notify traveler
  try {
    const { subject, html } = hotelConfirmedTravelerEmail(hb)
    const { messageId } = await sendEmail({ to: hb.traveler_email, subject, html })
    await db.from('notification_logs').insert({
      entity_type: 'hotel',
      entity_id: hb.id,
      channel: 'email',
      notification_type: 'hotel_confirmed',
      recipient_email: hb.traveler_email,
      status: 'sent',
      provider_message_id: messageId,
    })
  } catch {}

  if (hb.traveler_phone) {
    try {
      const wa = await sendWhatsAppTemplate({
        to: hb.traveler_phone,
        templateName: process.env.DOUBLETICK_TEMPLATE_HOTEL_CONFIRMED!,
        variables: [hb.traveler_name, hb.hotel_name, hb.booking_ref, hb.check_in_date, hb.check_out_date],
      })
      await db.from('notification_logs').insert({
        entity_type: 'hotel',
        entity_id: hb.id,
        channel: 'whatsapp',
        notification_type: 'hotel_confirmed',
        recipient_phone: hb.traveler_phone,
        status: wa.error ? 'failed' : 'sent',
        provider_message_id: wa.messageId,
        error_message: wa.error,
      })
    } catch {}
  }

  await db.from('hotel_bookings').update({ traveler_notified: true }).eq('id', hb.id)

  return NextResponse.json({ confirmed: true, booking_ref: hb.booking_ref, hotel_name: hb.hotel_name })
}
