import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { parseHotelReconfirmationXlsx } from '@/lib/excel/hotelReconfirmationParser'
import { sendEmail } from '@/lib/email/mailer'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/doubletick'

// Import hotel reconfirmation data from the Velocity Excel sheet.
// Rows marked "Send Notification = YES" trigger WhatsApp + email to the assigned agent.
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'File must be an Excel file (.xlsx or .xls)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { rows, errors } = parseHotelReconfirmationXlsx(buffer)

  if (rows.length === 0 && errors.length === 0) {
    return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: batch, error: batchErr } = await db
    .from('hotel_import_batches')
    .insert({
      file_name: file.name,
      total_rows: rows.length + errors.length,
      success_rows: 0,
      failed_rows: errors.length,
      status: 'processing',
      imported_by: session.userId,
    })
    .select()
    .single()

  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 })

  let successRows = 0
  const insertErrors: Array<{ row: number; error: string }> = [...errors]
  const insertedBookings: Array<{ id: string; rowIdx: number }> = []

  // Pre-fetch existing booking_refs to prevent employee/booking duplicate rows
  const refs = rows.map(r => r.booking_ref)
  const { data: existingBookings } = await db
    .from('hotel_bookings')
    .select('id, booking_ref')
    .in('booking_ref', refs)

  const existingRefMap = new Map((existingBookings || []).map((b: { id: string; booking_ref: string }) => [b.booking_ref.toUpperCase(), b.id]))

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx]
    const existingId = existingRefMap.get(r.booking_ref.toUpperCase())

    const bookingPayload = {
      import_batch_id: batch.id,
      hotel_name: r.hotel_name,
      booking_ref: r.booking_ref,
      check_in_date: r.check_in_date,
      traveler_name: r.traveler_name,
      traveler_email: r.agent_email ?? null,
      traveler_phone: r.agent_phone ?? null,
      confirmation_status: r.confirmation_status === 'cancelled'
        ? 'cancelled'
        : r.send_notification
          ? 'awaiting_reply'
          : 'pending',
      updated_at: new Date().toISOString(),
    }

    if (existingId) {
      // Update existing record (no duplicate row)
      const { error: updateErr } = await db
        .from('hotel_bookings')
        .update(bookingPayload)
        .eq('id', existingId)

      if (updateErr) {
        insertErrors.push({ row: idx + 2, error: updateErr.message })
      } else {
        successRows++
        insertedBookings.push({ id: existingId as string, rowIdx: idx })
      }
    } else {
      // Insert new record
      const { data: inserted, error: insertErr } = await db
        .from('hotel_bookings')
        .insert({
          ...bookingPayload,
          created_by: session.userId,
          hotel_email: null,
          hotel_phone: null,
          check_out_date: null,
          confirmed_at: null,
          confirmed_via: null,
          request_email_sent: false,
          request_whatsapp_sent: false,
          traveler_notified: false,
        })
        .select('id')
        .single()

      if (insertErr) {
        insertErrors.push({ row: idx + 2, error: insertErr.message })
      } else {
        successRows++
        if (inserted?.id) insertedBookings.push({ id: inserted.id, rowIdx: idx })
      }
    }
  }

  await db
    .from('hotel_import_batches')
    .update({
      success_rows: successRows,
      failed_rows: insertErrors.length,
      status: 'completed',
      error_log: insertErrors.length > 0 ? insertErrors : null,
    })
    .eq('id', batch.id)

  // Send notifications to agents for rows marked send_notification = true
  let notifSent = 0
  let notifFailed = 0

  if (insertedBookings.length > 0) {
    for (const { id: bookingId, rowIdx } of insertedBookings) {
      const row = rows[rowIdx]
      if (!row?.send_notification) continue
      if (!row.agent_email && !row.agent_phone) continue

      const subject = `Action Required: Pending Hotel Reconfirmation – ${row.booking_ref}`
      const html = `
        <div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#1d4ed8">Pending Hotel Reconfirmation</h2>
          <p>Hi ${row.agent_name ?? 'Team'},</p>
          <p>The following booking requires follow-up for hotel reconfirmation:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Booking Ref</td><td style="padding:8px;border:1px solid #e5e7eb">${row.booking_ref}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Guest Name</td><td style="padding:8px;border:1px solid #e5e7eb">${row.traveler_name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Hotel</td><td style="padding:8px;border:1px solid #e5e7eb">${row.hotel_name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Check-In</td><td style="padding:8px;border:1px solid #e5e7eb">${row.check_in_date}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">Status</td><td style="padding:8px;border:1px solid #e5e7eb">${row.reconfirmed_status_text ?? 'Pending'}</td></tr>
          </table>
          <p>Please follow up with the hotel to obtain reconfirmation.</p>
          <p style="color:#6b7280;font-size:12px">Corporate Travel Alert System · Velocity Travel</p>
        </div>`

      let emailOk = false
      let waOk = false

      // Email to agent
      if (row.agent_email) {
        try {
          const { messageId } = await sendEmail({ to: row.agent_email, subject, html })
          await db.from('notification_logs').insert({
            entity_type: 'hotel',
            entity_id: bookingId,
            channel: 'email',
            notification_type: 'agent_followup_alert',
            recipient_email: row.agent_email,
            status: 'sent',
            provider_message_id: messageId,
          })
          emailOk = true
        } catch (err: unknown) {
          await db.from('notification_logs').insert({
            entity_type: 'hotel',
            entity_id: bookingId,
            channel: 'email',
            notification_type: 'agent_followup_alert',
            recipient_email: row.agent_email,
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown',
          })
        }
      }

      // WhatsApp to agent
      if (row.agent_phone) {
        try {
          const wa = await sendWhatsAppTemplate({
            to: row.agent_phone,
            templateName: process.env.DOUBLETICK_TEMPLATE_HOTEL_REQUEST!,
            variables: [
              row.agent_name ?? 'Team',
              row.booking_ref,
              row.traveler_name,
              row.hotel_name,
              row.check_in_date,
              row.reconfirmed_status_text ?? 'Pending reconfirmation',
            ],
          })
          await db.from('notification_logs').insert({
            entity_type: 'hotel',
            entity_id: bookingId,
            channel: 'whatsapp',
            notification_type: 'agent_followup_alert',
            recipient_phone: row.agent_phone,
            status: wa.error ? 'failed' : 'sent',
            provider_message_id: wa.messageId,
            error_message: wa.error,
          })
          waOk = !wa.error
        } catch { /* non-critical */ }
      }

      // Mark notification sent on the booking record
      if (emailOk || waOk) {
        await db.from('hotel_bookings').update({
          request_email_sent: emailOk,
          request_whatsapp_sent: waOk,
        }).eq('id', bookingId)
        notifSent++
      } else {
        notifFailed++
      }
    }
  }

  const cancelledCount    = rows.filter(r => r.confirmation_status === 'cancelled').length
  const notifQueued       = rows.filter(r => r.send_notification).length
  const pendingCount      = rows.filter(r => !r.send_notification && r.confirmation_status !== 'cancelled').length

  return NextResponse.json({
    batchId: batch.id,
    successRows,
    failedRows: insertErrors.length,
    errors: insertErrors,
    summary: { awaitingReply: notifQueued, cancelled: cancelledCount, pending: pendingCount },
    notifications: { queued: notifQueued, sent: notifSent, failed: notifFailed },
  })
}
