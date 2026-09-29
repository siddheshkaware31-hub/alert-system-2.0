import { FlightBooking } from '@/types'

export function boardingPassPdfEmail(booking: FlightBooking): { subject: string; html: string } {
  const origin = (booking.origin || '').substring(0, 3).toUpperCase()
  const dest = (booking.destination || '').substring(0, 3).toUpperCase()

  return {
    subject: `🎟️ Your Official Boarding Pass is Ready — ${booking.flight_number} | PNR: ${booking.pnr}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#0f172a;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#091936 0%,#1e3a8a 100%);padding:28px 36px;color:#fff;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <p style="margin:0;font-size:22px;font-weight:900;color:#fff;">velo<span style="color:#38bdf8;">trav</span>
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:4px 10px;border-radius:20px;margin-left:8px;">BOARDING PASS</span>
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;font-weight:500;">Virtual Travel Desk · Auto Web Check-in Complete</p>
            </td>
            <td align="right">
              <p style="margin:0;font-size:10px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;">PNR</p>
              <p style="margin:2px 0 0;font-size:20px;font-weight:900;color:#38bdf8;letter-spacing:2px;font-family:monospace;">${booking.pnr}</p>
            </td>
          </tr></table>
        </td></tr>

        <!-- Route -->
        <tr><td style="background:#f8fafc;padding:28px 36px;border-bottom:2px dashed #cbd5e1;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="35%">
              <p style="margin:0;font-size:40px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${origin}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;">${booking.origin}</p>
            </td>
            <td width="30%" align="center">
              <p style="margin:0;font-size:22px;">✈️</p>
              <p style="margin:4px 0 0;font-size:12px;font-weight:800;color:#2563eb;text-transform:uppercase;">${booking.flight_number}</p>
            </td>
            <td width="35%" align="right">
              <p style="margin:0;font-size:40px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${dest}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;">${booking.destination}</p>
            </td>
          </tr></table>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:28px 36px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.6;">
            Your web check-in for flight <strong>${booking.flight_number}</strong> on <strong>${booking.departure_date}</strong> has been completed automatically by the VeloTrav Virtual Travel Desk.
            <br><br>
            <strong>Your official airline boarding pass is attached to this email as a PDF.</strong> Please open and save it to your phone or print it before reaching the airport.
          </p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;margin-bottom:24px;">
            <tr><td style="color:#1e40af;font-size:12px;border-bottom:1px solid #bfdbfe;font-weight:600;">PASSENGER</td><td style="color:#1e3a8a;font-weight:800;">${booking.traveler_name}</td></tr>
            <tr><td style="color:#1e40af;font-size:12px;border-bottom:1px solid #bfdbfe;font-weight:600;">PNR</td><td style="color:#1e3a8a;font-weight:800;font-family:monospace;">${booking.pnr}</td></tr>
            <tr><td style="color:#1e40af;font-size:12px;border-bottom:1px solid #bfdbfe;font-weight:600;">FLIGHT DATE</td><td style="color:#1e3a8a;font-weight:700;">${booking.departure_date}</td></tr>
            <tr><td style="color:#1e40af;font-size:12px;border-bottom:1px solid #bfdbfe;font-weight:600;">DEPARTURE</td><td style="color:#1e3a8a;font-weight:700;">${booking.departure_time || '—'}</td></tr>
            ${booking.gate ? `<tr><td style="color:#1e40af;font-size:12px;border-bottom:1px solid #bfdbfe;font-weight:600;">GATE</td><td style="color:#1e3a8a;font-weight:700;">${booking.gate}</td></tr>` : ''}
            ${booking.terminal ? `<tr><td style="color:#1e40af;font-size:12px;font-weight:600;">TERMINAL</td><td style="color:#1e3a8a;font-weight:700;">${booking.terminal}</td></tr>` : ''}
          </table>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
            <p style="margin:0;font-size:13px;color:#14532d;font-weight:700;">📎 Official boarding pass PDF is attached above ↑</p>
            <p style="margin:4px 0 0;font-size:12px;color:#166534;">Open the attachment and save it to your phone or print before arrival at the airport.</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:18px 36px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            ✅ Auto-dispatched by <strong>VeloTrav Virtual Travel Desk</strong> · No action needed from your side
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
