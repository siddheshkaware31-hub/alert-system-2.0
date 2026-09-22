import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { parseHotelCsv } from '@/lib/csv/hotelParser'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const { rows, errors } = parseHotelCsv(buffer)

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

  if (rows.length > 0) {
    // Deduplicate against database by booking_ref / Employee record
    const refs = rows.map(r => r.booking_ref)
    const { data: existingBookings } = await db
      .from('hotel_bookings')
      .select('id, booking_ref')
      .in('booking_ref', refs)

    const existingRefMap = new Map((existingBookings || []).map((b: { id: string; booking_ref: string }) => [b.booking_ref.toUpperCase(), b.id]))

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      const existingId = existingRefMap.get(r.booking_ref.toUpperCase())

      if (existingId) {
        // Update existing record (prevent duplicate rows for same booking_ref)
        const { error: updateErr } = await db
          .from('hotel_bookings')
          .update({
            ...r,
            import_batch_id: batch.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)

        if (updateErr) {
          insertErrors.push({ row: idx + 2, error: updateErr.message })
        } else {
          successRows++
        }
      } else {
        // Insert new booking record
        const { error: insertErr } = await db
          .from('hotel_bookings')
          .insert({
            ...r,
            import_batch_id: batch.id,
            created_by: session.userId,
          })

        if (insertErr) {
          insertErrors.push({ row: idx + 2, error: insertErr.message })
        } else {
          successRows++
        }
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

  return NextResponse.json({ batchId: batch.id, successRows, failedRows: insertErrors.length, errors: insertErrors })
}
