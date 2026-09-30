export type SupportedAirline = 'AI' | '6E' | 'QP' | 'SG' | 'IX'

/**
 * Detects the airline from the airline_code or flight_number prefix.
 * Lightweight function with zero heavy dependencies (safe for Server Components).
 */
export function detectAirline(airlineCode?: string | null, flightNumber?: string): SupportedAirline | null {
  const code = (airlineCode || flightNumber || '').toUpperCase().trim()

  if (code.startsWith('AI') || code === 'AI') return 'AI'
  if (code.startsWith('6E') || code === '6E') return '6E'
  if (code.startsWith('QP') || code === 'QP') return 'QP'
  if (code.startsWith('SG') || code === 'SG') return 'SG'
  if (code.startsWith('IX') || code === 'IX' || code.startsWith('I5') || code === 'I5') return 'IX'

  // Vistara (UK) merged into Air India — use AI flow
  if (code.startsWith('UK') || code === 'UK') return 'AI'

  return null
}
