import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import { sendEmail } from '@/lib/email/mailer'
import { hotelConfirmedTravelerEmail } from '@/lib/email/templates/hotelTemplates'
import { HotelBooking } from '@/types'

const CONFIRMATION_KEYWORDS = /\b(yes|confirm(?:ed)?|ok|sure|booked?|done|approved?|agree|accept)\b/i

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const signature = request.headers.get('x-doubletick-signature') || ''
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const db = createServiceClient()

  const from: string = (payload?.from as string) || (payload?.waId as string) || ''
  const messageBody: string = (payload?.message as Record<string, unknown>)?.body as string || (payload?.text as string) || ''
  const messageType: string = (payload?.message as Record<string, unknown>)?.type as string || 'text'
  const msgId: string = (payload?.id as string) || ''

  if (!from) return NextResponse.json({ received: true })

  // ── 1. Check if this is a hotel reply ────────────────────────────────────
  const { data: hotelBooking } = await db
    .from('hotel_bookings')
    .select('*')
    .eq('hotel_phone', from)
    .eq('confirmation_status', 'awaiting_reply')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (hotelBooking) {
    const hb = hotelBooking as HotelBooking

    await db.from('hotel_whatsapp_messages').insert({
      hotel_booking_id: hb.id,
      doubletick_msg_id: msgId,
      from_number: from,
      message_body: messageBody,
      message_type: messageType,
      direction: 'inbound',
      raw_payload: payload,
    })

    if (CONFIRMATION_KEYWORDS.test(messageBody)) {
      await db
        .from('hotel_bookings')
        .update({
          confirmation_status: 'confirmed',
          confirmed_via: 'whatsapp',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', hb.id)

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

      try {
        await sendWhatsAppText(from, `Thank you! We have recorded your confirmation for booking ${hb.booking_ref}. The guest has been notified.`)
      } catch {}

      await db.from('hotel_bookings').update({ traveler_notified: true }).eq('id', hb.id)

      return NextResponse.json({ received: true, confirmed: true, booking_ref: hb.booking_ref })
    }

    return NextResponse.json({ received: true })
  }

  // ── 2. Store unmatched inbound message ────────────────────────────────────
  await db.from('hotel_whatsapp_messages').insert({
    doubletick_msg_id: msgId,
    from_number: from,
    message_body: messageBody,
    message_type: messageType,
    direction: 'inbound',
    raw_payload: payload,
  })

  // ── 3. Check if this is a traveler reply on a flight booking ─────────────
  const { data: flightBooking } = await db
    .from('flight_bookings')
    .select('id')
    .eq('traveler_phone', from)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (flightBooking) {
    await db.from('traveler_replies').insert({
      entity_type: 'flight',
      entity_id: flightBooking.id,
      channel: 'whatsapp',
      from_number: from,
      message_body: messageBody,
      raw_payload: payload,
    })
    return NextResponse.json({ received: true, traveler_reply: true, entity_type: 'flight' })
  }

  // ── 4. Check if this is a traveler reply on a hotel booking ──────────────
  const { data: travelerHotelBooking } = await db
    .from('hotel_bookings')
    .select('id')
    .eq('traveler_phone', from)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (travelerHotelBooking) {
    await db.from('traveler_replies').insert({
      entity_type: 'hotel',
      entity_id: travelerHotelBooking.id,
      channel: 'whatsapp',
      from_number: from,
      message_body: messageBody,
      raw_payload: payload,
    })
    return NextResponse.json({ received: true, traveler_reply: true, entity_type: 'hotel' })
  }

  return NextResponse.json({ received: true })
}
