import { HotelBooking } from '@/types'

export function hotelConfirmationRequestEmail(
  booking: HotelBooking,
  confirmUrl: string
): { subject: string; html: string } {
  return {
    subject: `Action Required: Please Confirm Booking ${booking.booking_ref}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#0f766e;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">🏨 Booking Confirmation Required</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#374151">Dear <strong>${booking.hotel_name} Team</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280">We have made a booking at your hotel. Please confirm receipt of payment and the booking by clicking the button below.</p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="color:#0f766e;font-size:13px;border-bottom:1px solid #99f6e4">Booking Reference</td>
              <td style="color:#134e4a;font-weight:700;font-size:16px;border-bottom:1px solid #99f6e4">${booking.booking_ref}</td>
            </tr>
            <tr>
              <td style="color:#0f766e;font-size:13px;border-bottom:1px solid #99f6e4">Guest Name</td>
              <td style="color:#134e4a;font-weight:600;border-bottom:1px solid #99f6e4">${booking.traveler_name}</td>
            </tr>
            <tr>
              <td style="color:#0f766e;font-size:13px;border-bottom:1px solid #99f6e4">Check-in</td>
              <td style="color:#134e4a;font-weight:600;border-bottom:1px solid #99f6e4">${booking.check_in_date}</td>
            </tr>
            <tr>
              <td style="color:#0f766e;font-size:13px;border-bottom:1px solid #99f6e4">Check-out</td>
              <td style="color:#134e4a;font-weight:600;border-bottom:1px solid #99f6e4">${booking.check_out_date}</td>
            </tr>
            ${booking.room_type ? `
            <tr>
              <td style="color:#0f766e;font-size:13px;border-bottom:1px solid #99f6e4">Room Type</td>
              <td style="color:#134e4a;font-weight:600;border-bottom:1px solid #99f6e4">${booking.room_type}</td>
            </tr>` : ''}
            <tr>
              <td style="color:#0f766e;font-size:13px">Number of Rooms</td>
              <td style="color:#134e4a;font-weight:600">${booking.num_rooms}</td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0">
              <a href="${confirmUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:700">
                ✓ Confirm This Booking
              </a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;color:#6b7280;font-size:13px">Or copy and paste this link: <a href="${confirmUrl}" style="color:#0f766e">${confirmUrl}</a></p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:13px">You can also reply to this email or WhatsApp message with "Confirmed" to acknowledge.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">
          Corporate Travel Desk · Please confirm within 24 hours.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function hotelConfirmedTravelerEmail(booking: HotelBooking): { subject: string; html: string } {
  return {
    subject: `Hotel Confirmed – ${booking.hotel_name} | ${booking.booking_ref}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#16a34a;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">✅ Hotel Booking Confirmed</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#374151">Great news! <strong>${booking.hotel_name}</strong> has confirmed your hotel booking. Here are your accommodation details:</p>

          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Hotel</td>
              <td style="color:#14532d;font-weight:700;border-bottom:1px solid #bbf7d0">${booking.hotel_name}</td>
            </tr>
            <tr>
              <td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Booking Ref</td>
              <td style="color:#14532d;font-weight:700;font-size:16px;border-bottom:1px solid #bbf7d0">${booking.booking_ref}</td>
            </tr>
            <tr>
              <td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Check-in</td>
              <td style="color:#14532d;font-weight:600;border-bottom:1px solid #bbf7d0">${booking.check_in_date}</td>
            </tr>
            <tr>
              <td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Check-out</td>
              <td style="color:#14532d;font-weight:600;border-bottom:1px solid #bbf7d0">${booking.check_out_date}</td>
            </tr>
            ${booking.room_type ? `
            <tr>
              <td style="color:#166534;font-size:13px">Room Type</td>
              <td style="color:#14532d;font-weight:600">${booking.room_type} × ${booking.num_rooms}</td>
            </tr>` : ''}
          </table>

          <p style="margin:0;color:#6b7280;font-size:13px">Enjoy your stay! For any changes, please contact the Corporate Travel Desk.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">
          Corporate Travel Desk · Automated confirmation
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
