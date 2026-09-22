import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LiveTrackerControl from '@/components/LiveTrackerControl'
import { FlightBooking } from '@/types'
import { Plane, Mail, MessageCircle, Calendar, ArrowRight, Building2, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FlightsPage({ searchParams }: { searchParams: Promise<{ status?: string; date?: string }> }) {
  const params = await searchParams
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const filterDate = params.date
  const filterStatus = params.status

  let query = db
    .from('flight_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterDate === 'today') {
    query = query.eq('departure_date', today)
  } else if (filterDate && filterDate !== 'all') {
    query = query.eq('departure_date', filterDate)
  }

  if (filterStatus) {
    query = query.eq('status', filterStatus)
  }

  const { data: bookings } = await query

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          Command Center
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

      <div className="mb-4">
        <h2 className="text-xl font-extrabold text-slate-900">Live Flights Queue</h2>
        <p className="text-slate-500 text-xs mt-1">Real-time status updates and delay dispatches.</p>
      </div>

      {/* Live AirLabs Tracking Control */}
      <LiveTrackerControl />

      {/* Filters */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-bold uppercase">Date:</label>
          <a href="/flights" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!filterDate || filterDate === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>All Flights</a>
          <a href="/flights?date=today" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Departing Today</a>
        </div>
        <div className="h-4 w-px bg-slate-300 hidden sm:block" />
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-500 font-bold uppercase">Status:</label>
          {['scheduled', 'delayed', 'cancelled', 'landed'].map(s => (
            <a key={s} href={`/flights?status=${s}${params.date ? `&date=${params.date}` : ''}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{s}</a>
          ))}
          {filterStatus && <a href={`/flights${params.date ? `?date=${params.date}` : ''}`} className="text-blue-600 text-xs font-bold hover:underline ml-2">Clear</a>}
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        {!bookings?.length ? (
          <div className="p-16 text-center">
            <Plane size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-bold text-sm">No flight bookings found.</p>
            <p className="text-slate-400 text-xs mt-1">Upload a CSV file to add flights to the tracking queue.</p>
            <Link href="/flights/import" className="text-blue-600 font-bold text-xs mt-3 inline-block underline">Import bookings</Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">PNR / Flight</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Route</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Traveler</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Departure</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Status</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Alert Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(bookings as FlightBooking[]).map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/flights/${b.id}`} className="group">
                      <p className="font-mono font-bold text-sm text-slate-900 group-hover:text-blue-600">{b.pnr}</p>
                      <p className="text-slate-500 font-mono text-xs">{b.flight_number}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-700">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md">{b.origin} → {b.destination}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-slate-900">{b.traveler_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{b.traveler_email}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-700 font-mono">
                    {b.departure_date}{b.departure_time ? ` ${b.departure_time}` : ''}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={b.status} delay={b.delay_minutes} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span title="Email confirmation" className={b.confirmation_email_sent ? 'text-emerald-600' : 'text-slate-300'}><Mail size={16} /></span>
                      <span title="WhatsApp confirmation" className={b.confirmation_whatsapp_sent ? 'text-emerald-600' : 'text-slate-300'}><MessageCircle size={16} /></span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, delay }: { status: string; delay: number }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    landed: 'bg-slate-100 text-slate-600 border-slate-200',
    delayed: 'bg-amber-100 text-amber-800 border-amber-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase border ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}{status === 'delayed' && delay > 0 ? ` +${delay}m` : ''}
    </span>
  )
}


