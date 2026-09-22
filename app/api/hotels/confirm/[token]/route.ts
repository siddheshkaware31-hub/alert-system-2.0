import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import { hotelConfirmedTravelerEmail } from '@/lib/email/templates/hotelTemplates'
import { HotelBooking } from '@/types'

// GET: Fetch booking info for token without auto-confirming
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

  return NextResponse.json({ booking })
}

// POST: Hotel submits confirmation/decline decision with HCN and notes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await request.json()
  const { action, hcn, notes } = body as { action: 'confirm' | 'decline'; hcn?: string; notes?: string }

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

  if (hb.confirmation_status === 'confirmed' && action === 'confirm') {
    return NextResponse.json({ already_confirmed: true, booking_ref: hb.booking_ref })
  }

  const status = action === 'confirm' ? 'confirmed' : 'cancelled'

  // Update DB record
  const updatePayload: Record<string, unknown> = {
    confirmation_status: status,
    confirmed_via: 'link',
    confirmed_at: new Date().toISOString(),
  }

  // Attempt update with hcn and notes if present
  let { error: updateError } = await db
    .from('hotel_bookings')
    .update({
      ...updatePayload,
      ...(hcn ? { hcn } : {}),
      ...(notes ? { notes } : {}),
    })
    .eq('id', hb.id)

  // Fallback if hcn or notes columns do not exist in Supabase table schema
  if (updateError && (updateError.message.includes('column') || updateError.code === 'PGRST204')) {
    console.warn('hcn/notes columns not found in schema cache, falling back to basic confirmation status update')
    const fallback = await db
      .from('hotel_bookings')
      .update(updatePayload)
      .eq('id', hb.id)
    updateError = fallback.error
  }

  if (updateError) {
    console.error('Failed to update hotel confirmation status:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Notify traveler via Email
  if (status === 'confirmed' && hb.traveler_email) {
    try {
      const { subject, html } = hotelConfirmedTravelerEmail({ ...hb, hcn })
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
  }

  // Notify traveler via WhatsApp
  if (status === 'confirmed' && hb.traveler_phone) {
    try {
      const templateName = process.env.DOUBLETICK_TEMPLATE_HOTEL_CONFIRMED
      let wa: { messageId?: string; error?: string } = {}
      if (templateName) {
        wa = await sendWhatsAppTemplate({
          to: hb.traveler_phone,
          templateName,
          variables: [hb.traveler_name, hb.hotel_name, hb.booking_ref, hb.check_in_date, hb.check_out_date],
        })
      }
      if (!templateName || wa.error) {
        const textMsg = `🏨 *VeloTrav Hotel Booking Confirmed!*\n\nHi ${hb.traveler_name},\nYour reservation at *${hb.hotel_name}* (Ref: *${hb.booking_ref}*${hcn ? `, HCN: ${hcn}` : ''}) is confirmed for ${hb.check_in_date} to ${hb.check_out_date}.\n\nEnjoy your stay!`
        wa = await sendWhatsAppText(hb.traveler_phone, textMsg)
      }
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

  return NextResponse.json({
    success: true,
    status,
    booking_ref: hb.booking_ref,
    hotel_name: hb.hotel_name,
  })
}
