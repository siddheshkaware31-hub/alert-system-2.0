import { FlightStatus, FlightStatusInfo } from '@/types'

const BASE_URL = process.env.AVIATIONSTACK_API_URL || 'http://api.aviationstack.com/v1'
const API_KEY = process.env.AVIATIONSTACK_API_KEY!

function mapStatus(raw: string): FlightStatus {
  const map: Record<string, FlightStatus> = {
    scheduled: 'scheduled',
    active: 'active',
    landed: 'landed',
    cancelled: 'cancelled',
    diverted: 'diverted',
    delayed: 'delayed',
  }
  return map[raw?.toLowerCase()] ?? 'unknown'
}

export async function getFlightStatus(
  flightIata: string,
  date: string
): Promise<{ data: FlightStatusInfo | null; raw: unknown; error?: string }> {
  try {
    const params = new URLSearchParams({
      access_key: API_KEY,
      flight_iata: flightIata,
      flight_date: date,
    })
    const res = await fetch(`${BASE_URL}/flights?${params}`, { next: { revalidate: 0 } })
    const json = await res.json()

    if (!res.ok || json.error) {
      return { data: null, raw: json, error: json.error?.info || `HTTP ${res.status}` }
    }

    const flight = json.data?.[0]
    if (!flight) {
      return { data: null, raw: json, error: 'No flight data found' }
    }

    const status = mapStatus(flight.flight_status)
    const departureDelay = flight.departure?.delay ?? 0
    const arrivalDelay = flight.arrival?.delay ?? 0

    // AviationStack sometimes returns 'scheduled' even when delayed
    const effectiveStatus: FlightStatus = (departureDelay >= 15 && status === 'scheduled') ? 'delayed' : status

    return {
      data: {
        flightNumber: flight.flight?.iata || flightIata,
        status: effectiveStatus,
        departureDelay,
        arrivalDelay,
        gate: flight.departure?.gate ?? null,
        terminal: flight.departure?.terminal ?? null,
        scheduledDeparture: flight.departure?.scheduled ?? null,
        estimatedDeparture: flight.departure?.estimated ?? null,
      },
      raw: json,
    }
  } catch (err: unknown) {
    return { data: null, raw: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
