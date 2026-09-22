import { FlightBooking, HotelBooking } from '@/types'

export function preFlightReminderEmail(booking: FlightBooking): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const passUrl = `${appUrl}/pass/${booking.pnr}`

  return {
    subject: `✈️ Reminder: Your flight ${booking.flight_number} departs today!`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#0f172a">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.3)">
        <tr><td style="background:linear-gradient(135deg, #091936 0%, #1e3a8a 100%);padding:28px 32px;color:#fff">
          <p style="margin:0;font-size:22px;font-weight:900">velo<span style="color:#38bdf8">trav</span> <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:4px 10px;border-radius:20px;margin-left:8px">FLIGHT REMINDER</span></p>
          <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;font-weight:500">Corporate Travel Operations · Pre-Departure Alert</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:32px;border-bottom:2px dashed #cbd5e1">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="35%"><p style="margin:0;font-size:36px;font-weight:900;color:#0f172a">${booking.origin}</p></td>
              <td width="30%" align="center"><p style="margin:0;font-size:20px;color:#2563eb">✈️</p><p style="margin:4px 0 0;font-size:11px;font-weight:800;color:#2563eb">${booking.flight_number}</p></td>
              <td width="35%" align="right"><p style="margin:0;font-size:36px;font-weight:900;color:#0f172a">${booking.destination}</p></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">Your flight is coming up! Here are your travel details:</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px">
            <tr><td style="color:#1e40af;font-size:13px;border-bottom:1px solid #bfdbfe">PNR</td><td style="color:#1e3a8a;font-weight:800;font-size:15px;border-bottom:1px solid #bfdbfe">${booking.pnr}</td></tr>
            <tr><td style="color:#1e40af;font-size:13px;border-bottom:1px solid #bfdbfe">Flight Date</td><td style="color:#1e3a8a;font-weight:700;border-bottom:1px solid #bfdbfe">${booking.departure_date}</td></tr>
            <tr><td style="color:#1e40af;font-size:13px;border-bottom:1px solid #bfdbfe">Departure Time</td><td style="color:#1e3a8a;font-weight:700;border-bottom:1px solid #bfdbfe">${booking.departure_time || 'Check your ticket'}</td></tr>
            ${booking.gate ? `<tr><td style="color:#1e40af;font-size:13px;border-bottom:1px solid #bfdbfe">Gate</td><td style="color:#1e3a8a;font-weight:700;border-bottom:1px solid #bfdbfe">${booking.gate}</td></tr>` : ''}
            ${booking.terminal ? `<tr><td style="color:#1e40af;font-size:13px">Terminal</td><td style="color:#1e3a8a;font-weight:700">${booking.terminal}</td></tr>` : ''}
          </table>
          <div style="text-align:center;margin:28px 0">
            <a href="${passUrl}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:16px 36px;border-radius:14px;box-shadow:0 8px 20px rgba(37,99,235,0.35)">🎟️ OPEN DIGITAL BOARDING PASS →</a>
          </div>
          <p style="margin:0;color:#64748b;font-size:12px">Have a safe and pleasant journey!</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:12px;text-align:center">VeloTrav Corporate Travel · Pre-Departure Reminder</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function postFlightFeedbackEmail(booking: FlightBooking, feedbackUrl: string): { subject: string; html: string } {
  return {
    subject: `⭐ How was your flight ${booking.flight_number}? Rate your experience`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#0f172a">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.3)">
        <tr><td style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);padding:28px 32px;color:#fff">
          <p style="margin:0;font-size:22px;font-weight:900">velo<span style="color:#c4b5fd">trav</span> <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(196,181,253,0.2);color:#c4b5fd;padding:4px 10px;border-radius:20px;margin-left:8px">FEEDBACK</span></p>
          <p style="margin:4px 0 0;font-size:12px;color:#c4b5fd;font-weight:500">We'd love to hear about your experience</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">We hope you had a pleasant journey on flight <strong>${booking.flight_number}</strong> (${booking.origin} → ${booking.destination}) on ${booking.departure_date}.</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">Your feedback helps us improve our travel services. Please take a moment to rate your experience:</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${feedbackUrl}" style="display:inline-block;background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:16px 36px;border-radius:14px;box-shadow:0 8px 20px rgba(79,70,229,0.35)">⭐ Rate Your Flight Experience →</a>
          </div>
          <p style="margin:0;color:#64748b;font-size:12px">It only takes 30 seconds. Thank you!</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:12px;text-align:center">VeloTrav Corporate Travel · Feedback</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function hotelCheckInReminderEmail(booking: HotelBooking): { subject: string; html: string } {
  return {
    subject: `🏨 Welcome! Your check-in at ${booking.hotel_name} is today`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#16a34a;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">🏨 Hotel Check-in Today!</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280">Your stay at <strong>${booking.hotel_name}</strong> begins today! Here are your reservation details:</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px">
            <tr><td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Hotel</td><td style="color:#14532d;font-weight:700;border-bottom:1px solid #bbf7d0">${booking.hotel_name}</td></tr>
            <tr><td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Booking Ref</td><td style="color:#14532d;font-weight:700;font-size:16px;border-bottom:1px solid #bbf7d0">${booking.booking_ref}</td></tr>
            <tr><td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Check-in</td><td style="color:#14532d;font-weight:600;border-bottom:1px solid #bbf7d0">${booking.check_in_date}</td></tr>
            <tr><td style="color:#166534;font-size:13px;border-bottom:1px solid #bbf7d0">Check-out</td><td style="color:#14532d;font-weight:600;border-bottom:1px solid #bbf7d0">${booking.check_out_date}</td></tr>
            ${booking.room_type ? `<tr><td style="color:#166534;font-size:13px">Room</td><td style="color:#14532d;font-weight:600">${booking.room_type} × ${booking.num_rooms}</td></tr>` : ''}
          </table>
          <p style="margin:0;color:#6b7280;font-size:13px">Enjoy your stay! For any assistance, please contact the Corporate Travel Desk.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">Corporate Travel Desk · Check-in Reminder</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function hotelCheckOutReminderEmail(booking: HotelBooking): { subject: string; html: string } {
  return {
    subject: `👋 Reminder: Check-out from ${booking.hotel_name} is today`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#d97706;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">👋 Check-out Reminder</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#374151">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#6b7280">We hope you enjoyed your stay! Today is your check-out day from <strong>${booking.hotel_name}</strong>.</p>
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px">
            <tr><td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Hotel</td><td style="color:#78350f;font-weight:700;border-bottom:1px solid #fde68a">${booking.hotel_name}</td></tr>
            <tr><td style="color:#92400e;font-size:13px;border-bottom:1px solid #fde68a">Booking Ref</td><td style="color:#78350f;font-weight:700;border-bottom:1px solid #fde68a">${booking.booking_ref}</td></tr>
            <tr><td style="color:#92400e;font-size:13px">Check-out Date</td><td style="color:#78350f;font-weight:700">${booking.check_out_date}</td></tr>
          </table>
          <p style="margin:0;color:#6b7280;font-size:13px">Please ensure you complete the check-out process. Safe travels ahead!</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;color:#9ca3af;font-size:12px">Corporate Travel Desk · Check-out Reminder</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function hotelFeedbackEmail(booking: HotelBooking, feedbackUrl: string): { subject: string; html: string } {
  return {
    subject: `⭐ How was your stay at ${booking.hotel_name}? Rate your experience`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#0f172a">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.3)">
        <tr><td style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);padding:28px 32px;color:#fff">
          <p style="margin:0;font-size:22px;font-weight:900">velo<span style="color:#c4b5fd">trav</span> <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:rgba(196,181,253,0.2);color:#c4b5fd;padding:4px 10px;border-radius:20px;margin-left:8px">FEEDBACK</span></p>
          <p style="margin:4px 0 0;font-size:12px;color:#c4b5fd;font-weight:500">We'd love to hear about your hotel experience</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Dear <strong>${booking.traveler_name}</strong>,</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">We hope you had a wonderful stay at <strong>${booking.hotel_name}</strong> (${booking.check_in_date} to ${booking.check_out_date}).</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.5">Your feedback helps us choose the best hotels for our travelers. Please take a moment to rate your experience:</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${feedbackUrl}" style="display:inline-block;background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:16px 36px;border-radius:14px;box-shadow:0 8px 20px rgba(79,70,229,0.35)">⭐ Rate Your Hotel Experience →</a>
          </div>
          <p style="margin:0;color:#64748b;font-size:12px">It only takes 30 seconds. Thank you!</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:12px;text-align:center">VeloTrav Corporate Travel · Feedback</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
