import { FlightBooking } from '@/types'

export function flightDelayEmail(booking: FlightBooking): { subject: string; html: string } {
  const delayHr = Math.floor(booking.delay_minutes / 60)
  const delayMin = booking.delay_minutes % 60
  const delayText = delayHr > 0 ? `${delayHr}h ${delayMin}m` : `${delayMin} minutes`

  return {
    subject: `⚠️ Flight Delay Alert – ${booking.flight_number} | ${booking.pnr}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#f59e0b;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚠️ Flight Delayed</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#374151">Your flight <strong>${booking.flight_number}</strong> (${booking.origin} → ${booking.destination}) on <strong>${booking.departure_date}</strong> has been delayed by approximately <strong>${delayText}</strong>.</p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">PNR</td>
              <td style="color:#78350f;font-weight:700;border-bottom:1px solid #fde68a">${booking.pnr}</td>
            </tr>
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Flight</td>
              <td style="color:#78350f;font-weight:600;border-bottom:1px solid #fde68a">${booking.flight_number}</td>
            </tr>
            <tr>
              <td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Status</td>
              <td style="color:#dc2626;font-weight:700;border-bottom:1px solid #fde68a">Delayed by ${delayText}</td>
            </tr>
            ${booking.gate ? `
            <tr>
              <td style="color:#92400e;font-size:13px">Gate</td>
              <td style="color:#78350f;font-weight:600">${booking.gate}${booking.terminal ? ` · Terminal ${booking.terminal}` : ''}</td>
            </tr>` : ''}
          </table>

          <p style="margin:0;color:#6b7280;font-size:13px">Please allow extra time and stay updated at the airport. We will send further alerts if the status changes.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">
          Corporate Travel Desk · Automated alert
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function flightCancellationEmail(booking: FlightBooking): { subject: string; html: string } {
  return {
    subject: `🚨 Flight Cancelled – ${booking.flight_number} | ${booking.pnr}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#dc2626;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">🚨 Flight Cancelled</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#374151">We regret to inform you that your flight <strong>${booking.flight_number}</strong> (${booking.origin} → ${booking.destination}) scheduled for <strong>${booking.departure_date}</strong> has been <strong style="color:#dc2626">cancelled</strong>.</p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="color:#991b1b;font-size:13px;border-bottom:1px solid #fecaca">PNR</td>
              <td style="color:#7f1d1d;font-weight:700;border-bottom:1px solid #fecaca">${booking.pnr}</td>
            </tr>
            <tr>
              <td style="color:#991b1b;font-size:13px;border-bottom:1px solid #fecaca">Flight</td>
              <td style="color:#7f1d1d;font-weight:600;border-bottom:1px solid #fecaca">${booking.flight_number}</td>
            </tr>
            <tr>
              <td style="color:#991b1b;font-size:13px">Route</td>
              <td style="color:#7f1d1d;font-weight:600">${booking.origin} → ${booking.destination}</td>
            </tr>
          </table>

          <p style="margin:0;color:#374151">Please contact our travel desk immediately for rebooking options. We apologize for the inconvenience.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">
          Corporate Travel Desk · Automated alert
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
