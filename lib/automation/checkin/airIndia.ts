import type { Page, Browser } from 'playwright'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface CheckinResult {
  success: boolean
  pdfPath?: string       // local temp path to the downloaded PDF
  pdfBuffer?: Buffer     // PDF as buffer for emailing
  error?: string
  screenshotPath?: string // debug screenshot on failure
}

const AI_CHECKIN_URL = 'https://www.airindia.com/in/en/manage/web-check-in.html'

/**
 * Extracts the passenger's last name from the full name.
 * "Rohit Kumar Sharma" → "Sharma"
 * "Amit Kumar" → "Kumar"
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * Performs Air India web check-in via Playwright headless Chromium.
 * Returns the boarding pass PDF as a Buffer.
 */
export async function checkinAirIndia(
  browser: Browser,
  pnr: string,
  travelerName: string
): Promise<CheckinResult> {
  const lastName = extractLastName(travelerName)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-ai-'))
  let page: Page | null = null

  try {
    const context = await browser.newContext({
      // Appear as a real Chrome browser
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      acceptDownloads: true,
    })

    page = await context.newPage()

    // ── Step 1: Navigate to Air India check-in page ───────────────────────
    console.log(`[AirIndia] Navigating to check-in page for PNR ${pnr}`)
    await page.goto(AI_CHECKIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000) // let JS hydrate

    // ── Step 2: Fill PNR ─────────────────────────────────────────────────
    // Air India check-in form: PNR/booking reference field
    const pnrSelectors = [
      'input[name="pnr"]',
      'input[placeholder*="PNR"]',
      'input[placeholder*="Booking"]',
      'input[placeholder*="Reference"]',
      'input[id*="pnr"]',
      'input[id*="booking"]',
      '[data-testid="pnr-input"]',
    ]

    let pnrFilled = false
    for (const sel of pnrSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, pnr.toUpperCase())
        pnrFilled = true
        console.log(`[AirIndia] PNR filled using selector: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!pnrFilled) {
      const screenshot = path.join(tmpDir, 'debug-pnr.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: 'Could not locate PNR input field on Air India check-in page',
        screenshotPath: screenshot,
      }
    }

    // ── Step 3: Fill Last Name ────────────────────────────────────────────
    const lastNameSelectors = [
      'input[name="lastName"]',
      'input[name="last_name"]',
      'input[placeholder*="Last Name"]',
      'input[placeholder*="Surname"]',
      'input[id*="lastName"]',
      'input[id*="last-name"]',
      '[data-testid="last-name-input"]',
    ]

    let nameFilled = false
    for (const sel of lastNameSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, lastName.toUpperCase())
        nameFilled = true
        console.log(`[AirIndia] Last name "${lastName}" filled using selector: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!nameFilled) {
      const screenshot = path.join(tmpDir, 'debug-lastname.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: 'Could not locate Last Name input field on Air India check-in page',
        screenshotPath: screenshot,
      }
    }

    await page.waitForTimeout(500)

    // ── Step 4: Click Search / Retrieve Booking ───────────────────────────
    const searchSelectors = [
      'button[type="submit"]',
      'button:has-text("Check-in")',
      'button:has-text("Search")',
      'button:has-text("Retrieve")',
      'button:has-text("Continue")',
      '[data-testid="checkin-submit"]',
    ]

    let clicked = false
    for (const sel of searchSelectors) {
      try {
        await page.click(sel, { timeout: 5000 })
        clicked = true
        console.log(`[AirIndia] Search clicked using: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!clicked) {
      const screenshot = path.join(tmpDir, 'debug-submit.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: 'Could not click Search/Check-in button',
        screenshotPath: screenshot,
      }
    }

    // ── Step 5: Wait for booking details to load ──────────────────────────
    await page.waitForTimeout(4000)

    // Check for CAPTCHA
    const captchaPresent = await page.locator('iframe[src*="recaptcha"], .g-recaptcha, [class*="captcha"]').count()
    if (captchaPresent > 0) {
      const screenshot = path.join(tmpDir, 'debug-captcha.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: 'CAPTCHA_REQUIRED',
        screenshotPath: screenshot,
      }
    }

    // ── Step 6: Select passenger / skip seat (if prompted) ────────────────
    // Click "Check In" for the passenger if there's a list
    const checkinBtnSelectors = [
      'button:has-text("Check In")',
      'button:has-text("Proceed")',
      'a:has-text("Check In")',
    ]
    for (const sel of checkinBtnSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click()
          await page.waitForTimeout(2000)
          break
        }
      } catch { /* try next */ }
    }

    // Skip seat selection if prompted
    const skipSeatSelectors = [
      'button:has-text("Skip")',
      'button:has-text("Continue without seat")',
      'a:has-text("Skip seat")',
    ]
    for (const sel of skipSeatSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click()
          await page.waitForTimeout(1500)
          break
        }
      } catch { /* try next */ }
    }

    // ── Step 7: Download boarding pass PDF ────────────────────────────────
    const downloadSelectors = [
      'button:has-text("Download Boarding Pass")',
      'a:has-text("Download Boarding Pass")',
      'button:has-text("Download")',
      'a:has-text("Download")',
      '[data-testid="download-bp"]',
    ]

    let pdfBuffer: Buffer | undefined

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
        pdfBuffer = fs.readFileSync(pdfPath)
        console.log(`[AirIndia] ✅ Boarding pass PDF downloaded: ${pdfPath} (${pdfBuffer.length} bytes)`)

        return { success: true, pdfPath, pdfBuffer }
      } catch { /* try next */ }
    }

    // Try print-to-PDF fallback if no download button found
    console.log('[AirIndia] No download button found, trying print-to-PDF fallback...')
    try {
      const pdfPath = path.join(tmpDir, `boarding-pass-${pnr}.pdf`)
      const pdfBytes = await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      })
      pdfBuffer = Buffer.from(pdfBytes)
      console.log(`[AirIndia] ✅ PDF generated via print: ${pdfPath}`)
      return { success: true, pdfPath, pdfBuffer }
    } catch (printErr) {
      const screenshot = path.join(tmpDir, 'debug-download.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: `Could not download boarding pass PDF: ${printErr instanceof Error ? printErr.message : 'Unknown'}`,
        screenshotPath: screenshot,
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[AirIndia] Fatal error: ${msg}`)

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
