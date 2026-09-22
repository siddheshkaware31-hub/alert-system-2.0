'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sun, Moon } from 'lucide-react'

// Listens for Supabase auth state changes and calls router.refresh()
// so server components (layout, dashboard) stay in sync with the session.
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('velotrav_theme') as 'light' | 'dark' | null
    if (stored) {
      setTheme(stored)
      if (stored === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('velotrav_theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full border border-slate-700/60 transition-all text-xs font-semibold cursor-pointer"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      {theme === 'light' ? (
        <>
          <Moon size={14} className="text-sky-300" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun size={14} className="text-amber-400" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  )
}


