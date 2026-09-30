import { chromium, Browser } from 'playwright'
import { checkinAirIndia, type CheckinResult } from './airIndia'
import { checkinIndigo } from './indigo'
import { checkinAkasa } from './akasa'
import { checkinSpicejet } from './spicejet'
import { checkinAirIndiaExpress } from './airIndiaExpress'

export type { CheckinResult }

export type SupportedAirline = 'AI' | '6E' | 'QP' | 'SG' | 'IX'

/**
 * Detects the airline from the airline_code or flight_number prefix.
 * Returns null if automation is not supported for this airline.
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

/**
 * Main entry point: performs automated web check-in for the given booking.
 * Launches a headless Chromium browser, navigates to the airline's check-in
 * portal, fills PNR + last name, completes check-in, and returns the PDF.
 *
 * Called by the cron job 24h before departure or by the on-demand API.
 */
export async function performAutoCheckin(opts: {
  pnr: string
  travelerName: string
  airline: SupportedAirline
}): Promise<CheckinResult> {
  const { pnr, travelerName, airline } = opts

  console.log(`[AutoCheckin] Starting for PNR=${pnr} airline=${airline} traveler="${travelerName}"`)

  let browser: Browser | null = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // hide bot fingerprint
        '--disable-infobars',
        '--disable-extensions',
      ],
    })

    let result: CheckinResult

    if (airline === 'AI') {
      result = await checkinAirIndia(browser, pnr, travelerName)
    } else if (airline === '6E') {
      result = await checkinIndigo(browser, pnr, travelerName)
    } else if (airline === 'QP') {
      result = await checkinAkasa(browser, pnr, travelerName)
    } else if (airline === 'SG') {
      result = await checkinSpicejet(browser, pnr, travelerName)
    } else if (airline === 'IX') {
      result = await checkinAirIndiaExpress(browser, pnr, travelerName)
    } else {
      result = { success: false, error: `Unsupported airline: ${airline}` }
    }

    if (!result.success) {
      console.warn(`[AutoCheckin] Failed: ${result.error}`)
    } else {
      console.log(`[AutoCheckin] ✅ Success — PDF ready (${result.pdfBuffer?.length} bytes)`)
    }

    return result
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[AutoCheckin] Fatal: ${msg}`)
    return { success: false, error: msg }
  } finally {
    if (browser) await browser.close()
  }
}
