import Link from 'next/link'
import AnimatedHeroBanner from '@/components/AnimatedHeroBanner'
import { ToastContainer } from '@/components/ToastNotification'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { ThemeToggle } from '@/components/SupabaseProvider'

import {
  LayoutDashboard, Plane, FolderInput, Building2, LogOut,
  Activity, Bell, Settings, Radio, ShieldCheck, ChevronRight,
} from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-800 transition-colors duration-300">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#050b17] via-[#091428] to-[#050b17] text-white shadow-lg border-b border-sky-900/30 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              VT
            </div>
            <div className="leading-none">
              <span className="text-2xl font-black tracking-tight text-white">velo<span className="text-sky-400 font-extrabold">trav</span></span>
              <span className="block text-[9px] font-bold tracking-widest text-sky-400 uppercase mt-0.5">Corporate Travel Alert Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <ThemeToggle />

            <div className="flex items-center gap-2 bg-slate-800/60 px-3.5 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span>Monitoring Center Live</span>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <span className="text-slate-300 font-medium">{session.email}</span>
              <a href="/api/auth/signout" className="bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full border border-slate-700/60 hover:border-rose-500 transition-all font-semibold shadow-sm">
                Logout
              </a>
            </div>
          </div>

        </div>
      </header>

      {/* Hero Header Area */}
      <AnimatedHeroBanner />

      {/* Main Content Area */}
      <main className="relative z-20 max-w-[1200px] mx-auto px-6 -mt-12 pb-16">
        {children}
      </main>

      <ToastContainer />
    </div>

  )
}



