import { FlightBooking } from '@/types'

export function flightDelayEmail(booking: FlightBooking): { subject: string; html: string } {
  const delayHr = Math.floor(booking.delay_minutes / 60)
  const delayMin = booking.delay_minutes % 60
  const delayText = delayHr > 0 ? `${delayHr}h ${delayMin}m` : `${delayMin} minutes`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passUrl = `${appUrl}/pass/${booking.pnr}`

  return {
    subject: `⚠️ REAL-TIME DELAY ALERT: Flight ${booking.flight_number} delayed by ${delayText}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#0f172a">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.3)">
        <tr><td style="background:linear-gradient(135deg, #d97706 0%, #b45309 100%);padding:28px 32px;color:#fff">
          <p style="margin:0;font-size:20px;font-weight:900">⚠️ REAL-TIME FLIGHT DELAY ALERT</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.9">Flight radar detected departure delay update</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">
            Your flight <strong>${booking.flight_number}</strong> (${booking.origin} → ${booking.destination}) on <strong>${booking.departure_date}</strong> is currently delayed by <strong style="color:#d97706;font-size:16px">${delayText}</strong>.
          </p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:24px">
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">PNR Code</td>
              <td style="color:#78350f;font-weight:800;font-size:15px;border-bottom:1px solid #fde68a font-mono">${booking.pnr}</td>
            </tr>
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Flight Number</td>
              <td style="color:#78350f;font-weight:700;border-bottom:1px solid #fde68a">${booking.flight_number}</td>
            </tr>
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Real-Time Delay</td>
              <td style="color:#dc2626;font-weight:900;border-bottom:1px solid #fde68a">+${delayText}</td>
            </tr>
            ${booking.gate ? `
            <tr>
              <td style="color:#92400e;font-size:13px">Gate / Terminal</td>
              <td style="color:#78350f;font-weight:700">${booking.gate}${booking.terminal ? ` · Terminal ${booking.terminal}` : ''}</td>
            </tr>` : ''}
          </table>

          <div style="text-align:center;margin:28px 0">
            <a href="${passUrl}" style="display:inline-block;background:linear-gradient(135deg, #d97706 0%, #b45309 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 32px;border-radius:12px;box-shadow:0 6px 16px rgba(217,119,6,0.35)">
              📱 VIEW LIVE UPDATED BOARDING PASS →
            </a>
          </div>

          <p style="margin:0;color:#64748b;font-size:12px">Your digital boarding pass updates automatically in real-time. Please keep an eye on airport gate displays.</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:12px;text-align:center">
          VeloTrav Corporate Travel Radar · 24/7 Monitoring Engine
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function flightCancellationEmail(booking: FlightBooking): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passUrl = `${appUrl}/pass/${booking.pnr}`

  return {
    subject: `🚨 URGENT: Flight ${booking.flight_number} Cancelled – PNR ${booking.pnr}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#0f172a">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.3)">
        <tr><td style="background:#dc2626;padding:28px 32px;color:#fff">
          <p style="margin:0;font-size:20px;font-weight:900">🚨 URGENT: FLIGHT CANCELLED</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.9">Flight radar update</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">
            We regret to inform you that flight <strong>${booking.flight_number}</strong> (${booking.origin} → ${booking.destination}) scheduled for <strong>${booking.departure_date}</strong> has been <strong style="color:#dc2626">CANCELLED</strong> by the airline.
          </p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:24px">
            <tr>
              <td style="color:#991b1b;font-size:13px;border-bottom:1px solid #fecaca">PNR Code</td>
              <td style="color:#7f1d1d;font-weight:800;font-size:15px;border-bottom:1px solid #fecaca font-mono">${booking.pnr}</td>
            </tr>
            <tr>
              <td style="color:#991b1b;font-size:13px;border-bottom:1px solid #fecaca">Flight Number</td>
              <td style="color:#7f1d1d;font-weight:700;border-bottom:1px solid #fecaca">${booking.flight_number}</td>
            </tr>
            <tr>
              <td style="color:#991b1b;font-size:13px">Route</td>
              <td style="color:#7f1d1d;font-weight:700">${booking.origin} → ${booking.destination}</td>
            </tr>
          </table>

          <div style="text-align:center;margin:28px 0">
            <a href="${passUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 32px;border-radius:12px;box-shadow:0 6px 16px rgba(220,38,38,0.35)">
              📱 VIEW PASS STATUS →
            </a>
          </div>

          <p style="margin:0;color:#64748b;font-size:12px">Please contact our corporate travel desk immediately for instant rebooking options.</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:12px;text-align:center">
          VeloTrav Corporate Travel Radar · Emergency Rebooking Service
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
