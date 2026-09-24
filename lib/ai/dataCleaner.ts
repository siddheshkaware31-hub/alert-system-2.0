import { FlightRow } from '@/lib/csv/flightParser'
import { HotelReconfirmationRow } from '@/lib/excel/hotelReconfirmationParser'

export interface AICleaningStats {
  headersMapped: number
  phonesFormatted: number
  namesCleaned: number
  datesNormalized: number
  aiCorrections: string[]
}

export interface AICleanResult<T> {
  rows: T[]
  stats: AICleaningStats
}

// Map common header variations to standard schema keys
const FLIGHT_HEADER_MAP: Record<string, keyof FlightRow> = {
  // PNR
  'pnr': 'pnr',
  'pnr_no': 'pnr',
  'pnr_number': 'pnr',
  'pnr #': 'pnr',
  'booking_pnr': 'pnr',
  'pnr number': 'pnr',
  'pnr no': 'pnr',

  // Ticket
  'ticket': 'ticket_number',
  'ticket_number': 'ticket_number',
  'ticket_no': 'ticket_number',
  'ticket #': 'ticket_number',
  'eticket': 'ticket_number',

  // Flight Number
  'flight': 'flight_number',
  'flight_number': 'flight_number',
  'flight_no': 'flight_number',
  'flight_num': 'flight_number',
  'flight #': 'flight_number',
  'flight number': 'flight_number',

  // Airline
  'airline': 'airline_code',
  'airline_code': 'airline_code',
  'carrier': 'airline_code',

  // Origin & Destination
  'origin': 'origin',
  'from': 'origin',
  'departure_city': 'origin',
  'dep_city': 'origin',
  'destination': 'destination',
  'to': 'destination',
  'arrival_city': 'destination',
  'arr_city': 'destination',

  // Dates & Times
  'date': 'departure_date',
  'departure_date': 'departure_date',
  'dep_date': 'departure_date',
  'flight_date': 'departure_date',
  'departure_time': 'departure_time',
  'dep_time': 'departure_time',
  'arrival_time': 'arrival_time',
  'arr_time': 'arrival_time',

  // Traveler Name
  'name': 'traveler_name',
  'traveler_name': 'traveler_name',
  'passenger_name': 'traveler_name',
  'pax_name': 'traveler_name',
  'guest_name': 'traveler_name',
  'customer_name': 'traveler_name',
  'passenger': 'traveler_name',

  // Traveler Email
  'email': 'traveler_email',
  'traveler_email': 'traveler_email',
  'passenger_email': 'traveler_email',
  'pax_email': 'traveler_email',
  'customer_email': 'traveler_email',

  // Traveler Phone
  'phone': 'traveler_phone',
  'traveler_phone': 'traveler_phone',
  'mobile': 'traveler_phone',
  'contact': 'traveler_phone',
  'contact_number': 'traveler_phone',
  'phone_number': 'traveler_phone',
  'pax_mobile': 'traveler_phone',
  'whatsapp': 'traveler_phone',
  'whatsapp_number': 'traveler_phone',
}

const HOTEL_HEADER_MAP: Record<string, keyof HotelReconfirmationRow> = {
  'vel id': 'booking_ref',
  'booking_ref': 'booking_ref',
  'booking ref': 'booking_ref',
  'ref': 'booking_ref',
  'hcn': 'hcn',
  'guest name': 'traveler_name',
  'guest_name': 'traveler_name',
  'traveler_name': 'traveler_name',
  'pax name': 'traveler_name',
  'hotel name': 'hotel_name',
  'hotel_name': 'hotel_name',
  'hotel': 'hotel_name',
  'check in date': 'check_in_date',
  'check_in_date': 'check_in_date',
  'checkin': 'check_in_date',
  'agent email': 'agent_email',
  'agent_email': 'agent_email',
  'agent phone': 'agent_phone',
  'agent_phone': 'agent_phone',
  'hotel email': 'agent_email',
  'hotel phone': 'agent_phone',
}

/**
 * Strips honorifics (Mr., Mrs., Ms., Dr., Shri, etc.) and normalizes whitespace
 */
export function cleanPassengerName(rawName: string): { cleanedName: string; modified: boolean } {
  if (!rawName) return { cleanedName: '', modified: false }
  
  const original = rawName.trim()
  // Regex to remove titles
  let cleaned = original
    .replace(/^(mr|mrs|ms|miss|dr|prof|shri|smt|master)\.?\s+/i, '')
    .replace(/\s+(mr|mrs|ms|miss|dr|prof)$/i, '')
    .trim()

  // Title case conversion if all uppercase or all lowercase
  if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return {
    cleanedName: cleaned,
    modified: cleaned !== original,
  }
}

/**
 * Smart Phone Number Formatting
 * Cleans phone number, removes non-numeric chars, and ensures Indian numbers have +91 country code
 */
