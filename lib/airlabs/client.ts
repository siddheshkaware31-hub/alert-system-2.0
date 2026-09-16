import { FlightStatus, FlightStatusInfo } from '@/types'

const BASE_URL = 'https://airlabs.co/api/v9'
const API_KEY = process.env.AIRLABS_API_KEY!

function mapStatus(raw: string, depDelayed: number): FlightStatus {
  switch (raw?.toLowerCase()) {
    case 'en-route': return 'active'
    case 'landed':   return 'landed'
    case 'scheduled':
      return depDelayed >= 15 ? 'delayed' : 'scheduled'
    default:         return 'unknown'
  }
}

// date param kept for API compatibility — Airlabs always returns current live status
export async function getFlightStatus(
  flightIata: string,
  _date?: string,
): Promise<{ data: FlightStatusInfo | null; raw: unknown; error?: string }> {
  try {
    const params = new URLSearchParams({ api_key: API_KEY, flight_iata: flightIata })
    const res = await fetch(`${BASE_URL}/flight?${params}`, { next: { revalidate: 0 } })
    const json = await res.json()

    if (!res.ok || json.error) {
      return { data: null, raw: json, error: json.error?.message || `HTTP ${res.status}` }
    }

    const flight = json.response
    if (!flight) {
      // Airlabs returns no response for cancelled or unknown flights
      return { data: null, raw: json, error: 'No flight data — may be cancelled or not yet tracked' }
    }

    const depDelayed: number = flight.dep_delayed ?? 0
    const arrDelayed: number = flight.arr_delayed ?? 0

    return {
      data: {
        flightNumber: flight.flight_iata || flightIata,
        status: mapStatus(flight.status, depDelayed),
        departureDelay: depDelayed,
        arrivalDelay: arrDelayed,
        gate: flight.dep_gate ?? null,
        terminal: flight.dep_terminal ?? null,
        scheduledDeparture: flight.dep_time_utc ?? null,
        estimatedDeparture: flight.dep_estimated_utc ?? null,
      },
      raw: json,
    }
  } catch (err: unknown) {
    return { data: null, raw: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
