import { FlightBooking } from '@/types'

/**
 * Boarding Pass Dispatch Email
 * Sent automatically 24h before departure (or on-demand) as a virtual employee
 * replacing the manual step of employees downloading/forwarding the boarding pass.
 */
export function boardingPassEmail(booking: FlightBooking): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passUrl = `${appUrl}/pass/${booking.pnr}`

  const origin = (booking.origin || 'ORIGIN').substring(0, 3).toUpperCase()
  const destination = (booking.destination || 'DEST').substring(0, 3).toUpperCase()
  const seat = booking.seat || '—'
  const gate = booking.gate || '—'
  const terminal = booking.terminal || '—'

  return {
    subject: `🎟️ Your Boarding Pass is Ready – ${booking.flight_number} | PNR: ${booking.pnr}`,
    html: `<!DOCTYPE html>
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
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #091936 0%, #1e3a8a 100%);padding:28px 36px;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                      velo<span style="color:#38bdf8;">trav</span>
                      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:4px 10px;border-radius:20px;margin-left:8px;">BOARDING PASS READY</span>
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;font-weight:500;">Corporate Travel Operations · Automated Virtual Check-In</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;">PNR</p>
                    <p style="margin:2px 0 0;font-size:20px;font-weight:900;color:#38bdf8;letter-spacing:2px;font-family:monospace;">${booking.pnr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 36px 0;">
              <p style="margin:0;font-size:15px;color:#1e293b;">Dear <strong>${booking.traveler_name}</strong>,</p>
              <p style="margin:10px 0 0;font-size:13px;color:#475569;line-height:1.6;">
                Your boarding pass for flight <strong>${booking.flight_number}</strong> has been automatically generated and dispatched by the VeloTrav Virtual Travel Desk.
                You no longer need to visit the airline website — simply open your digital boarding pass using the button below.
              </p>
            </td>
          </tr>

          <!-- Flight Route Banner -->
          <tr>
            <td style="background:#f8fafc;padding:28px 36px;margin-top:20px;border-top:1px solid #e2e8f0;border-bottom:2px dashed #cbd5e1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="35%">
                    <p style="margin:0;font-size:40px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${origin}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;">${booking.origin}</p>
                  </td>
                  <td width="30%" align="center">
                    <p style="margin:0;font-size:22px;color:#2563eb;">✈️</p>
                    <p style="margin:4px 0 0;font-size:12px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">${booking.flight_number}</p>
                  </td>
                  <td width="35%" align="right">
                    <p style="margin:0;font-size:40px;font-weight:900;color:#0f172a;letter-spacing:-1px;">${destination}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;">${booking.destination}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details Grid -->
          <tr>
            <td style="padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding-bottom:18px;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;">PASSENGER NAME</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#0f172a;">${booking.traveler_name}</p>
                  </td>
                  <td width="50%" style="padding-bottom:18px;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;">FLIGHT DATE</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#0f172a;font-family:monospace;">${booking.departure_date}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-bottom:18px;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;">DEPARTURE TIME</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#2563eb;">${booking.departure_time || '—'}</p>
                  </td>
                  <td width="50%" style="padding-bottom:18px;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;">TICKET NUMBER</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#0f172a;font-family:monospace;">${booking.ticket_number || '—'}</p>
                  </td>
                </tr>
              </table>

              <!-- Seat / Gate / Terminal Row -->
              <table width="100%" cellpadding="14" cellspacing="0" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;text-align:center;margin-bottom:28px;">
                <tr>
                  <td width="33%" style="border-right:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">SEAT</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#0f172a;">${seat}</p>
                  </td>
                  <td width="33%" style="border-right:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">GATE</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#2563eb;">${gate}</p>
                  </td>
                  <td width="34%">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">TERMINAL</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#0f172a;">${terminal}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${passUrl}"
                   style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:18px 44px;border-radius:16px;box-shadow:0 8px 20px rgba(37,99,235,0.4);letter-spacing:0.3px;">
                  🎟️ OPEN YOUR BOARDING PASS →
                </a>
              </div>
              <p style="margin:0;text-align:center;font-size:11px;color:#94a3b8;">
                Live gate &amp; delay updates refresh automatically on your boarding pass.
              </p>
            </td>
          </tr>

          <!-- Barcode Strip -->
          <tr>
            <td style="background:#0f172a;padding:20px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1.5px;">GATE SCANNER CODE</p>
              <div style="letter-spacing:5px;font-family:monospace;font-size:24px;font-weight:bold;color:#ffffff;line-height:1;">
                ||||| | |||||| ||| ||||||| |||| ||||||
              </div>
              <p style="margin:8px 0 0;font-size:11px;font-family:monospace;color:#475569;">${booking.pnr} • ${booking.flight_number} • SEAT ${seat}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;font-weight:500;">
                ✅ Dispatched by <strong>VeloTrav Virtual Travel Desk</strong> · No action needed from you<br>
                <a href="${passUrl}" style="color:#2563eb;font-weight:700;font-size:12px;">View Live Boarding Pass</a>
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
