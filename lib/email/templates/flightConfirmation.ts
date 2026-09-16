import { FlightBooking } from '@/types'

export function flightConfirmationEmail(booking: FlightBooking): { subject: string; html: string } {
  return {
    subject: `Flight Confirmation – ${booking.pnr} | ${booking.flight_number}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#1a56db;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">✈ Flight Booking Confirmed</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280">Your flight booking has been confirmed. Here are your travel details:</p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">PNR / Booking Ref</td>
              <td style="color:#111827;font-weight:700;font-size:16px;border-bottom:1px solid #e5e7eb">${booking.pnr}</td>
            </tr>
            ${booking.ticket_number ? `
            <tr>
              <td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Ticket Number</td>
              <td style="color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb">${booking.ticket_number}</td>
            </tr>` : ''}
            <tr>
              <td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Flight</td>
              <td style="color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb">${booking.flight_number}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Route</td>
              <td style="color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb">${booking.origin} → ${booking.destination}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb">Date</td>
              <td style="color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb">${booking.departure_date}</td>
            </tr>
            ${booking.departure_time ? `
            <tr>
              <td style="color:#6b7280;font-size:13px">Departure</td>
              <td style="color:#111827;font-weight:600">${booking.departure_time}${booking.arrival_time ? ` → ${booking.arrival_time}` : ''}</td>
            </tr>` : ''}
          </table>

          <p style="margin:0;color:#6b7280;font-size:13px">We will notify you of any flight status changes. Safe travels!</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">
          Corporate Travel Desk · This is an automated message, please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
