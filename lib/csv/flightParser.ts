import * as XLSX from 'xlsx'
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

function formatDateVal(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM/YYYY
  const parts = s.split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s
}

export function parseFlightCsv(buffer: Buffer): ParseResult {
  const rows: FlightRow[] = []
  const errors: Array<{ row: number; error: string }> = []
  let records: Record<string, any>[] = []

  try {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    records = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  } catch {
    try {
      records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      return { rows: [], errors: [{ row: 1, error: 'Could not parse CSV or Excel file' }] }
    }
  }

  for (let i = 0; i < records.length; i++) {
    const recRaw = records[i]
    const rowNum = i + 2

    // Normalize keys to lowercase trim
    const rec: Record<string, string> = {}
    Object.keys(recRaw).forEach(k => {
      rec[k.toLowerCase().trim()] = String(recRaw[k] || '').trim()
    })

    const missing = REQUIRED.filter(f => !rec[f])
    if (missing.length) {
      errors.push({ row: rowNum, error: `Missing required fields: ${missing.join(', ')}` })
      continue
    }

    const email = rec.traveler_email
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, error: `Invalid email: ${email}` })
      continue
    }

    const departureDate = formatDateVal(recRaw.departure_date || rec.departure_date)

    rows.push({
      pnr: rec.pnr.toUpperCase(),
      ticket_number: rec.ticket_number || undefined,
      flight_number: rec.flight_number.toUpperCase(),
      airline_code: rec.airline_code?.toUpperCase() || undefined,
      origin: rec.origin.toUpperCase(),
      destination: rec.destination.toUpperCase(),
      departure_date: departureDate,
      departure_time: rec.departure_time || undefined,
      arrival_time: rec.arrival_time || undefined,
      traveler_name: rec.traveler_name,
      traveler_email: email.toLowerCase(),
      traveler_phone: rec.traveler_phone,
    })
  }

  return { rows, errors }
}
