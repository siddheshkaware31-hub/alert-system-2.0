import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { HotelBooking } from '@/types'
import { Building2, Mail, MessageCircle } from 'lucide-react'

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotel Bookings</h1>
          <p className="text-gray-500 mt-1">Track hotel confirmation status</p>
        </div>
        <Link href="/hotels/import" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Import CSV
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-2 items-center flex-wrap">
        <label className="text-sm text-gray-600 font-medium">Status:</label>
        <a href="/hotels" className={`px-3 py-1.5 rounded-lg text-sm ${!filterStatus ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</a>
        {['pending', 'awaiting_reply', 'confirmed', 'failed'].map(s => (
          <a key={s} href={`/hotels?status=${s}`} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterStatus === s ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.replace('_', ' ')}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!bookings?.length ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-3">
              <Building2 size={44} className="text-gray-300" />
            </div>
            <p className="text-gray-500">No hotel bookings found.</p>
            <Link href="/hotels/import" className="text-teal-600 hover:underline text-sm mt-2 inline-block">Import bookings</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hotel / Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Traveler</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bookings as HotelBooking[]).map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/hotels/${b.id}`} className="hover:text-teal-600">
                      <p className="font-semibold text-sm text-gray-900">{b.hotel_name}</p>
                      <p className="text-gray-500 text-xs">{b.booking_ref}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{b.traveler_name}</p>
                    <p className="text-xs text-gray-400">{b.traveler_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <p>{b.check_in_date}</p>
                    <p className="text-xs text-gray-400">→ {b.check_out_date}</p>
                  </td>
                  <td className="px-4 py-3"><ConfirmationBadge status={b.confirmation_status} via={b.confirmed_via} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span title="Email sent to hotel" className={b.request_email_sent ? 'text-green-600' : 'text-gray-300'}>
                        <Mail size={15} />
                      </span>
                      <span title="WhatsApp sent to hotel" className={b.request_whatsapp_sent ? 'text-green-600' : 'text-gray-300'}>
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

function ConfirmationBadge({ status, via }: { status: string; via: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    awaiting_reply: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || map.pending}`}>
      {status === 'confirmed' && via ? `confirmed via ${via}` : status.replace('_', ' ')}
    </span>
  )
}
