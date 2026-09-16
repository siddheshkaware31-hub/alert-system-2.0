import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FlightBooking } from '@/types'
import { Plane, Mail, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FlightsPage({ searchParams }: { searchParams: Promise<{ status?: string; date?: string }> }) {
  const params = await searchParams
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const filterDate = params.date || today
  const filterStatus = params.status

  let query = db
    .from('flight_bookings')
    .select('*')
    .order('departure_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterDate) query = query.eq('departure_date', filterDate)
  if (filterStatus) query = query.eq('status', filterStatus)

  const { data: bookings } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flight Bookings</h1>
          <p className="text-gray-500 mt-1">Track and manage all flight bookings</p>
        </div>
        <Link href="/flights/import" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Import CSV
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Date:</label>
          <a href={`/flights?date=${today}`} className={`px-3 py-1.5 rounded-lg text-sm ${filterDate === today ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Today</a>
          <a href="/flights" className={`px-3 py-1.5 rounded-lg text-sm ${!params.date ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</a>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Status:</label>
          {['scheduled', 'delayed', 'cancelled', 'landed'].map(s => (
            <a key={s} href={`/flights?status=${s}${params.date ? `&date=${params.date}` : ''}`} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</a>
          ))}
          {filterStatus && <a href={`/flights${params.date ? `?date=${params.date}` : ''}`} className="text-blue-600 text-sm hover:underline">Clear</a>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!bookings?.length ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-3">
              <Plane size={44} className="text-gray-300" />
            </div>
            <p className="text-gray-500">No flight bookings found.</p>
            <Link href="/flights/import" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Import bookings</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">PNR / Flight</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Traveler</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bookings as FlightBooking[]).map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/flights/${b.id}`} className="hover:text-blue-600">
                      <p className="font-semibold text-sm text-gray-900">{b.pnr}</p>
                      <p className="text-gray-500 text-xs">{b.flight_number}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.origin} → {b.destination}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{b.traveler_name}</p>
                    <p className="text-xs text-gray-400">{b.traveler_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.departure_date}{b.departure_time ? ` ${b.departure_time}` : ''}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} delay={b.delay_minutes} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span title="Email confirmation" className={b.confirmation_email_sent ? 'text-green-600' : 'text-gray-300'}>
                        <Mail size={15} />
                      </span>
                      <span title="WhatsApp confirmation" className={b.confirmation_whatsapp_sent ? 'text-green-600' : 'text-gray-300'}>
                        <MessageCircle size={15} />
                      </span>
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
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    landed: 'bg-gray-100 text-gray-600',
    delayed: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    diverted: 'bg-purple-100 text-purple-700',
    unknown: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || map.unknown}`}>
      {status}{status === 'delayed' && delay > 0 ? ` +${delay}m` : ''}
    </span>
  )
}
