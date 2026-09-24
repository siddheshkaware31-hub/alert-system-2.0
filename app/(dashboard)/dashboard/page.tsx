import Link from 'next/link'
import LiveTrackerControl from '@/components/LiveTrackerControl'
import { createServiceClient } from '@/lib/supabase/server'
import {
  Plane, Clock3, AlertTriangle, Building2, CheckCircle2, Bell,
  Upload, ArrowUpRight, Activity, MessageCircle, Mail, Sparkles,
  ChevronRight, ShieldCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const since24h = new Date(Date.now() - 86400000).toISOString()

  const [
    { count: totalActiveFlights },
    { count: flightsToday },
    { count: flightsDelayed },
    { count: flightsCancelled },
    { count: hotelsPending },
    { count: hotelsConfirmedTotal },
    { count: notifsSent },
    { count: notifsFailed },
    { count: whatsappRepliesCount },
    { count: emailConfirmationsCount },
    { count: travelerRepliesCount },
    { data: disruptedFlights },
    { data: pendingHotels },
    { data: recentNotifications },
  ] = await Promise.all([
    db.from('flight_bookings').select('*', { count: 'exact', head: true }),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('status', 'delayed'),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).in('confirmation_status', ['pending', 'awaiting_reply']),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmation_status', 'confirmed'),
    db.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', since24h),
    db.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('sent_at', since24h),
    db.from('hotel_whatsapp_messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound'),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmed_via', 'link'),
    db.from('traveler_replies').select('*', { count: 'exact', head: true }),
    db.from('flight_bookings').select('id, pnr, flight_number, origin, destination, status, delay_minutes, traveler_name').in('status', ['delayed', 'cancelled']).order('updated_at', { ascending: false }).limit(5),
    db.from('hotel_bookings').select('id, hotel_name, booking_ref, traveler_name, confirmation_status, check_in_date').in('confirmation_status', ['pending', 'awaiting_reply']).order('created_at', { ascending: false }).limit(5),
    db.from('notification_logs').select('id, entity_type, entity_id, channel, notification_type, status, sent_at, error_message').order('sent_at', { ascending: false }).limit(8),
  ])

  const totalFlights = totalActiveFlights ?? 0
  const delayedCount = flightsDelayed ?? 0
  const cancelledCount = flightsCancelled ?? 0
  const pendingHotelCount = hotelsPending ?? 0
  const sentCount = notifsSent ?? 0
  const failedCount = notifsFailed ?? 0
  const attentionCount = delayedCount + cancelledCount + pendingHotelCount

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-blue-600 text-blue-600 font-bold shrink-0">
          <Sparkles size={18} /> Command Center
        </Link>
        <Link href="/flights" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
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

      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Operations Control Center</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time status tracking for flight delays, hotel reconfirmations, and traveler dispatches.</p>
        </div>
      </div>

      {/* KPI Cards — Updates Live as Data is Uploaded */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard href="/flights" title="Active Flight Bookings" value={totalFlights} icon={<Plane size={18} />} color="blue" subtitle={`${flightsToday ?? 0} departing today`} />
        <MetricCard href="/flights?status=delayed" title="Delayed Flights" value={delayedCount} icon={<Clock3 size={18} />} danger={delayedCount > 0} />
        <MetricCard href="/flights?status=cancelled" title="Cancelled Flights" value={cancelledCount} icon={<AlertTriangle size={18} />} danger={cancelledCount > 0} />
        <MetricCard href="/hotels" title="Awaiting Hotel Reply" value={pendingHotelCount} icon={<Building2 size={18} />} warning={pendingHotelCount > 0} />
      </section>

      {/* AirLabs & AviationStack Radar Tracker Banner */}
      <div className="mb-8">
        <LiveTrackerControl />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Disruptions & Attention Queue</h3>
            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{attentionCount} Pending</span>
          </div>
          <div className="space-y-2.5">
            {(disruptedFlights ?? []).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-slate-200/60">
                No active flight delays or cancellations detected.
              </div>
            ) : (
              (disruptedFlights ?? []).map((f: { id: string; pnr: string; flight_number: string; origin: string; destination: string; status: string; delay_minutes: number; traveler_name: string }) => (
                <Link key={f.id} href={`/flights/${f.id}`} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">{f.flight_number}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({f.origin} → {f.destination})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{f.traveler_name} • PNR: <strong className="text-slate-700 font-mono">{f.pnr}</strong></p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${f.status === 'delayed' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                    {f.status} {f.delay_minutes > 0 ? `+${f.delay_minutes}m` : ''}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Pending Hotel Reconfirmations</h3>
            <Link href="/hotels" className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1">View all <ChevronRight size={14} /></Link>
          </div>
          <div className="space-y-2.5">
            {(pendingHotels ?? []).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-slate-200/60">
                All hotel reservations reconfirmed!
              </div>
            ) : (
              (pendingHotels ?? []).map((h: { id: string; hotel_name: string; booking_ref: string; traveler_name: string; confirmation_status: string; check_in_date: string }) => (
                <Link key={h.id} href={`/hotels/${h.id}`} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
                  <div>
                    <p className="font-extrabold text-xs text-slate-900">{h.hotel_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{h.traveler_name} • Ref: <strong className="text-slate-700 font-mono">{h.booking_ref}</strong></p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 capitalize">
                    {h.confirmation_status.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 24h Notification Activity Log */}
      <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-900 text-sm">24h Traveler Dispatch Activity Log</h3>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">{sentCount} Delivered</span>
            {failedCount > 0 && <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">{failedCount} Failed</span>}
          </div>
        </div>
        <div className="space-y-2">
          {(recentNotifications ?? []).map((n: { id: string; entity_type: string; channel: string; notification_type: string; status: string; sent_at: string; error_message?: string }) => (
            <div key={n.id} className="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                <span className={`p-1.5 rounded-lg ${n.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {n.channel === 'whatsapp' ? <MessageCircle size={14} /> : <Mail size={14} />}
                </span>
                <div>
                  <p className="font-bold text-slate-800 capitalize">{n.notification_type.replace('_', ' ')} ({n.entity_type})</p>
                  <p className="text-[10px] text-slate-400 font-mono">{new Date(n.sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${n.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {n.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MetricCard({ title, value, icon, color = 'blue', danger = false, warning = false, href, subtitle }: { title: string; value: number; icon: React.ReactNode; color?: string; danger?: boolean; warning?: boolean; href?: string; subtitle?: string }) {
  const CardWrapper = href ? Link : 'div'
  return (
    <CardWrapper href={href || '#'} className={`p-5 rounded-2xl border transition-all ${danger ? 'bg-rose-50/60 border-rose-200' : warning ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/80'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${danger ? 'bg-rose-100 text-rose-600' : warning ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-black mt-3 ${danger ? 'text-rose-600' : warning ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-1">{subtitle}</p>}
    </CardWrapper>
  )
}
