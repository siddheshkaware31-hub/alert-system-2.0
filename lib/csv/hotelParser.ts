import * as XLSX from 'xlsx'
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
  const parts = s.split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s
}

export function parseHotelCsv(buffer: Buffer): ParseResult {
  const rows: HotelRow[] = []
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

    const rec: Record<string, string> = {}
    Object.keys(recRaw).forEach(k => {
      rec[k.toLowerCase().trim()] = String(recRaw[k] || '').trim()
    })

    const missing = REQUIRED.filter(f => !rec[f])
    if (missing.length) {
      errors.push({ row: rowNum, error: `Missing required fields: ${missing.join(', ')}` })
      continue
    }

    if (!EMAIL_RE.test(rec.traveler_email)) {
      errors.push({ row: rowNum, error: `Invalid traveler email: ${rec.traveler_email}` })
      continue
    }

    const checkIn = formatDateVal(recRaw.check_in_date || rec.check_in_date)
    const checkOut = formatDateVal(recRaw.check_out_date || rec.check_out_date)

    rows.push({
      hotel_name: rec.hotel_name,
      hotel_email: rec.hotel_email?.toLowerCase() || undefined,
      hotel_phone: rec.hotel_phone || undefined,
      booking_ref: rec.booking_ref,
      check_in_date: checkIn,
      check_out_date: checkOut,
      room_type: rec.room_type || undefined,
      num_rooms: Number(rec.num_rooms) || 1,
      traveler_name: rec.traveler_name,
      traveler_email: rec.traveler_email.toLowerCase(),
      traveler_phone: rec.traveler_phone || undefined,
    })
  }

  return { rows, errors }
}
