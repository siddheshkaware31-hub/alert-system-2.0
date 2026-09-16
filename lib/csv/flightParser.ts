import { parse } from 'csv-parse/sync'

export interface FlightRow {
  pnr: string
  ticket_number?: string
  flight_number: string
  airline_code?: string
  origin: string
  destination: string
  departure_date: string
  departure_time?: string
  arrival_time?: string
  traveler_name: string
  traveler_email: string
  traveler_phone: string
}

export interface ParseResult {
  rows: FlightRow[]
  errors: Array<{ row: number; error: string }>
}

const REQUIRED = ['pnr', 'flight_number', 'origin', 'destination', 'departure_date', 'traveler_name', 'traveler_email', 'traveler_phone']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseFlightCsv(buffer: Buffer): ParseResult {
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const rows: FlightRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < records.length; i++) {
    const rec: Record<string, string> = records[i]
    const rowNum = i + 2 // 1-indexed + header
    const missing = REQUIRED.filter(f => !rec[f]?.trim())

    if (missing.length) {
      errors.push({ row: rowNum, error: `Missing required fields: ${missing.join(', ')}` })
      continue
    }
    if (!EMAIL_RE.test(rec.traveler_email)) {
      errors.push({ row: rowNum, error: `Invalid email: ${rec.traveler_email}` })
      continue
    }
    if (!DATE_RE.test(rec.departure_date)) {
      errors.push({ row: rowNum, error: `Invalid date format (expected YYYY-MM-DD): ${rec.departure_date}` })
      continue
    }

    rows.push({
      pnr: rec.pnr.trim().toUpperCase(),
      ticket_number: rec.ticket_number?.trim() || undefined,
      flight_number: rec.flight_number.trim().toUpperCase(),
      airline_code: rec.airline_code?.trim().toUpperCase() || undefined,
      origin: rec.origin.trim().toUpperCase(),
      destination: rec.destination.trim().toUpperCase(),
      departure_date: rec.departure_date.trim(),
      departure_time: rec.departure_time?.trim() || undefined,
      arrival_time: rec.arrival_time?.trim() || undefined,
      traveler_name: rec.traveler_name.trim(),
      traveler_email: rec.traveler_email.trim().toLowerCase(),
      traveler_phone: rec.traveler_phone.trim(),
    })
  }

  return { rows, errors }
}
