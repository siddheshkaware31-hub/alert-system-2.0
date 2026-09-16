export type FlightStatus = 'scheduled' | 'active' | 'landed' | 'cancelled' | 'diverted' | 'delayed' | 'unknown'
export type ConfirmationStatus = 'pending' | 'awaiting_reply' | 'confirmed' | 'failed'
export type NotificationChannel = 'email' | 'whatsapp'
export type NotificationStatus = 'pending' | 'sent' | 'failed'
export type EntityType = 'flight' | 'hotel'

export interface FlightImportBatch {
  id: string
  file_name: string
  total_rows: number
  success_rows: number
  failed_rows: number
  status: 'processing' | 'completed' | 'failed'
  error_log: Array<{ row: number; error: string }> | null
  imported_by: string | null
  created_at: string
}

export interface FlightBooking {
  id: string
  import_batch_id: string
  pnr: string
  ticket_number: string | null
  flight_number: string
  airline_code: string | null
  origin: string
  destination: string
  departure_date: string
  departure_time: string | null
  arrival_time: string | null
  traveler_name: string
  traveler_email: string
  traveler_phone: string
  status: FlightStatus
  delay_minutes: number
  gate: string | null
  terminal: string | null
  confirmation_email_sent: boolean
  confirmation_whatsapp_sent: boolean
  last_alert_status: string | null
  last_alert_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface HotelImportBatch {
  id: string
  file_name: string
  total_rows: number
  success_rows: number
  failed_rows: number
  status: 'processing' | 'completed' | 'failed'
  error_log: Array<{ row: number; error: string }> | null
  imported_by: string | null
  created_at: string
}

export interface HotelBooking {
  id: string
  import_batch_id: string
  hotel_name: string
  hotel_email: string | null
  hotel_phone: string | null
  booking_ref: string
  check_in_date: string
  check_out_date: string
  room_type: string | null
  num_rooms: number
  traveler_name: string
  traveler_email: string
  traveler_phone: string | null
  confirmation_status: ConfirmationStatus
  confirmation_token: string
  confirmed_via: 'link' | 'whatsapp' | null
  confirmed_at: string | null
  request_email_sent: boolean
  request_whatsapp_sent: boolean
  traveler_notified: boolean
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id: string
  entity_type: EntityType
  entity_id: string
  channel: NotificationChannel
  notification_type: string
  recipient_email: string | null
  recipient_phone: string | null
  status: NotificationStatus
  provider_message_id: string | null
  error_message: string | null
  sent_at: string
}

export interface FlightStatusInfo {
  flightNumber: string
  status: FlightStatus
  departureDelay: number
  arrivalDelay: number
  gate: string | null
  terminal: string | null
  scheduledDeparture: string | null
  estimatedDeparture: string | null
}

export interface ImportResult {
  batchId: string
  successRows: number
  failedRows: number
  errors: Array<{ row: number; error: string }>
}

export interface DashboardStats {
  flights: {
    totalToday: number
    delayed: number
    cancelled: number
    landed: number
  }
  hotels: {
    pendingConfirmation: number
    confirmedToday: number
    total: number
  }
  notifications: {
    sentLast24h: number
    failedLast24h: number
  }
}
