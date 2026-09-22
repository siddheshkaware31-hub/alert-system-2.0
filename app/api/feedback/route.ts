import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const db = createServiceClient()

  const { data: feedback, error } = await db
    .from('feedback')
    .select('*')
    .eq('feedback_token', token)
    .single()

  if (error || !feedback) {
    return NextResponse.json({ error: 'Invalid feedback token' }, { status: 404 })
  }

  // Fetch entity details
  let entityDetails: Record<string, unknown> = {}
  if (feedback.entity_type === 'flight') {
    const { data } = await db
      .from('flight_bookings')
      .select('flight_number, origin, destination, departure_date, traveler_name, pnr')
      .eq('id', feedback.entity_id)
      .single()
    entityDetails = data || {}
  } else if (feedback.entity_type === 'hotel') {
    const { data } = await db
      .from('hotel_bookings')
      .select('hotel_name, booking_ref, check_in_date, check_out_date, traveler_name')
      .eq('id', feedback.entity_id)
      .single()
    entityDetails = data || {}
  }

  return NextResponse.json({
    entityType: feedback.entity_type,
    entityDetails,
    rating: feedback.rating,
    submitted: !!feedback.submitted_at,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, rating, comment } = body as { token: string; rating: number; comment?: string }

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check if already submitted
  const { data: existing } = await db
    .from('feedback')
    .select('id, submitted_at')
    .eq('feedback_token', token)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Invalid feedback token' }, { status: 404 })
  }

  if (existing.submitted_at) {
    return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 })
  }

  const { error } = await db
    .from('feedback')
    .update({
      rating,
      comment: comment || null,
      submitted_at: new Date().toISOString(),
    })
    .eq('feedback_token', token)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
