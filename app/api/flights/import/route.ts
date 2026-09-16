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
  if (rows.length > 0) {
    const inserts = rows.map(r => ({ ...r, import_batch_id: batch.id, created_by: session.userId }))
    const { error: insertErr } = await db.from('flight_bookings').insert(inserts)
    if (!insertErr) successRows = rows.length
  }

  await db
    .from('flight_import_batches')
    .update({
      success_rows: successRows,
      failed_rows: errors.length,
      status: 'completed',
      error_log: errors.length > 0 ? errors : null,
    })
    .eq('id', batch.id)

  return NextResponse.json({
    batchId: batch.id,
    successRows,
    failedRows: errors.length,
    errors,
  })
}
