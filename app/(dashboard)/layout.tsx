import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { LayoutDashboard, Plane, FolderInput, Building2, LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 flex flex-col fixed inset-y-0">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">TA</div>
            <div>
              <p className="text-white font-semibold text-sm">Travel Alerts</p>
              <p className="text-gray-400 text-xs">Corporate Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" label="Dashboard" icon={<LayoutDashboard size={16} />} />
          <div className="pt-4 pb-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-3">Flights</p>
          </div>
          <NavLink href="/flights" label="All Bookings" icon={<Plane size={16} />} />
          <NavLink href="/flights/import" label="Import CSV" icon={<FolderInput size={16} />} />
          <div className="pt-4 pb-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-3">Hotels</p>
          </div>
          <NavLink href="/hotels" label="All Bookings" icon={<Building2 size={16} />} />
          <NavLink href="/hotels/import" label="Import CSV" icon={<FolderInput size={16} />} />
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs truncate mb-2">{session.email}</p>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </Link>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
