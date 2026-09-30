import type { CheckinResult } from './airIndia'
import { detectAirline, type SupportedAirline } from './detect'

export type { CheckinResult }
export { detectAirline }
export type { SupportedAirline }

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

  let browser = null
  try {
    const { chromium } = await import('playwright')

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-extensions',
      ],
    })

    let result: CheckinResult

    if (airline === 'AI') {
      const { checkinAirIndia } = await import('./airIndia')
      result = await checkinAirIndia(browser, pnr, travelerName)
    } else if (airline === '6E') {
      const { checkinIndigo } = await import('./indigo')
      result = await checkinIndigo(browser, pnr, travelerName)
    } else if (airline === 'QP') {
      const { checkinAkasa } = await import('./akasa')
      result = await checkinAkasa(browser, pnr, travelerName)
    } else if (airline === 'SG') {
      const { checkinSpicejet } = await import('./spicejet')
      result = await checkinSpicejet(browser, pnr, travelerName)
    } else if (airline === 'IX') {
      const { checkinAirIndiaExpress } = await import('./airIndiaExpress')
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

