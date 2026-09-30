/**
 * Known Indian domestic airport IATA codes and city names.
 */
const INDIAN_DOMESTIC_AIRPORTS = new Set([
  'BOM', 'MUMBAI',
  'DEL', 'DELHI', 'NEW DELHI',
  'BLR', 'BEN', 'BENGALURU', 'BANGALORE',
  'MAA', 'CHE', 'CHENNAI',
  'CCU', 'KOL', 'KOLKATA',
  'HYD', 'HYDERABAD',
  'AMD', 'AHMEDABAD',
  'COK', 'KOCHI', 'COCHIN',
  'GOI', 'GOX', 'GOA',
  'PNQ', 'PUNE',
  'IXC', 'CHANDIGARH',
  'JAI', 'JAIPUR',
  'ATQ', 'AMRITSAR',
  'LKO', 'LUCKNOW',
  'TRV', 'THIRUVANANTHAPURAM', 'TRIVANDRUM',
  'IXB', 'BAGDOGRA',
  'NAG', 'NAGPUR',
  'PAT', 'PATNA',
  'IDR', 'INDORE',
  'VTZ', 'VISAKHAPATNAM',
  'BBI', 'BHUBANESWAR',
  'IXR', 'RANCHI',
  'RPR', 'RAIPUR',
  'STV', 'SURAT',
  'IXJ', 'JAMMU',
  'SXR', 'SRINAGAR',
  'IXE', 'MANGALURU',
  'GAY', 'GAYA',
  'VNS', 'VARANASI',
  'UDR', 'UDAIPUR',
  'BDQ', 'VADODARA',
  'KNU', 'KANPUR',
])

/**
 * Determines whether a flight route is International (requires airport Passport & Visa verification).
 * Returns true if origin or destination is outside India's domestic airport network.
 */
export function isInternationalFlight(origin: string, destination: string): boolean {
  const cleanOrg = (origin || '').toUpperCase().trim()
  const cleanDest = (destination || '').toUpperCase().trim()

  // Extract 3-letter IATA code if format is "BOM" or "BOM (MUMBAI)"
  const orgCode = cleanOrg.substring(0, 3)
  const destCode = cleanDest.substring(0, 3)

  const isOrgDomestic = INDIAN_DOMESTIC_AIRPORTS.has(orgCode) || INDIAN_DOMESTIC_AIRPORTS.has(cleanOrg)
  const isDestDomestic = INDIAN_DOMESTIC_AIRPORTS.has(destCode) || INDIAN_DOMESTIC_AIRPORTS.has(cleanDest)

  // If either origin or destination is not in Indian domestic set, it's International
  return !isOrgDomestic || !isDestDomestic
}

/**
 * Generates Email & WhatsApp text for International Visa & Passport verification notice.
 */
export function internationalVisaNoticeEmail(opts: {
  travelerName: string
  pnr: string
  flightNumber: string
  origin: string
  destination: string
  departureDate: string
}): { subject: string; html: string; whatsappText: string } {
  const { travelerName, pnr, flightNumber, origin, destination, departureDate } = opts

  const subject = `✈️ Passport & Visa Verification Notice — ${flightNumber} | PNR: ${pnr}`
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#0f172a;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);">
        <tr><td style="background:linear-gradient(135deg,#091936 0%,#1e3a8a 100%);padding:28px 36px;color:#fff;">
          <p style="margin:0;font-size:22px;font-weight:900;color:#fff;">velo<span style="color:#38bdf8;">trav</span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(234,179,8,0.2);color:#fde047;padding:4px 10px;border-radius:20px;margin-left:8px;">INTERNATIONAL TRAVEL</span>
          </p>
          <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;">Passport & Visa Verification Notice</p>
        </td></tr>
        <tr><td style="padding:28px 36px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Dear <strong>${travelerName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.6;">
            Your web check-in process for international flight <strong>${flightNumber}</strong> (${origin} → ${destination}) on <strong>${departureDate}</strong> has been initiated.
          </p>
          <div style="background:#fefce8;border:1px solid #fef08a;border-radius:14px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:14px;color:#854d0e;font-weight:800;">🌐 International Travel Requirement (Visa Check):</p>
            <p style="margin:0;font-size:13px;color:#713f12;line-height:1.5;">
              Per international aviation safety and visa regulations, your <strong>Passport & Visa must be physically verified</strong> at the airport check-in counter prior to gate boarding.
            </p>
          </div>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
            <tr><td style="color:#64748b;font-size:12px;">PNR</td><td style="color:#0f172a;font-weight:800;font-family:monospace;">${pnr}</td></tr>
            <tr><td style="color:#64748b;font-size:12px;">FLIGHT</td><td style="color:#0f172a;font-weight:700;">${flightNumber}</td></tr>
            <tr><td style="color:#64748b;font-size:12px;">ROUTE</td><td style="color:#0f172a;font-weight:700;">${origin} → ${destination}</td></tr>
            <tr><td style="color:#64748b;font-size:12px;">DATE</td><td style="color:#0f172a;font-weight:700;">${departureDate}</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
            📌 <strong>Next Steps:</strong> Please present your PNR (<strong>${pnr}</strong>), valid Passport, and travel Visa at the airport airline counter to collect your physical boarding pass. Have a safe international flight!
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:18px 36px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">VeloTrav Corporate Travel Desk · International Operations</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const whatsappText =
    `🌐 *VeloTrav — International Travel Notice*\n\n` +
    `Hi *${travelerName}*,\n` +
    `Web check-in process initiated for your international flight *${flightNumber}* (*${origin}* → *${destination}*) on *${departureDate}*.\n\n` +
    `⚠️ *Passport & Visa Requirement:*\n` +
    `Per international airline rules, your **Passport & Visa** must be physically verified at the airport counter.\n\n` +
    `📄 Please present your PNR (*${pnr}*), Passport, and Visa at the airport counter to receive your physical boarding pass.\n\n` +
    `_Have a safe international flight!_ ✈️🌍`

  return { subject, html, whatsappText }
}
