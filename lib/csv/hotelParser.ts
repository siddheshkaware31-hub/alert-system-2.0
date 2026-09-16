import { parse } from 'csv-parse/sync'

export interface HotelRow {
  hotel_name: string
  hotel_email?: string
  hotel_phone?: string
  booking_ref: string
  check_in_date: string
  check_out_date: string
  room_type?: string
  num_rooms: number
  traveler_name: string
  traveler_email: string
  traveler_phone?: string
}

export interface ParseResult {
  rows: HotelRow[]
  errors: Array<{ row: number; error: string }>
}

const REQUIRED = ['hotel_name', 'booking_ref', 'check_in_date', 'check_out_date', 'traveler_name', 'traveler_email']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseHotelCsv(buffer: Buffer): ParseResult {
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const rows: HotelRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < records.length; i++) {
    const rec: Record<string, string> = records[i]
    const rowNum = i + 2
    const missing = REQUIRED.filter(f => !rec[f]?.trim())

    if (missing.length) {
      errors.push({ row: rowNum, error: `Missing required fields: ${missing.join(', ')}` })
      continue
    }
    if (!EMAIL_RE.test(rec.traveler_email)) {
      errors.push({ row: rowNum, error: `Invalid traveler email: ${rec.traveler_email}` })
      continue
    }
    if (rec.hotel_email && !EMAIL_RE.test(rec.hotel_email)) {
      errors.push({ row: rowNum, error: `Invalid hotel email: ${rec.hotel_email}` })
      continue
    }
    if (!DATE_RE.test(rec.check_in_date) || !DATE_RE.test(rec.check_out_date)) {
      errors.push({ row: rowNum, error: `Invalid date format (expected YYYY-MM-DD)` })
      continue
    }

    rows.push({
      hotel_name: rec.hotel_name.trim(),
      hotel_email: rec.hotel_email?.trim().toLowerCase() || undefined,
      hotel_phone: rec.hotel_phone?.trim() || undefined,
      booking_ref: rec.booking_ref.trim(),
      check_in_date: rec.check_in_date.trim(),
      check_out_date: rec.check_out_date.trim(),
      room_type: rec.room_type?.trim() || undefined,
      num_rooms: Number(rec.num_rooms) || 1,
      traveler_name: rec.traveler_name.trim(),
      traveler_email: rec.traveler_email.trim().toLowerCase(),
      traveler_phone: rec.traveler_phone?.trim() || undefined,
    })
  }

  return { rows, errors }
}
