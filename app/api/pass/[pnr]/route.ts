import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { FlightBooking } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pnr: string }> }
) {
  const { pnr } = await params
  const db = createServiceClient()

  // Use limit(1) instead of single() to handle multiple imports safely
  const { data: bookings, error } = await db
    .from('flight_bookings')
    .select('*')
    .ilike('pnr', pnr.trim())
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !bookings || bookings.length === 0) {
    return NextResponse.json({ error: 'Boarding pass not found' }, { status: 404 })
  }

  return NextResponse.json({ booking: bookings[0] as FlightBooking })
}
