import { createServiceClient } from '@/lib/supabase/server'
import {
  Plane, Clock, AlertCircle, Building2, CheckCircle2, Bell,
  ClipboardList, Upload, MessageCircle, Mail,
} from 'lucide-react'

export default async function DashboardPage() {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const [
    { count: flightsToday },
    { count: flightsDelayed },
    { count: flightsCancelled },
    { count: hotelsPending },
    { count: hotelsConfirmedToday },
    { count: notifsSent },
    { count: whatsappRepliesCount },
    { count: emailConfirmationsCount },
    { count: travelerRepliesCount },
  ] = await Promise.all([
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today).eq('status', 'delayed'),
    db.from('flight_bookings').select('*', { count: 'exact', head: true }).eq('departure_date', today).eq('status', 'cancelled'),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).in('confirmation_status', ['pending', 'awaiting_reply']),
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmation_status', 'confirmed').gte('confirmed_at', today),
    db.from('notification_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', yesterday),
    // Hotel WhatsApp replies today
    db.from('hotel_whatsapp_messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound').gte('received_at', today),
    // Hotel email confirmations today (link clicks)
    db.from('hotel_bookings').select('*', { count: 'exact', head: true }).eq('confirmed_via', 'link').gte('confirmed_at', today),
    // Traveler WhatsApp replies today
    db.from('traveler_replies').select('*', { count: 'exact', head: true }).gte('received_at', today),
  ])

  // Recent replies: hotel WhatsApp + traveler replies, merged and sorted
  const [{ data: hotelReplies }, { data: travelerReplies }, { data: emailConfirmations }] = await Promise.all([
    db.from('hotel_whatsapp_messages')
      .select('id, from_number, message_body, received_at, hotel_booking_id')
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(5),
    db.from('traveler_replies')
      .select('id, entity_type, from_number, message_body, received_at')
      .order('received_at', { ascending: false })
      .limit(5),
    db.from('hotel_bookings')
      .select('id, hotel_name, booking_ref, confirmed_via, confirmed_at')
      .not('confirmed_at', 'is', null)
      .order('confirmed_at', { ascending: false })
      .limit(5),
  ])

  type ReplyEntry =
    | { kind: 'hotel_wa'; id: string; label: string; channel: 'whatsapp'; time: string }
    | { kind: 'traveler_wa'; id: string; label: string; channel: 'whatsapp'; time: string }
    | { kind: 'email_confirm'; id: string; label: string; channel: 'email'; time: string }

  type HotelReply = { id: string; from_number: string | null; message_body: string | null; received_at: string; hotel_booking_id: string | null }
  type TravelerReply = { id: string; entity_type: string; from_number: string | null; message_body: string | null; received_at: string }
  type EmailConfirmation = { id: string; hotel_name: string; booking_ref: string; confirmed_via: string | null; confirmed_at: string | null }

  const recentReplies: ReplyEntry[] = [
    ...(hotelReplies ?? []).map((r: HotelReply) => ({
      kind: 'hotel_wa' as const,
      id: r.id,
      label: `Hotel replied via WhatsApp${r.message_body ? ` · "${r.message_body.slice(0, 40)}${r.message_body.length > 40 ? '…' : ''}"` : ''}`,
      channel: 'whatsapp' as const,
      time: r.received_at,
    })),
    ...(travelerReplies ?? []).map((r: TravelerReply) => ({
      kind: 'traveler_wa' as const,
      id: r.id,
      label: `Traveler replied via WhatsApp (${r.entity_type})${r.message_body ? ` · "${r.message_body.slice(0, 36)}${r.message_body.length > 36 ? '…' : ''}"` : ''}`,
      channel: 'whatsapp' as const,
      time: r.received_at,
    })),
    ...(emailConfirmations ?? []).map((r: EmailConfirmation) => ({
      kind: 'email_confirm' as const,
      id: r.id,
      label: `${r.hotel_name} confirmed booking ${r.booking_ref} via ${r.confirmed_via === 'link' ? 'email link' : 'WhatsApp'}`,
      channel: (r.confirmed_via === 'link' ? 'email' : 'whatsapp') as 'email' | 'whatsapp',
      time: r.confirmed_at!,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview for {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Flight + Hotel stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <StatCard title="Flights Today" value={flightsToday ?? 0} color="blue" icon={<Plane size={22} />} />
        <StatCard title="Delayed Flights" value={flightsDelayed ?? 0} color="yellow" icon={<Clock size={22} />} />
        <StatCard title="Cancelled Flights" value={flightsCancelled ?? 0} color="red" icon={<AlertCircle size={22} />} />
        <StatCard title="Hotels Awaiting Confirmation" value={hotelsPending ?? 0} color="orange" icon={<Building2 size={22} />} />
        <StatCard title="Hotels Confirmed Today" value={hotelsConfirmedToday ?? 0} color="green" icon={<CheckCircle2 size={22} />} />
        <StatCard title="Notifications Sent (24h)" value={notifsSent ?? 0} color="purple" icon={<Bell size={22} />} />
      </div>

      {/* Reply tracking stats */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Replies Received Today</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Hotel WhatsApp Replies" value={whatsappRepliesCount ?? 0} color="green" icon={<MessageCircle size={22} />} />
        <StatCard title="Hotel Email Confirmations" value={emailConfirmationsCount ?? 0} color="blue" icon={<Mail size={22} />} />
        <StatCard title="Traveler WhatsApp Replies" value={travelerRepliesCount ?? 0} color="purple" icon={<MessageCircle size={22} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions />
        <RecentReplies entries={recentReplies} />
      </div>
    </div>
  )
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        <span className="opacity-60">{icon}</span>
      </div>
    </div>
  )
}

function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="space-y-3">
        <ActionLink href="/flights/import" label="Import Flight Bookings" desc="Upload CSV with traveler & flight data" icon={<Upload size={18} />} />
        <ActionLink href="/hotels/import" label="Import Hotel Bookings" desc="Upload CSV with hotel booking data" icon={<Upload size={18} />} />
        <ActionLink href="/flights" label="View All Flights" desc="Check status and send notifications" icon={<ClipboardList size={18} />} />
        <ActionLink href="/hotels" label="View All Hotels" desc="Track confirmation status" icon={<ClipboardList size={18} />} />
      </div>
    </div>
  )
}

function ActionLink({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: React.ReactNode }) {
  return (
    <a href={href} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-gray-500 text-xs">{desc}</p>
      </div>
    </a>
  )
}

function RecentReplies({ entries }: { entries: Array<{ kind: string; id: string; label: string; channel: 'email' | 'whatsapp'; time: string }> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Recent Replies</h2>
      {!entries.length ? (
        <p className="text-gray-400 text-sm">No replies received yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.kind + entry.id} className="flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${entry.channel === 'whatsapp' ? 'text-green-500' : 'text-blue-500'}`}>
                {entry.channel === 'whatsapp' ? <MessageCircle size={15} /> : <Mail size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{entry.label}</p>
                <p className="text-xs text-gray-400">{new Date(entry.time).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
