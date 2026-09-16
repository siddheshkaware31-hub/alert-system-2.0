import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import {
  Plane, Clock3, AlertTriangle, Building2, CheckCircle2, Bell,
  Upload, ArrowUpRight, Activity, MessageCircle, Mail, Sparkles,
  CircleDot, ChevronRight, ShieldCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const since24h = new Date(Date.now() - 86400000).toISOString()

  const [
    { count: flightsToday },
    { count: flightsDelayed },
    { count: flightsCancelled },
    { count: hotelsPending },
    { count: hotelsConfirmedToday },
    { count: notifsSent },
    { count: notifsFailed },
    { count: whatsappRepliesCount },
    { count: emailConfirmationsCount },
    { count: travelerRepliesCount },
    { data: disruptedFlights },
    { data: pendingHotels },
    { data: recentNotifications },
  ] = await Promise.all([
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today).eq('status', 'delayed'),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today).eq('status', 'cancelled'),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).in('confirmation_status', ['pending', 'awaiting_reply']),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmation_status', 'confirmed').gte('confirmed_at', today),
    db.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', since24h),
    db.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('sent_at', since24h),
    db.from('hotel_whatsapp_messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound').gte('received_at', today),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmed_via', 'link').gte('confirmed_at', today),
    db.from('traveler_replies').select('*', { count: 'exact', head: true }).gte('received_at', today),
    db.from('flight_bookings').select('id, pnr, flight_number, origin, destination, status, delay_minutes, traveler_name').in('status', ['delayed', 'cancelled']).eq('departure_date', today).order('updated_at', { ascending: false }).limit(5),
    db.from('hotel_bookings').select('id, hotel_name, booking_ref, traveler_name, confirmation_status, check_in_date').in('confirmation_status', ['pending', 'awaiting_reply']).order('created_at', { ascending: false }).limit(5),
    db.from('notification_logs').select('id, entity_type, entity_id, channel, notification_type, status, sent_at, error_message').order('sent_at', { ascending: false }).limit(8),
  ])

  const flightCount = flightsToday ?? 0
  const delayedCount = flightsDelayed ?? 0
  const cancelledCount = flightsCancelled ?? 0
  const pendingHotelCount = hotelsPending ?? 0
  const sentCount = notifsSent ?? 0
  const failedCount = notifsFailed ?? 0
  const attentionCount = delayedCount + cancelledCount + pendingHotelCount

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
            <Sparkles size={13} /> AI Travel Operations
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Monitor flights, hotel confirmations and traveler notifications from one operational view.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0d1422] px-4 py-3 glow-line">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><ShieldCheck size={16} /></div>
          <div><p className="text-xs font-medium text-slate-300">Monitoring active</p><p className="font-mono text-[10px] text-slate-600">{new Date().toLocaleTimeString('en-IN')}</p></div>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard href="/flights" eyebrow="Flights" title="Departing today" value={flightCount} icon={<Plane size={17} />} meta={`${flightCount - delayedCount - cancelledCount >= 0 ? flightCount - delayedCount - cancelledCount : 0} currently scheduled`} />
        <MetricCard href="/flights?status=delayed" eyebrow="Attention" title="Delayed flights" value={delayedCount} icon={<Clock3 size={17} />} danger={delayedCount > 0} meta={delayedCount ? 'Traveler review required' : 'No delays detected'} />
        <MetricCard href="/flights?status=cancelled" eyebrow="Disruptions" title="Cancelled flights" value={cancelledCount} icon={<AlertTriangle size={17} />} danger={cancelledCount > 0} meta={cancelledCount ? 'Immediate attention required' : 'No cancellations today'} />
        <MetricCard href="/hotels" eyebrow="Hotels" title="Awaiting confirmation" value={pendingHotelCount} icon={<Building2 size={17} />} warning={pendingHotelCount > 0} meta={`${hotelsConfirmedToday ?? 0} confirmed today`} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-[#1e2a3a] bg-[#0d1422] p-5 glow-line">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">System overview</p><h2 className="mt-1 text-sm font-semibold text-white">Operations status</h2></div>
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-[#1e2a3a] border border-[#1e2a3a] sm:grid-cols-4 sm:divide-y-0">
            <MiniStat label="Notifications 24h" value={sentCount} icon={<Bell size={15} />} />
            <MiniStat label="Failed 24h" value={failedCount} icon={<AlertTriangle size={15} />} danger={failedCount > 0} />
            <MiniStat label="Hotel confirmed" value={hotelsConfirmedToday ?? 0} icon={<CheckCircle2 size={15} />} />
            <MiniStat label="Items needing attention" value={attentionCount} icon={<Activity size={15} />} warning={attentionCount > 0} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ChannelPill icon={<Mail size={13} />} label="Email confirmations" value={emailConfirmationsCount ?? 0} />
            <ChannelPill icon={<MessageCircle size={13} />} label="WhatsApp replies" value={whatsappRepliesCount ?? 0} />
            <ChannelPill icon={<MessageCircle size={13} />} label="Traveler replies" value={travelerRepliesCount ?? 0} />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/15 bg-gradient-to-br from-[#101c31] to-[#0d1422] p-5 glow-line">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><Sparkles size={17} /></div>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-400">Travel AI</p><h2 className="mt-1 text-sm font-semibold text-white">Operations assistant</h2></div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">Your command layer for flight disruptions, hotel confirmations and notification activity.</p>
          <div className="mt-5 rounded-xl border border-[#25344a] bg-[#09111f] p-3 font-mono text-[11px] text-slate-500">
            <span className="text-blue-400">&gt;</span> Ask: <span className="text-slate-300">“Show delayed flights”</span>
          </div>
          <p className="mt-3 text-[10px] text-slate-600">AI controls can be connected to your existing APIs after the monitoring workflow is stable.</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-[#1e2a3a] bg-[#0d1422] p-5 glow-line">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">Attention queue</p><h2 className="mt-1 text-sm font-semibold text-white">Requires attention</h2></div>
            <span className="font-mono text-[11px] text-slate-600">{attentionCount} items</span>
          </div>
          <div className="space-y-2">
            {(disruptedFlights ?? []).map((f: { id: string; pnr: string; flight_number: string; origin: string; destination: string; status: string; delay_minutes: number; traveler_name: string }) => (
              <Link key={f.id} href={`/flights/${f.id}`} className="group flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0a111e] p-3 transition hover:border-blue-400/30 hover:bg-[#101a2b]">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${f.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}><AlertTriangle size={15} /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-white">{f.flight_number}</span><span className="text-[10px] text-slate-600">{f.pnr}</span></div><p className="truncate text-[11px] text-slate-500">{f.origin} → {f.destination} · {f.traveler_name}</p></div>
                <div className="text-right">{f.status === 'cancelled' ? <p className="text-[10px] font-semibold uppercase text-red-400">Cancelled</p> : <p className="font-mono text-[10px] font-semibold text-amber-400">+{f.delay_minutes} min</p>}<ChevronRight size={13} className="ml-auto mt-1 text-slate-700 transition group-hover:text-blue-400" /></div>
              </Link>
            ))}
            {(pendingHotels ?? []).map((h: { id: string; hotel_name: string; booking_ref: string; traveler_name: string; confirmation_status: string; check_in_date: string }) => (
              <Link key={h.id} href={`/hotels/${h.id}`} className="group flex items-center gap-3 rounded-xl border border-[#1e2a3a] bg-[#0a111e] p-3 transition hover:border-blue-400/30 hover:bg-[#101a2b]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"><Building2 size={15} /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-semibold text-white">{h.hotel_name}</span><span className="text-[10px] text-slate-600">{h.booking_ref}</span></div><p className="truncate text-[11px] text-slate-500">{h.traveler_name} · Check-in {h.check_in_date}</p></div>
                <div className="text-right"><p className="text-[10px] font-semibold uppercase text-amber-400">{h.confirmation_status.replace('_', ' ')}</p><ChevronRight size={13} className="ml-auto mt-1 text-slate-700 transition group-hover:text-blue-400" /></div>
              </Link>
            ))}
            {attentionCount === 0 && <EmptyState icon={<CheckCircle2 size={18} />} text="No items currently require attention." />}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2a3a] bg-[#0d1422] p-5 glow-line">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">Live stream</p><h2 className="mt-1 text-sm font-semibold text-white">Notification activity</h2></div><Activity size={16} className="text-blue-400" /></div>
          <div className="space-y-4">
            {(recentNotifications ?? []).map((n: { id: string; channel: string; notification_type: string; status: string; sent_at: string; error_message: string | null }) => (
              <div key={n.id} className="flex gap-3">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.status === 'sent' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400'}`} />
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-[11px] font-medium text-slate-300">{formatEvent(n.notification_type)}</p><span className="shrink-0 font-mono text-[9px] text-slate-600">{new Date(n.sent_at).toLocaleTimeString('en-IN')}</span></div><p className="mt-0.5 text-[10px] text-slate-600">{n.channel} · {n.status}{n.error_message ? ` · ${n.error_message}` : ''}</p></div>
              </div>
            ))}
            {!recentNotifications?.length && <EmptyState icon={<Activity size={18} />} text="No notification activity yet." />}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">Operations</p><h2 className="mt-1 text-sm font-semibold text-white">Quick actions</h2></div></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Action href="/flights/import" icon={<Upload size={17} />} title="Import flight data" description="Upload booking CSV" />
          <Action href="/hotels/import" icon={<Upload size={17} />} title="Import hotel data" description="Upload hotel bookings" />
          <Action href="/flights" icon={<Plane size={17} />} title="Open flight operations" description="Review status and alerts" />
        </div>
      </section>
    </div>
  )
}

function MetricCard({ href, eyebrow, title, value, icon, meta, danger, warning }: { href: string; eyebrow: string; title: string; value: number; icon: React.ReactNode; meta: string; danger?: boolean; warning?: boolean }) {
  return <Link href={href} className="group rounded-2xl border border-[#1e2a3a] bg-[#0d1422] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/25 hover:bg-[#101927] glow-line"><div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">{eyebrow}</p><h2 className="mt-2 text-xs font-medium text-slate-400">{title}</h2></div><span className={`rounded-lg p-2 ${danger ? 'bg-red-500/10 text-red-400' : warning ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{icon}</span></div><p className={`mt-5 font-mono text-4xl font-semibold tracking-tight ${danger ? 'text-red-400' : warning ? 'text-amber-300' : 'text-white'}`}>{String(value).padStart(2, '0')}</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-slate-600">{meta}</span><ArrowUpRight size={13} className="text-slate-700 transition group-hover:text-blue-400" /></div></Link>
}

function MiniStat({ label, value, icon, danger, warning }: { label: string; value: number; icon: React.ReactNode; danger?: boolean; warning?: boolean }) { return <div className="p-4"><div className="flex items-center gap-2 text-slate-600">{icon}<span className="text-[10px]">{label}</span></div><p className={`mt-2 font-mono text-xl font-semibold ${danger ? 'text-red-400' : warning ? 'text-amber-300' : 'text-slate-200'}`}>{String(value).padStart(2, '0')}</p></div> }

function ChannelPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="flex items-center gap-2 rounded-lg border border-[#1e2a3a] bg-[#0a111e] px-3 py-2"><span className="text-slate-600">{icon}</span><span className="text-[10px] text-slate-500">{label}</span><span className="font-mono text-[10px] text-slate-300">{value}</span></div> }

function Action({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) { return <Link href={href} className="group flex items-center gap-4 rounded-xl border border-[#1e2a3a] bg-[#0d1422] p-4 transition hover:border-blue-400/25 hover:bg-[#101927]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">{icon}</span><span className="flex-1"><span className="block text-xs font-semibold text-slate-200">{title}</span><span className="mt-0.5 block text-[10px] text-slate-600">{description}</span></span><ChevronRight size={14} className="text-slate-700 transition group-hover:text-blue-400" /></Link> }

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#1e2a3a] p-4 text-[11px] text-slate-600"><span>{icon}</span>{text}</div> }

function formatEvent(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