export function cleanPhoneNumber(rawPhone: string): { cleanedPhone: string; modified: boolean } {
  if (!rawPhone) return { cleanedPhone: '', modified: false }
  const original = String(rawPhone).trim()

  // Keep numbers only
  let digits = original.replace(/[^0-9]/g, '')

  // Remove leading zeros
  digits = digits.replace(/^0+/, '')

  // If 10 digits (Standard Indian Mobile), add 91 prefix
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = `91${digits}`
  }

  // If starts with + or valid length (11-13 digits)
  const cleaned = digits ? `+${digits}` : original

  return {
    cleanedPhone: cleaned,
    modified: cleaned !== original,
  }
}

/**
 * Smart Date Normalizer (Handles 24/09/2026, 2026-09-24, 24 Sept 2026, etc.)
 */
export function normalizeDate(rawDate: string): { normalizedDate: string; modified: boolean } {
  if (!rawDate) return { normalizedDate: '', modified: false }
  const s = String(rawDate).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { normalizedDate: s, modified: false }

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = s.split(/[\/\-\.]/)
  if (parts.length === 3) {
    let [d, m, y] = parts
    if (y.length === 2) y = `20${y}`
    if (d.length === 4) {
      // YYYY/MM/DD
      const formatted = `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`
      return { normalizedDate: formatted, modified: true }
    }
    const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return { normalizedDate: formatted, modified: true }
  }

  // Month Name formats e.g. "24 Sept 2026" or "Sept 24, 2026"
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      const formatted = d.toISOString().split('T')[0]
      return { normalizedDate: formatted, modified: true }
    }
  } catch {}

  return { normalizedDate: s, modified: false }
}

/**
 * AI Header Normalizer
 * Normalizes raw object keys using AI dictionary mapping
 */
export function normalizeHeaders<T extends Record<string, any>>(
  rawRecord: Record<string, any>,
  type: 'flight' | 'hotel'
): { normalizedRecord: T; mappedCount: number; corrections: string[] } {
  const normalizedRecord: Record<string, any> = {}
  let mappedCount = 0
  const corrections: string[] = []

  const headerMap = type === 'flight' ? FLIGHT_HEADER_MAP : (HOTEL_HEADER_MAP as Record<string, string>)

  Object.keys(rawRecord).forEach(rawKey => {
    const cleanKey = rawKey.toLowerCase().trim()
    const mappedKey = headerMap[cleanKey] || cleanKey

    if (mappedKey !== cleanKey && headerMap[cleanKey]) {
      mappedCount++
      corrections.push(`Mapped column '${rawKey}' ➔ '${String(mappedKey)}'`)
    }

    normalizedRecord[String(mappedKey)] = rawRecord[rawKey]
  })

  return { normalizedRecord: normalizedRecord as T, mappedCount, corrections }
}

/**
 * Runs full AI Cleaning Suite on raw records
 */
export function cleanFlightRecords(rawRecords: Record<string, any>[]): AICleanResult<Record<string, any>> {
  const stats: AICleaningStats = {
    headersMapped: 0,
    phonesFormatted: 0,
    namesCleaned: 0,
    datesNormalized: 0,
    aiCorrections: [],
  }

  const cleanedRows: Record<string, any>[] = []

  for (const raw of rawRecords) {
    // 1. Header mapping
    const { normalizedRecord, mappedCount, corrections } = normalizeHeaders(raw, 'flight')
    stats.headersMapped += mappedCount
    if (corrections.length && !stats.aiCorrections.includes(corrections[0])) {
      stats.aiCorrections.push(...corrections)
    }

    const cleaned = { ...normalizedRecord }

    // 2. Name Cleaning
    if (cleaned.traveler_name) {
      const { cleanedName, modified } = cleanPassengerName(String(cleaned.traveler_name))
      if (modified) {
        stats.namesCleaned++
        stats.aiCorrections.push(`Cleaned name: '${cleaned.traveler_name}' ➔ '${cleanedName}'`)
        cleaned.traveler_name = cleanedName
      }
    }

    // 3. Phone Formatting
    if (cleaned.traveler_phone) {
      const { cleanedPhone, modified } = cleanPhoneNumber(String(cleaned.traveler_phone))
      if (modified) {
        stats.phonesFormatted++
        stats.aiCorrections.push(`Formatted phone: '${cleaned.traveler_phone}' ➔ '${cleanedPhone}'`)
        cleaned.traveler_phone = cleanedPhone
      }
    }

    // 4. Date Normalization
    if (cleaned.departure_date) {
      const { normalizedDate, modified } = normalizeDate(String(cleaned.departure_date))
      if (modified) {
        stats.datesNormalized++
        stats.aiCorrections.push(`Normalized date: '${cleaned.departure_date}' ➔ '${normalizedDate}'`)
        cleaned.departure_date = normalizedDate
      }
    }

    cleanedRows.push(cleaned)
  }

  // Deduplicate correction logs
  stats.aiCorrections = Array.from(new Set(stats.aiCorrections)).slice(0, 10)

  return { rows: cleanedRows, stats }
}
