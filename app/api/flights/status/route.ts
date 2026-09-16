import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getFlightStatus } from '@/lib/airlabs/client'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const flightNumber = searchParams.get('flightNumber')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  if (!flightNumber) return NextResponse.json({ error: 'flightNumber is required' }, { status: 400 })

  const result = await getFlightStatus(flightNumber, date)

  if (result.error && !result.data) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json(result.data)
}
