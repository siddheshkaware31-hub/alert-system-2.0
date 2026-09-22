import { FlightBooking } from '@/types'

export function flightConfirmationEmail(booking: FlightBooking): { subject: string; html: string } {
  const origin = booking.origin || 'ORIGIN'
  const destination = booking.destination || 'DEST'
  const pnr = booking.pnr || 'PNR-2026'

  const seat = booking.seat || '14B'
  const gate = booking.gate || 'B12'
  const terminal = booking.terminal || 'T3'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passUrl = `${appUrl}/pass/${pnr}`

  return {
    subject: `🎟️ Boarding Pass Generated – PNR ${pnr} (${booking.flight_number})`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VeloTrav Digital Boarding Pass</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background-color:#0f172a;">
    <tr>
      <td align="center">
        <!-- Main Boarding Pass Wrapper -->
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);">
          
          <!-- Top Corporate Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #091936 0%, #1e3a8a 100%);padding:28px 36px;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                      velo<span style="color:#38bdf8;">trav</span> <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:4px 10px;border-radius:20px;margin-left:8px;">BOARDING PASS GENERATED</span>
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;font-weight:500;">Corporate Travel Operations · Automated E-Ticket</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;">CONFIRMED</p>
                    <p style="margin:2px 0 0;font-size:18px;font-weight:900;color:#38bdf8;letter-spacing:1px;">${pnr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Flight Route Banner -->
          <tr>
            <td style="background:#f8fafc;padding:32px 36px;border-bottom:2px dashed #cbd5e1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="35%">
                    <p style="margin:0;font-size:36px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${origin.substring(0, 3).toUpperCase()}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-weight:600;">${origin}</p>
                  </td>
                  <td width="30%" align="center">
                    <p style="margin:0;font-size:20px;color:#2563eb;">✈️</p>
                    <p style="margin:4px 0 0;font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">${booking.flight_number}</p>
                  </td>
                  <td width="35%" align="right">
                    <p style="margin:0;font-size:36px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${destination.substring(0, 3).toUpperCase()}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-weight:600;">${destination}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Flight Details Table Grid -->
          <tr>
            <td style="padding:32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">PASSENGER NAME</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#0f172a;">${booking.traveler_name}</p>
                  </td>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">FLIGHT DATE</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#0f172a;">${booking.departure_date}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">DEPARTURE TIME</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#2563eb;">${booking.departure_time || '10:30 AM'}</p>
                  </td>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">TICKET NUMBER</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#0f172a;">${booking.ticket_number || 'ETKT-982347102'}</p>
                  </td>
                </tr>
                <tr>
                  <td width="33%" style="padding-bottom:10px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">SEAT</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:#0f172a;">${seat}</p>
                  </td>
                  <td width="33%" style="padding-bottom:10px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">GATE</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:#0f172a;">${gate}</p>
                  </td>
                  <td width="34%" style="padding-bottom:10px;">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">TERMINAL</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:#0f172a;">${terminal}</p>
                  </td>
                </tr>
              </table>

              <!-- 1-Click Live Boarding Pass Button -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${passUrl}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:16px 36px;border-radius:14px;box-shadow:0 8px 20px rgba(37,99,235,0.35);">
                  🎟️ OPEN LIVE DIGITAL BOARDING PASS →
                </a>
              </div>

              <!-- Barcode Footer -->
              <div style="background:#f1f5f9;border-radius:16px;padding:20px;text-align:center;border:1px solid #e2e8f0;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">GATE SCANNER BARCODE</p>
                <div style="letter-spacing:4px;font-family:monospace;font-size:26px;font-weight:bold;color:#0f172a;line-height:1;">
                  ||||| | |||||| ||| ||||||| |||| ||||||
                </div>
                <p style="margin:8px 0 0;font-size:11px;font-family:monospace;color:#94a3b8;">${pnr}-${booking.flight_number}-${seat}</p>
              </div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;font-weight:500;">
                Track live delay status & gate updates on your Digital Boarding Pass at <a href="${passUrl}" style="color:#2563eb;font-weight:700;">${passUrl}</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
}
