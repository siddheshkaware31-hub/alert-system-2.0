import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import {
  LayoutDashboard, Plane, FolderInput, Building2, LogOut,
  Activity, Bell, Settings, Radio, ShieldCheck, ChevronRight,
} from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="dashboard-shell flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#1e2a3a] bg-[#090f1b]/95 backdrop-blur-xl">
        <div className="border-b border-[#1e2a3a] px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold text-white shadow-[0_0_24px_rgba(79,140,255,0.25)]">
              TA
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#090f1b]" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">TRAVEL AI</p>
              <p className="text-[11px] text-slate-500">Operations Center</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <NavLink href="/dashboard" label="Command Center" icon={<LayoutDashboard size={16} />} />

          <Section label="Flight Operations" />
          <NavLink href="/flights" label="Live Flights" icon={<Plane size={16} />} />
          <NavLink href="/flights/import" label="Import Flight Data" icon={<FolderInput size={16} />} />

          <Section label="Hotel Operations" />
          <NavLink href="/hotels" label="Reservations" icon={<Building2 size={16} />} />
          <NavLink href="/hotels/import" label="Import Hotel Data" icon={<FolderInput size={16} />} />

          <Section label="Communications" />
          <NavLink href="/dashboard" label="Notification Activity" icon={<Bell size={16} />} />
          <NavLink href="/dashboard" label="System Activity" icon={<Activity size={16} />} />

          <Section label="System" />
          <NavLink href="/dashboard" label="Monitoring" icon={<Radio size={16} />} />
          <NavLink href="/dashboard" label="Settings" icon={<Settings size={16} />} />
        </nav>

        <div className="border-t border-[#1e2a3a] p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-300">System Online</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] text-slate-500">{session.email}</p>
            <Link href="/api/auth/signout" title="Sign out" className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white">
              <LogOut size={14} />
            </Link>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#1e2a3a] bg-[#070b14]/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            Monitoring active
          </div>
          <div className="font-mono text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </header>
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  )
}

function Section({ label }: { label: string }) {
  return <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</p>
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-400 transition hover:bg-white/[0.045] hover:text-white">
      <span className="text-slate-500 transition group-hover:text-blue-400">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={13} className="opacity-0 transition group-hover:opacity-50" />
    </Link>
  )
}
