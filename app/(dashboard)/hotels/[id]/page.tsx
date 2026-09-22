import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HotelBooking, NotificationLog } from '@/types'
import { Check, Minus, ArrowLeft, Sparkles, Plane, Building2, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const [
    { data: booking, error: bookingErr },
    { data: logs },
    { data: messages }
  ] = await Promise.all([
    db.from('hotel_bookings').select('*').eq('id', id).single(),
    db.from('notification_logs').select('*').eq('entity_id', id).order('sent_at', { ascending: false }),
    db.from('hotel_whatsapp_messages').select('*').eq('hotel_booking_id', id).order('received_at', { ascending: false }),
  ])

  if (bookingErr) console.error('Hotel fetch error:', bookingErr)

  if (!booking) notFound()
  const b = booking as HotelBooking
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-6 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Sparkles size={18} /> Command Center
        </Link>
        <Link href="/flights" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Plane size={18} /> Live Flights
        </Link>
        <Link href="/flights/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Flights
        </Link>
        <Link href="/hotels" className="flex items-center gap-2 pb-3 border-b-2 border-blue-600 text-blue-600 font-bold shrink-0">
          <Building2 size={18} /> Reservations
        </Link>
        <Link href="/hotels/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Hotels
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{b.hotel_name}</h1>
            <p className="text-gray-500">Booking Ref: {b.booking_ref}</p>
          </div>
          <ConfirmationBadge status={b.confirmation_status} via={b.confirmed_via} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Detail label="Hotel Name" value={b.hotel_name} />
          <Detail label="Booking Reference" value={b.booking_ref} />
          <Detail label="Check-in" value={b.check_in_date} />
          <Detail label="Check-out" value={b.check_out_date} />
          {b.room_type && <Detail label="Room Type" value={`${b.room_type} × ${b.num_rooms}`} />}
          {b.hotel_email && <Detail label="Hotel Email" value={b.hotel_email} />}
          {b.hotel_phone && <Detail label="Hotel Phone" value={b.hotel_phone} />}
          {b.confirmed_at && <Detail label="Confirmed At" value={new Date(b.confirmed_at).toLocaleString('en-IN')} />}
          {b.confirmed_via && <Detail label="Confirmed Via" value={b.confirmed_via} />}
        </div>

        {b.confirmation_status !== 'confirmed' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Confirmation Link (to share manually):</p>
            <p className="text-xs font-mono text-gray-700 break-all">{appUrl}/confirm/hotel/{b.confirmation_token}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Traveler Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Name" value={b.traveler_name} />
          <Detail label="Email" value={b.traveler_email} />
          {b.traveler_phone && <Detail label="Phone" value={b.traveler_phone} />}
        </div>
        <div className="mt-4 flex gap-4">
          <NotifStatus label="Email to Hotel" sent={b.request_email_sent} />
          <NotifStatus label="WhatsApp to Hotel" sent={b.request_whatsapp_sent} />
          <NotifStatus label="Traveler Notified" sent={b.traveler_notified} />
        </div>
      </div>

      {messages && messages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">WhatsApp Messages</h2>
          <div className="space-y-3">
            {messages.map((m: Record<string, unknown>) => (
              <div key={m.id as string} className={`p-3 rounded-lg text-sm ${m.direction === 'inbound' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${m.direction === 'inbound' ? 'text-green-700' : 'text-blue-700'}`}>
                    {m.direction === 'inbound' ? '← Hotel' : '→ Sent'}
                  </span>
                  <span className="text-gray-400 text-xs">{new Date(m.received_at as string).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-gray-700">{m.message_body as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Notification History</h2>
          <div className="space-y-3">
            {(logs as NotificationLog[]).map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-500 text-xs w-32 flex-shrink-0">{new Date(log.sent_at).toLocaleString('en-IN')}</span>
                <span className="font-medium text-gray-900 capitalize">{log.notification_type.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">via {log.channel}</span>
                {log.status === 'failed' && <span className="text-red-600 text-xs ml-auto">{log.error_message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  )
}

function ConfirmationBadge({ status, via }: { status: string; via: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    awaiting_reply: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${map[status] || map.pending}`}>
      {status === 'confirmed' && via ? `Confirmed via ${via}` : status.replace('_', ' ')}
    </span>
  )
}

function NotifStatus({ label, sent }: { label: string; sent: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${sent ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
      {sent ? <Check size={14} /> : <Minus size={14} />}
      <span>{label}</span>
    </div>
  )
}
