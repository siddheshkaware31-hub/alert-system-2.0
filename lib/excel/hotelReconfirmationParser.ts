import * as XLSX from 'xlsx'

export interface HotelReconfirmationRow {
  booking_ref: string
  check_in_date: string
  traveler_name: string
  hotel_name: string
  corporate_name?: string
  confirmation_status: 'confirmed' | 'cancelled' | 'pending'
  payment_status?: string
  reconfirmed_status_text?: string
  hcn?: string
  country?: string
  supplier_name?: string
  agent_name?: string
  agent_email?: string
  agent_phone?: string
  send_notification: boolean
}

export interface XlsxParseResult {
  rows: HotelReconfirmationRow[]
  errors: Array<{ row: number; error: string }>
}

function mapConfirmationStatus(paymentStatus: string, reconfirmedStatus: string): 'confirmed' | 'cancelled' | 'pending' {
  const pay = (paymentStatus || '').toLowerCase().trim()
  const rec = (reconfirmedStatus || '').toLowerCase().trim()

  if (pay === 'cancelled' || rec === 'cancelled') return 'cancelled'
  if (rec.startsWith('reconfirm')) return 'confirmed'
  return 'pending'
}

function excelDateToIso(val: unknown): string | null {
  if (!val) return null

  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }

  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (!date) return null
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  if (typeof val === 'string') {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // DD/MM/YYYY
    const slashParts = s.split('/')
    if (slashParts.length === 3) {
      const [d, m, y] = slashParts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    // DD-MM-YYYY
    const dashParts = s.split('-')
    if (dashParts.length === 3 && dashParts[2].length === 4) {
      const [d, m, y] = dashParts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return null
}

export function parseHotelReconfirmationXlsx(buffer: Buffer): XlsxParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })

  const rows: HotelReconfirmationRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < raw.length; i++) {
    const rec = raw[i]
    const rowNum = i + 2

    const velId = rec['VEL ID']
    const checkInRaw = rec['Check In Date']
    const guestName = rec['Guest Name']
    const hotelName = rec['Hotel Name']

    if (!velId && !guestName && !hotelName) continue

    const missingFields: string[] = []
    if (!velId) missingFields.push('VEL ID')
    if (!guestName) missingFields.push('Guest Name')
    if (!hotelName) missingFields.push('Hotel Name')
    if (!checkInRaw) missingFields.push('Check In Date')

    if (missingFields.length) {
      errors.push({ row: rowNum, error: `Missing required fields: ${missingFields.join(', ')}` })
      continue
    }

    const checkInDate = excelDateToIso(checkInRaw)
    if (!checkInDate) {
      errors.push({ row: rowNum, error: `Invalid Check In Date: ${checkInRaw}` })
      continue
    }

    const paymentStatus = String(rec['Payment Status '] ?? rec['Payment Status'] ?? '').trim()
    const reconfirmedStatus = String(rec['Reconfirmed Status '] ?? rec['Reconfirmed Status'] ?? '').trim()
    const sendNotifRaw = String(rec['Send Notification'] ?? '').trim().toUpperCase()
    const sendNotification = sendNotifRaw === 'YES'

    rows.push({
      booking_ref: String(velId).trim(),
      check_in_date: checkInDate,
      traveler_name: String(guestName).trim(),
      hotel_name: String(hotelName).trim(),
      corporate_name: rec['Corporate Name'] ? String(rec['Corporate Name']).trim() : undefined,
      confirmation_status: mapConfirmationStatus(paymentStatus, reconfirmedStatus),
      payment_status: paymentStatus || undefined,
      reconfirmed_status_text: reconfirmedStatus || undefined,
      hcn: rec['HCN'] != null ? String(rec['HCN']).trim() : undefined,
      country: rec['COUNTRY'] ? String(rec['COUNTRY']).trim() : undefined,
      supplier_name: rec['Supplier Name'] ? String(rec['Supplier Name']).trim() : undefined,
      agent_name: rec['Agent Name'] ? String(rec['Agent Name']).trim() : undefined,
      agent_email: rec['Agent Email'] ? String(rec['Agent Email']).trim().toLowerCase() : undefined,
      agent_phone: rec['Agent Phone'] ? String(rec['Agent Phone']).trim() : undefined,
      send_notification: sendNotification,
    })
  }

  return { rows, errors }
}
