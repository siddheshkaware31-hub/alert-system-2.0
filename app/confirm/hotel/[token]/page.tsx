import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default async function HotelConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let result: { confirmed?: boolean; already_confirmed?: boolean; booking_ref?: string; hotel_name?: string; error?: string } = {}

  try {
    const res = await fetch(`${appUrl}/api/hotels/confirm/${token}`, { cache: 'no-store' })
    result = await res.json()
  } catch {
    result = { error: 'Unable to process confirmation at this time.' }
  }

  if (result.error && !result.confirmed && !result.already_confirmed) {
    return (
      <ConfirmPage
        icon={<XCircle size={56} />}
        title="Booking Not Found"
        message="This confirmation link is invalid or has expired. Please contact the travel desk."
        color="red"
      />
    )
  }

  if (result.already_confirmed) {
    return (
      <ConfirmPage
        icon={<CheckCircle2 size={56} />}
        title="Already Confirmed"
        message={`Booking ${result.booking_ref} was already confirmed. Thank you!`}
        color="green"
      />
    )
  }

  if (result.confirmed) {
    return (
      <ConfirmPage
        icon={<CheckCircle2 size={56} />}
        title="Booking Confirmed"
        message={`Thank you! Booking ${result.booking_ref}${result.hotel_name ? ` at ${result.hotel_name}` : ''} has been confirmed. The guest has been notified.`}
        color="green"
      />
    )
  }

  return (
    <ConfirmPage
      icon={<AlertTriangle size={56} />}
      title="Something Went Wrong"
      message="Please try again or contact the travel desk."
      color="yellow"
    />
  )
}

function ConfirmPage({ icon, title, message, color }: { icon: React.ReactNode; title: string; message: string; color: 'green' | 'red' | 'yellow' }) {
  const colors = {
    green: { card: 'bg-green-50 border-green-200 text-green-900', icon: 'text-green-600' },
    red: { card: 'bg-red-50 border-red-200 text-red-900', icon: 'text-red-600' },
    yellow: { card: 'bg-yellow-50 border-yellow-200 text-yellow-900', icon: 'text-yellow-600' },
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`max-w-md w-full mx-4 rounded-2xl border p-8 text-center shadow-sm ${colors[color].card}`}>
        <div className={`flex justify-center mb-4 ${colors[color].icon}`}>{icon}</div>
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-base opacity-80 leading-relaxed">{message}</p>
        <p className="text-sm opacity-60 mt-6">Corporate Travel Desk</p>
      </div>
    </div>
  )
}
