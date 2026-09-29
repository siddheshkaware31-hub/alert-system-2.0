import type { Page, Browser } from 'playwright'
import path from 'path'
import fs from 'fs'
import os from 'os'
import type { CheckinResult } from './airIndia'

const INDIGO_CHECKIN_URL = 'https://www.goindigo.in/check-in.html'

function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * Performs IndiGo web check-in via Playwright headless Chromium.
 * Returns the boarding pass PDF as a Buffer.
 *
 * IndiGo check-in flow:
 *  1. Enter PNR (6 chars) + Last Name on goindigo.in/check-in
 *  2. Confirm passenger
 *  3. Skip seat / extras
 *  4. Download boarding pass PDF
 */
export async function checkinIndigo(
  browser: Browser,
  pnr: string,
  travelerName: string
): Promise<CheckinResult> {
  const lastName = extractLastName(travelerName)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-6e-'))
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

    // ── Step 1: Go to IndiGo check-in ─────────────────────────────────────
    console.log(`[IndiGo] Navigating to check-in for PNR ${pnr}`)
    await page.goto(INDIGO_CHECKIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // ── Step 2: Fill PNR ──────────────────────────────────────────────────
    const pnrSelectors = [
      'input[name="pnr"]',
      'input[name="bookingReference"]',
      'input[placeholder*="PNR"]',
      'input[placeholder*="Booking"]',
      'input[id*="pnr"]',
      'input[id*="booking"]',
      '#bookingReference',
      '#pnrNumber',
    ]

    let pnrFilled = false
    for (const sel of pnrSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, pnr.toUpperCase())
        pnrFilled = true
        console.log(`[IndiGo] PNR filled using: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!pnrFilled) {
      const screenshot = path.join(tmpDir, 'debug-pnr.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'PNR field not found on IndiGo check-in page', screenshotPath: screenshot }
    }

    // ── Step 3: Fill Last Name ─────────────────────────────────────────────
    const lastNameSelectors = [
      'input[name="lastName"]',
      'input[name="last_name"]',
      'input[name="surname"]',
      'input[placeholder*="Last Name"]',
      'input[placeholder*="Surname"]',
      '#lastName',
      '#surname',
    ]

    let nameFilled = false
    for (const sel of lastNameSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 })
        await page.fill(sel, lastName.toUpperCase())
        nameFilled = true
        console.log(`[IndiGo] Last name "${lastName}" filled using: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!nameFilled) {
      const screenshot = path.join(tmpDir, 'debug-lastname.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'Last name field not found on IndiGo check-in page', screenshotPath: screenshot }
    }

    await page.waitForTimeout(500)

    // ── Step 4: Submit ─────────────────────────────────────────────────────
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Check In")',
      'button:has-text("Search")',
      'button:has-text("Retrieve Booking")',
      'button:has-text("Continue")',
      '.check-in-btn',
      '#submitCheckin',
    ]

    let submitted = false
    for (const sel of submitSelectors) {
      try {
        await page.click(sel, { timeout: 5000 })
        submitted = true
        console.log(`[IndiGo] Form submitted using: ${sel}`)
        break
      } catch { /* try next */ }
    }

    if (!submitted) {
      const screenshot = path.join(tmpDir, 'debug-submit.png')
      await page.screenshot({ path: screenshot })
      return { success: false, error: 'Could not find submit button on IndiGo page', screenshotPath: screenshot }
    }

    await page.waitForTimeout(4000)

    // Check for Cloudflare/CAPTCHA block
    const pageTitle = await page.title()
    const pageContent = await page.content()
    if (
      pageTitle.toLowerCase().includes('just a moment') ||
      pageContent.includes('cf-browser-verification') ||
      pageContent.includes('cloudflare') ||
      pageContent.includes('captcha')
    ) {
      const screenshot = path.join(tmpDir, 'debug-blocked.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: 'CAPTCHA_REQUIRED',
        screenshotPath: screenshot,
      }
    }

    // ── Step 5: Handle passenger selection ────────────────────────────────
    const proceedSelectors = [
      'button:has-text("Proceed")',
      'button:has-text("Check In")',
      'button:has-text("Confirm")',
      'a:has-text("Check In")',
    ]
    for (const sel of proceedSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click()
          await page.waitForTimeout(2000)
          break
        }
      } catch { /* try next */ }
    }

    // ── Step 6: Skip seat / extras ────────────────────────────────────────
    const skipSelectors = [
      'button:has-text("Skip")',
      'button:has-text("No Thanks")',
      'button:has-text("Continue without")',
      'a:has-text("Skip")',
    ]
    for (const sel of skipSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click()
          await page.waitForTimeout(1500)
          break
        }
      } catch { /* try next */ }
    }

    // ── Step 7: Download boarding pass ────────────────────────────────────
    const downloadSelectors = [
      'button:has-text("Download Boarding Pass")',
      'a:has-text("Download Boarding Pass")',
      'button:has-text("Download")',
      'a[href*="boarding"]',
      '.download-bp',
      '[data-testid="download-bp"]',
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
        console.log(`[IndiGo] ✅ PDF downloaded: ${pdfPath} (${pdfBuffer.length} bytes)`)
        return { success: true, pdfPath, pdfBuffer }
      } catch { /* try next */ }
    }

    // Fallback: print current page to PDF
    console.log('[IndiGo] No download button, using print-to-PDF fallback...')
    try {
      const pdfPath = path.join(tmpDir, `boarding-pass-${pnr}.pdf`)
      const pdfBytes = await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      })
      const pdfBuffer = Buffer.from(pdfBytes)
      console.log(`[IndiGo] ✅ PDF via print-to-PDF: ${pdfBuffer.length} bytes`)
      return { success: true, pdfPath, pdfBuffer }
    } catch (printErr) {
      const screenshot = path.join(tmpDir, 'debug-download.png')
      await page.screenshot({ path: screenshot })
      return {
        success: false,
        error: `PDF download failed: ${printErr instanceof Error ? printErr.message : 'Unknown'}`,
        screenshotPath: screenshot,
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[IndiGo] Fatal error: ${msg}`)
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
