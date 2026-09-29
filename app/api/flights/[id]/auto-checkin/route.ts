import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { performAutoCheckin, detectAirline } from '@/lib/automation/checkin'
import { boardingPassPdfEmail } from '@/lib/email/templates/boardingPassPdfEmail'
import { sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import nodemailer from 'nodemailer'
import { FlightBooking } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Playwright needs up to 2 minutes

/**
 * POST /api/flights/[id]/auto-checkin
 * Triggers fully automated web check-in for a flight booking.
 * Playwright visits the airline website, enters PNR + last name,
 * downloads the boarding pass PDF, and sends it to the traveler.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createServiceClient()

  // Fetch booking
  const { data: booking, error: dbErr } = await db
    .from('flight_bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (dbErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const b = booking as FlightBooking

  // Check 48-hour window
  const now = new Date()
  const dep = new Date(b.departure_date)
  if (b.departure_time) {
    const match = b.departure_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
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
    return NextResponse.json({
      error: 'Boarding pass has not been issued yet',
      message: `Boarding pass for PNR ${b.pnr} has not been issued yet because departure date (${b.departure_date}) is more than 48 hours away. Web check-in opens 48 hours before departure.`,
    }, { status: 400 })
  }

  // Detect airline
  const airline = detectAirline(b.airline_code, b.flight_number)
  if (!airline) {
    return NextResponse.json({
      error: `Auto check-in not supported for airline: ${b.airline_code || b.flight_number}. Only Air India (AI/UK), IndiGo (6E), and Akasa Air (QP) are supported.`,
    }, { status: 422 })
  }

  // Run Playwright automation
  const result = await performAutoCheckin({
    pnr: b.pnr,
    travelerName: b.traveler_name,
    airline,
  })

  if (!result.success) {
    // Log the failure
    await db.from('notification_logs').insert({
      entity_type: 'flight',
      entity_id: b.id,
      channel: 'email',
      notification_type: 'auto_checkin',
      recipient_email: b.traveler_email,
      status: 'failed',
      error_message: result.error,
    })

    if (result.error === 'CAPTCHA_REQUIRED') {
      return NextResponse.json({
        error: 'CAPTCHA_REQUIRED',
        message: 'The airline website requires CAPTCHA verification. Auto check-in could not be completed.',
        screenshotPath: result.screenshotPath,
      }, { status: 503 })
    }

    return NextResponse.json({
      error: result.error,
      screenshotPath: result.screenshotPath,
    }, { status: 500 })
  }

  // ── Send PDF via Email with attachment ──────────────────────────────────
  let emailStatus = 'skipped'
  let waStatus = 'skipped'

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const { subject, html } = boardingPassPdfEmail(b)

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'VeloTrav Alerts'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: b.traveler_email,
      subject,
      html,
      attachments: [
        {
          filename: `BoardingPass-${b.pnr}-${b.flight_number}.pdf`,
          content: result.pdfBuffer!,
          contentType: 'application/pdf',
        },
      ],
    })

    await db.from('notification_logs').insert({
      entity_type: 'flight',
      entity_id: b.id,
      channel: 'email',
      notification_type: 'auto_checkin',
      recipient_email: b.traveler_email,
      status: 'sent',
      provider_message_id: info.messageId,
    })

    emailStatus = 'sent'
    console.log(`[AutoCheckin] Email with PDF sent to ${b.traveler_email}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Email error'
    await db.from('notification_logs').insert({
      entity_type: 'flight',
      entity_id: b.id,
      channel: 'email',
      notification_type: 'auto_checkin',
      recipient_email: b.traveler_email,
      status: 'failed',
      error_message: msg,
    })
    emailStatus = 'failed'
    console.error(`[AutoCheckin] Email failed: ${msg}`)
  }

  // ── Send WhatsApp notification ──────────────────────────────────────────
  if (b.traveler_phone) {
    try {
      const text =
        `🎟️ *VeloTrav — Web Check-in Complete!*\n\n` +
        `Hi *${b.traveler_name}*,\n` +
        `Your web check-in for flight *${b.flight_number}* (${b.origin} → ${b.destination}) on *${b.departure_date}* has been completed automatically.\n\n` +
        `📧 Your official boarding pass PDF has been sent to your email: *${b.traveler_email}*\n\n` +
        `${b.gate ? `🚪 Gate: *${b.gate}*\n` : ''}` +
        `${b.terminal ? `🏢 Terminal: *${b.terminal}*\n` : ''}` +
        `🔖 PNR: *${b.pnr}*\n\n` +
        `_Please check your email and save the boarding pass. Have a safe flight!_ ✈️`

      const wa = await sendWhatsAppText(b.traveler_phone, text)
      await db.from('notification_logs').insert({
        entity_type: 'flight',
        entity_id: b.id,
        channel: 'whatsapp',
        notification_type: 'auto_checkin',
        recipient_phone: b.traveler_phone,
        status: wa.error ? 'failed' : 'sent',
        provider_message_id: wa.messageId,
        error_message: wa.error || null,
      })
      waStatus = wa.error ? 'failed' : 'sent'
    } catch {
      waStatus = 'failed'
    }
  }

  // ── Update booking status ───────────────────────────────────────────────
  await db.from('flight_bookings')
    .update({
      last_alert_status: 'boarding_pass_sent',
      last_alert_sent_at: new Date().toISOString(),
    })
    .eq('id', b.id)

  return NextResponse.json({
    success: true,
    pnr: b.pnr,
    airline,
    sent: { email: emailStatus, whatsapp: waStatus },
    message: 'Auto check-in complete. Boarding pass PDF dispatched to traveler.',
  })
}
