import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseFlightCsv } from '@/lib/csv/flightParser'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const { rows, errors } = parseFlightCsv(buffer)

  const db = createServiceClient()

  const { data: batch, error: batchErr } = await db
    .from('flight_import_batches')
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
    // Deduplicate against database by PNR / Employee record
    const pnrs = rows.map(r => r.pnr)
    const { data: existingBookings } = await db
      .from('flight_bookings')
      .select('id, pnr')
      .in('pnr', pnrs)

    const existingPnrMap = new Map((existingBookings || []).map((b: { id: string; pnr: string }) => [b.pnr.toUpperCase(), b.id]))

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      const existingId = existingPnrMap.get(r.pnr.toUpperCase())

      if (existingId) {
        // Update existing record (prevent duplicate rows for same PNR/employee)
        const { error: updateErr } = await db
          .from('flight_bookings')
          .update({
            ...r,
            import_batch_id: batch.id,
            status: 'scheduled',
            delay_minutes: 0,
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
          .from('flight_bookings')
          .insert({
            ...r,
            import_batch_id: batch.id,
            created_by: session.userId,
            status: 'scheduled',
            delay_minutes: 0,
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
    .from('flight_import_batches')
    .update({
      success_rows: successRows,
      failed_rows: insertErrors.length,
      status: 'completed',
      error_log: insertErrors.length > 0 ? insertErrors : null,
    })
    .eq('id', batch.id)

  return NextResponse.json({
    batchId: batch.id,
    successRows,
    failedRows: insertErrors.length,
    errors: insertErrors,
  })
}
