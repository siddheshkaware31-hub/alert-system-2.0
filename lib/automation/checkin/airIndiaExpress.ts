import type { Page, Browser } from 'playwright'
import path from 'path'
import fs from 'fs'
import os from 'os'
import type { CheckinResult } from './airIndia'

const AIX_CHECKIN_URL = 'https://www.airindiaexpress.com'

function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * Performs Air India Express (IX / I5) web check-in via Playwright headless Chromium.
 * Returns the boarding pass PDF as a Buffer.
 */
export async function checkinAirIndiaExpress(
  browser: Browser,
  pnr: string,
  travelerName: string
): Promise<CheckinResult> {
  const lastName = extractLastName(travelerName)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-ix-'))
  let page: Page | null = null

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      acceptDownloads: true,
    })

    page = await context.newPage()

    console.log(`[AirIndiaExpress] Navigating to check-in page for PNR ${pnr}`)
    await page.goto(AIX_CHECKIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Click Check-in tab
    const tabSelectors = [
      'button:has-text("Check-in")',
      'a:has-text("Check-in")',
      '[data-testid="checkin-tab"]',
    ]
    for (const sel of tabSelectors) {
      try {
        const tab = page.locator(sel).first()
        if (await tab.isVisible({ timeout: 3000 })) {
          await tab.click()
          await page.waitForTimeout(1000)
          break
        }
      } catch { /* ignore */ }
    }

    // Fill PNR
    const pnrSelectors = [
      'input[name="pnr"]',
      'input[placeholder*="PNR"]',
      'input[placeholder*="Booking"]',
      '#pnr',
    ]
    let pnrFilled = false
    for (const sel of pnrSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, pnr.toUpperCase())
        pnrFilled = true
        console.log(`[AirIndiaExpress] PNR filled using selector: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!pnrFilled) {
      const screenshot = path.join(tmpDir, 'debug-pnr.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'Could not locate PNR field on Air India Express page', screenshotPath: screenshot }
    }

    // Fill Last Name
    const lastNameSelectors = [
      'input[name="lastName"]',
      'input[placeholder*="Last Name"]',
      '#lastName',
    ]
    let nameFilled = false
    for (const sel of lastNameSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, lastName.toUpperCase())
        nameFilled = true
        console.log(`[AirIndiaExpress] Last name "${lastName}" filled using selector: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!nameFilled) {
      const screenshot = path.join(tmpDir, 'debug-lastname.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'Could not locate Last Name field on Air India Express page', screenshotPath: screenshot }
    }

    // Click submit
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Check-in")',
      'button:has-text("Search")',
    ]
    let submitted = false
    for (const sel of submitSelectors) {
      try {
        await page.click(sel, { timeout: 5000 })
        submitted = true
        break
      } catch { /* try next */ }
    }

    if (!submitted) {
      const screenshot = path.join(tmpDir, 'debug-submit.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'Could not click submit button on Air India Express page', screenshotPath: screenshot }
    }

    await page.waitForTimeout(4000)

    // Check CAPTCHA
    const captchaPresent = await page.locator('iframe[src*="recaptcha"], .g-recaptcha, [class*="captcha"]').count()
    if (captchaPresent > 0) {
      const screenshot = path.join(tmpDir, 'debug-captcha.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'CAPTCHA_REQUIRED', screenshotPath: screenshot }
    }

    // PDF Download / Print Fallback
    const downloadSelectors = [
      'button:has-text("Download Boarding Pass")',
      'a:has-text("Download Boarding Pass")',
      'button:has-text("Download")',
    ]
    for (const sel of downloadSelectors) {
      try {
        const el = page.locator(sel).first()
        if (!(await el.isVisible({ timeout: 5000 }))) continue
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          el.click(),
        ])
        const pdfPath = path.join(tmpDir, `boarding-pass-${pnr}.pdf`)
        await download.saveAs(pdfPath)
        const pdfBuffer = fs.readFileSync(pdfPath)
        console.log(`[AirIndiaExpress] ✅ Boarding pass PDF downloaded: ${pdfPath}`)
        return { success: true, pdfPath, pdfBuffer }
      } catch { /* try next */ }
    }

    console.log('[AirIndiaExpress] Print-to-PDF fallback...')
    const pdfPath = path.join(tmpDir, `boarding-pass-${pnr}.pdf`)
    const pdfBytes = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    })
    const pdfBuffer = Buffer.from(pdfBytes)
    return { success: true, pdfPath, pdfBuffer }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    let screenshotPath: string | undefined
    try {
      if (page) {
        screenshotPath = path.join(tmpDir, 'debug-fatal.png')
        await page.screenshot({ path: screenshotPath })
      }
    } catch { /* ignore */ }
    return { success: false, error: msg, screenshotPath }
  }
}
