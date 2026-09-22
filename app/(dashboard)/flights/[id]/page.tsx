import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FlightBooking, NotificationLog } from '@/types'
import { Check, Minus, ArrowLeft, Sparkles, Plane, Building2, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const [
    { data: booking, error: bookingErr }, 
    { data: logs }
  ] = await Promise.all([
    db.from('flight_bookings').select('*').eq('id', id).single(),
    db.from('notification_logs').select('*').eq('entity_id', id).order('sent_at', { ascending: false }),
  ])

  if (bookingErr) console.error('Flight fetch error:', bookingErr)

  if (!booking) notFound()
  const b = booking as FlightBooking

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-6 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Sparkles size={18} /> Command Center
        </Link>
        <Link href="/flights" className="flex items-center gap-2 pb-3 border-b-2 border-blue-600 text-blue-600 font-bold shrink-0">
          <Plane size={18} /> Live Flights
        </Link>
        <Link href="/flights/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Flights
        </Link>
        <Link href="/hotels" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Building2 size={18} /> Reservations
        </Link>
        <Link href="/hotels/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Hotels
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{b.pnr}</h1>
            <p className="text-gray-500">{b.flight_number} · {b.origin} → {b.destination}</p>
          </div>
          <StatusBadge status={b.status} delay={b.delay_minutes} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Detail label="PNR" value={b.pnr} />
          {b.ticket_number && <Detail label="Ticket Number" value={b.ticket_number} />}
          <Detail label="Flight Number" value={b.flight_number} />
          <Detail label="Route" value={`${b.origin} → ${b.destination}`} />
          <Detail label="Departure Date" value={b.departure_date} />
          {b.departure_time && <Detail label="Departure Time" value={b.departure_time} />}
          {b.arrival_time && <Detail label="Arrival Time" value={b.arrival_time} />}
          {b.gate && <Detail label="Gate" value={b.gate} />}
          {b.terminal && <Detail label="Terminal" value={b.terminal} />}
          {b.delay_minutes > 0 && <Detail label="Delay" value={`${b.delay_minutes} minutes`} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Traveler Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Name" value={b.traveler_name} />
          <Detail label="Email" value={b.traveler_email} />
          <Detail label="Phone" value={b.traveler_phone} />
        </div>
        <div className="mt-4 flex gap-4">
          <NotifStatus label="Email Confirmation" sent={b.confirmation_email_sent} />
          <NotifStatus label="WhatsApp Confirmation" sent={b.confirmation_whatsapp_sent} />
        </div>
      </div>

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

function StatusBadge({ status, delay }: { status: string; delay: number }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    landed: 'bg-gray-100 text-gray-600',
    delayed: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    diverted: 'bg-purple-100 text-purple-700',
    unknown: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${map[status] || map.unknown}`}>
      {status}{status === 'delayed' && delay > 0 ? ` +${delay}m` : ''}
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
