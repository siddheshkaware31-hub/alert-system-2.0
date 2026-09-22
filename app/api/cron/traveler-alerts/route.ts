import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppText } from '@/lib/whatsapp/doubletick'
import { FlightBooking, HotelBooking } from '@/types'
import {
  preFlightReminderEmail,
  postFlightFeedbackEmail,
  hotelCheckInReminderEmail,
  hotelCheckOutReminderEmail,
  hotelFeedbackEmail,
} from '@/lib/email/templates/travelerAlerts'

// Secret key to protect the cron endpoint (optional)
const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret if set
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = createServiceClient()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const results = {
    preFlightAlerts: 0,
    postFlightFeedback: 0,
    hotelCheckInAlerts: 0,
    hotelCheckOutAlerts: 0,
    hotelFeedback: 0,
    errors: [] as string[],
  }

  // Helper: check if a notification_type was already sent for this entity
  async function alreadySent(entityId: string, notificationType: string): Promise<boolean> {
    const { count } = await db
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('notification_type', notificationType)
      .eq('status', 'sent')
    return (count ?? 0) > 0
  }

  // Helper: log a notification
  async function logNotification(
    entityType: 'flight' | 'hotel',
    entityId: string,
    channel: 'email' | 'whatsapp',
    notificationType: string,
    recipientEmail?: string,
    recipientPhone?: string,
    status: 'sent' | 'failed' = 'sent',
    errorMessage?: string,
    providerId?: string,
  ) {
    await db.from('notification_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      channel,
      notification_type: notificationType,
      recipient_email: recipientEmail || null,
      recipient_phone: recipientPhone || null,
      status,
      provider_message_id: providerId || null,
      error_message: errorMessage || null,
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PRE-FLIGHT REMINDERS (flights departing today)
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: upcomingFlights } = await db
      .from('flight_bookings')
      .select('*')
      .eq('departure_date', todayStr)
      .in('status', ['scheduled', 'active', 'delayed'])

    if (upcomingFlights?.length) {
      for (const flight of upcomingFlights as FlightBooking[]) {
        const notifType = 'pre_flight_reminder'
        if (await alreadySent(flight.id, notifType)) continue

        // Check if departure is within the next 6 hours
        if (flight.departure_time) {
          let h = 0, m = 0
          const timeStr = flight.departure_time.trim().toUpperCase()
          const isPM = timeStr.includes('PM')
          const isAM = timeStr.includes('AM')
          const cleanTime = timeStr.replace(/(AM|PM)/g, '').trim()
          const parts = cleanTime.split(':').map(n => parseInt(n, 10))

          if (!isNaN(parts[0])) {
            h = parts[0]
            if (isPM && h < 12) h += 12
            if (isAM && h === 12) h = 0
            if (parts[1] && !isNaN(parts[1])) m = parts[1]

            const depTime = new Date(now)
            depTime.setHours(h, m, 0, 0)
            const hoursUntil = (depTime.getTime() - now.getTime()) / (1000 * 60 * 60)
            // Only send if departure is within 6 hours (and not already > 1 hour past)
            if (hoursUntil < -1 || hoursUntil > 6) continue
          }
        }

        // Send email
        try {
          const { subject, html } = preFlightReminderEmail(flight)
          const { messageId } = await sendEmail({ to: flight.traveler_email, subject, html })
          await logNotification('flight', flight.id, 'email', notifType, flight.traveler_email, undefined, 'sent', undefined, messageId)
          results.preFlightAlerts++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown'
          await logNotification('flight', flight.id, 'email', notifType, flight.traveler_email, undefined, 'failed', msg)
          results.errors.push(`Pre-flight email for ${flight.pnr}: ${msg}`)
        }

        // Send WhatsApp
        if (flight.traveler_phone) {
          try {
            const passUrl = `${appUrl}/pass/${flight.pnr}`
            const text = `✈️ *VeloTrav Flight Reminder*\n\nHi ${flight.traveler_name},\nYour flight *${flight.flight_number}* (${flight.origin} ➔ ${flight.destination}) departs today!\n\n📅 Date: ${flight.departure_date}\n⏰ Time: ${flight.departure_time || 'Check your ticket'}\n${flight.gate ? `🚪 Gate: ${flight.gate}` : ''}${flight.terminal ? `\n🏢 Terminal: ${flight.terminal}` : ''}\n\n📱 Live Boarding Pass: ${passUrl}\n\nHave a safe journey!`
            await sendWhatsAppText(flight.traveler_phone, text)
            await logNotification('flight', flight.id, 'whatsapp', notifType, undefined, flight.traveler_phone)
          } catch {}
        }
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Pre-flight scan: ${err instanceof Error ? err.message : 'Unknown'}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. POST-FLIGHT FEEDBACK (flights that have landed)
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: landedFlights } = await db
      .from('flight_bookings')
      .select('*')
      .eq('status', 'landed')
      .eq('departure_date', todayStr)

    if (landedFlights?.length) {
      for (const flight of landedFlights as FlightBooking[]) {
        const notifType = 'post_flight_feedback'
        if (await alreadySent(flight.id, notifType)) continue

        // Create feedback entry
        const { data: feedback } = await db
          .from('feedback')
          .insert({
            entity_type: 'flight',
            entity_id: flight.id,
          })
          .select('feedback_token')
          .single()

        if (!feedback) continue
        const feedbackUrl = `${appUrl}/confirm/feedback/${feedback.feedback_token}`

        // Send email
        try {
          const { subject, html } = postFlightFeedbackEmail(flight, feedbackUrl)
          const { messageId } = await sendEmail({ to: flight.traveler_email, subject, html })
          await logNotification('flight', flight.id, 'email', notifType, flight.traveler_email, undefined, 'sent', undefined, messageId)
          results.postFlightFeedback++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown'
          await logNotification('flight', flight.id, 'email', notifType, flight.traveler_email, undefined, 'failed', msg)
          results.errors.push(`Post-flight email for ${flight.pnr}: ${msg}`)
        }

        // Send WhatsApp
        if (flight.traveler_phone) {
          try {
            const text = `⭐ *VeloTrav Feedback Request*\n\nHi ${flight.traveler_name},\nWe hope your flight ${flight.flight_number} (${flight.origin} ➔ ${flight.destination}) went well!\n\nPlease take a moment to rate your experience:\n${feedbackUrl}\n\nYour feedback helps us improve! 🙏`
            await sendWhatsAppText(flight.traveler_phone, text)
            await logNotification('flight', flight.id, 'whatsapp', notifType, undefined, flight.traveler_phone)
          } catch {}
        }
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Post-flight scan: ${err instanceof Error ? err.message : 'Unknown'}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. HOTEL CHECK-IN REMINDERS (check-in date is today)
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: checkInHotels } = await db
      .from('hotel_bookings')
      .select('*')
      .eq('check_in_date', todayStr)
      .eq('confirmation_status', 'confirmed')

    if (checkInHotels?.length) {
      for (const hotel of checkInHotels as HotelBooking[]) {
        const notifType = 'hotel_checkin_reminder'
        if (await alreadySent(hotel.id, notifType)) continue

        // Send email
        if (hotel.traveler_email) {
          try {
            const { subject, html } = hotelCheckInReminderEmail(hotel)
            const { messageId } = await sendEmail({ to: hotel.traveler_email, subject, html })
            await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'sent', undefined, messageId)
            results.hotelCheckInAlerts++
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown'
            await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'failed', msg)
            results.errors.push(`Check-in email for ${hotel.booking_ref}: ${msg}`)
          }
        }

        // Send WhatsApp
        if (hotel.traveler_phone) {
          try {
            const text = `🏨 *VeloTrav Hotel Check-in Reminder*\n\nHi ${hotel.traveler_name},\nYour check-in at *${hotel.hotel_name}* is today!\n\n📋 Booking Ref: ${hotel.booking_ref}\n📅 Check-in: ${hotel.check_in_date}\n📅 Check-out: ${hotel.check_out_date}\n${hotel.room_type ? `🛏️ Room: ${hotel.room_type} × ${hotel.num_rooms}` : ''}\n\nEnjoy your stay! 🌟`
            await sendWhatsAppText(hotel.traveler_phone, text)
            await logNotification('hotel', hotel.id, 'whatsapp', notifType, undefined, hotel.traveler_phone)
          } catch {}
        }
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Check-in scan: ${err instanceof Error ? err.message : 'Unknown'}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HOTEL CHECK-OUT REMINDERS (check-out date is today)
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: checkOutHotels } = await db
      .from('hotel_bookings')
      .select('*')
      .eq('check_out_date', todayStr)

    if (checkOutHotels?.length) {
      for (const hotel of checkOutHotels as HotelBooking[]) {
        const notifType = 'hotel_checkout_reminder'
        if (await alreadySent(hotel.id, notifType)) continue

        // Send email
        if (hotel.traveler_email) {
          try {
            const { subject, html } = hotelCheckOutReminderEmail(hotel)
            const { messageId } = await sendEmail({ to: hotel.traveler_email, subject, html })
            await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'sent', undefined, messageId)
            results.hotelCheckOutAlerts++
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown'
            await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'failed', msg)
            results.errors.push(`Check-out email for ${hotel.booking_ref}: ${msg}`)
          }
        }

        // Send WhatsApp
        if (hotel.traveler_phone) {
          try {
            const text = `👋 *VeloTrav Check-out Reminder*\n\nHi ${hotel.traveler_name},\nToday is your check-out day from *${hotel.hotel_name}*.\n\n📋 Booking Ref: ${hotel.booking_ref}\n📅 Check-out: ${hotel.check_out_date}\n\nWe hope you enjoyed your stay! 🙏`
            await sendWhatsAppText(hotel.traveler_phone, text)
            await logNotification('hotel', hotel.id, 'whatsapp', notifType, undefined, hotel.traveler_phone)
          } catch {}
        }
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Check-out scan: ${err instanceof Error ? err.message : 'Unknown'}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HOTEL FEEDBACK (check-out was today - sent in the afternoon/evening)
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    // Only send hotel feedback after 2 PM to give time for check-out
    const currentHour = now.getHours()
    if (currentHour >= 14) {
      const { data: checkoutHotels } = await db
        .from('hotel_bookings')
        .select('*')
        .eq('check_out_date', todayStr)

      if (checkoutHotels?.length) {
        for (const hotel of checkoutHotels as HotelBooking[]) {
          const notifType = 'hotel_feedback_request'
          if (await alreadySent(hotel.id, notifType)) continue

          // Create feedback entry
          const { data: feedback } = await db
            .from('feedback')
            .insert({
              entity_type: 'hotel',
              entity_id: hotel.id,
            })
            .select('feedback_token')
            .single()

          if (!feedback) continue
          const feedbackUrl = `${appUrl}/confirm/feedback/${feedback.feedback_token}`

          // Send email
          if (hotel.traveler_email) {
            try {
              const { subject, html } = hotelFeedbackEmail(hotel, feedbackUrl)
              const { messageId } = await sendEmail({ to: hotel.traveler_email, subject, html })
              await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'sent', undefined, messageId)
              results.hotelFeedback++
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unknown'
              await logNotification('hotel', hotel.id, 'email', notifType, hotel.traveler_email, undefined, 'failed', msg)
              results.errors.push(`Hotel feedback email for ${hotel.booking_ref}: ${msg}`)
            }
          }

          // Send WhatsApp
          if (hotel.traveler_phone) {
            try {
              const text = `⭐ *VeloTrav Feedback Request*\n\nHi ${hotel.traveler_name},\nWe hope you had a wonderful stay at *${hotel.hotel_name}*!\n\nPlease take a moment to rate your experience:\n${feedbackUrl}\n\nYour feedback helps us serve you better! 🙏`
              await sendWhatsAppText(hotel.traveler_phone, text)
              await logNotification('hotel', hotel.id, 'whatsapp', notifType, undefined, hotel.traveler_phone)
            } catch {}
          }
        }
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Hotel feedback scan: ${err instanceof Error ? err.message : 'Unknown'}`)
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    today: todayStr,
    ...results,
  })
}
