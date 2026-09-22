import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { HotelBooking } from '@/types'
import { Building2, Mail, MessageCircle, Calendar, Upload, Plane } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HotelsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams
  const db = createServiceClient()
  const filterStatus = params.status

  let query = db
    .from('hotel_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterStatus) query = query.eq('confirmation_status', filterStatus)

  const { data: bookings } = await query

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          Command Center
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

      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-900">Hotel Reservations</h2>
        <p className="text-slate-500 text-xs mt-1">Track confirmation status & automated dispatches.</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-6 flex gap-3 items-center flex-wrap">
        <label className="text-xs text-slate-500 font-bold uppercase">Status:</label>
        <a href="/hotels" className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!filterStatus ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>All</a>
        {['pending', 'awaiting_reply', 'confirmed', 'failed'].map(s => (
          <a key={s} href={`/hotels?status=${s}`} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            {s.replace('_', ' ')}
          </a>
        ))}
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
        {!bookings?.length ? (
          <div className="p-16 text-center">
            <Building2 size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-bold text-sm">No hotel bookings found.</p>
            <p className="text-slate-400 text-xs mt-1">Upload a CSV or Excel sheet to start tracking hotel reconfirmations.</p>
            <Link href="/hotels/import" className="text-blue-600 font-bold text-xs mt-3 inline-block underline">Import bookings</Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Hotel / Ref</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Traveler Details</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Stay Dates</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Status</th>
                <th className="px-5 py-3.5 text-xs font-extrabold text-slate-600 uppercase">Contact Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(bookings as HotelBooking[]).map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/hotels/${b.id}`} className="group">
                      <p className="font-bold text-sm text-slate-900 group-hover:text-blue-600">{b.hotel_name}</p>
                      <p className="text-slate-500 font-mono text-xs">{b.booking_ref}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-slate-900">{b.traveler_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{b.traveler_email}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-700 font-mono">
                    {b.check_in_date} → {b.check_out_date}
                  </td>
                  <td className="px-5 py-4"><ConfirmationBadge status={b.confirmation_status} via={b.confirmed_via} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span title="Email sent" className={b.request_email_sent ? 'text-emerald-600' : 'text-slate-300'}><Mail size={16} /></span>
                      <span title="WhatsApp sent" className={b.request_whatsapp_sent ? 'text-emerald-600' : 'text-slate-300'}><MessageCircle size={16} /></span>
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

function ConfirmationBadge({ status, via }: { status: string; via: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    awaiting_reply: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase border ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status === 'confirmed' && via ? `confirmed via ${via}` : status.replace('_', ' ')}
    </span>
  )
}


