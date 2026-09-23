'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Plane, Building2, Shield } from 'lucide-react'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1600&auto=format&fit=crop',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Full-Screen Crossfading Background */}
      {HERO_IMAGES.map((img, idx) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
            idx === heroIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className={`w-full h-full bg-cover bg-center transition-transform duration-[6000ms] ease-out ${
              idx === heroIndex ? 'scale-110' : 'scale-100'
            }`}
            style={{ backgroundImage: `url('${img}')` }}
          />
        </div>
      ))}

      {/* Dark Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050b17]/90 via-[#091936]/80 to-[#050b17]/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      {/* Top Left — Live Badge */}
      <div className="absolute top-6 left-8 z-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/90 text-xs font-bold tracking-wide">LIVE OPERATIONS ACTIVE</span>
        </div>
      </div>

      {/* Main Content — Centered Card on Hero */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-6">
        {/* VeloTrav Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-blue-600/30">
            VT
          </div>
          <div>
            <p className="font-extrabold text-white text-2xl leading-none">
              velo<span className="text-sky-400">trav</span>
            </p>
            <p className="text-sky-300/60 text-[11px] font-semibold mt-0.5 tracking-wide">
              Corporate Travel Alert Platform
            </p>
          </div>
        </div>

        {/* Hero Headline */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Corporate Travel
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Alert Operations
            </span>
          </h2>
          <p className="text-sky-200/60 text-sm mt-3 leading-relaxed max-w-sm mx-auto font-medium">
            Real-time boarding pass delivery, flight delay tracking, and automated hotel reconfirmations.
          </p>
        </div>

        {/* Sign-in Card — Glassmorphism on Hero */}
        <div className="bg-white/[0.07] border border-white/[0.12] backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/30">
          <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">Welcome back</h3>
          <p className="text-sky-300/50 text-sm font-medium mb-6">Sign in to your operations dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-sky-200/60 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-white/[0.12] rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 focus:bg-white/[0.1] transition-all placeholder:text-slate-500"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-sky-200/60 uppercase tracking-wider">
                  Password
                </label>
                <button type="button" className="text-[11px] text-sky-400 font-bold hover:text-sky-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-white/[0.12] rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/50 focus:bg-white/[0.1] transition-all placeholder:text-slate-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 text-sm tracking-wide group cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to Dashboard
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <Plane size={14} className="text-sky-400" />
            <span className="text-white/70 text-[11px] font-bold">Live Flight Radar</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <Building2 size={14} className="text-teal-400" />
            <span className="text-white/70 text-[11px] font-bold">Hotel Reconfirmation</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
            <Mail size={14} className="text-amber-400" />
            <span className="text-white/70 text-[11px] font-bold">Email & WhatsApp</span>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <Shield size={13} className="text-white/20" />
          <p className="text-white/25 text-[11px] font-semibold">
            256-bit SSL encrypted · Enterprise-grade security
          </p>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/[0.06] bg-black/20 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-around py-4 px-6">
          <div className="text-center">
            <p className="text-lg font-extrabold text-white">24/7</p>
            <p className="text-sky-300/40 text-[10px] font-semibold">Monitoring</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-extrabold text-white">2.4k+</p>
            <p className="text-sky-300/40 text-[10px] font-semibold">Alerts Sent</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-extrabold text-white">99.9%</p>
            <p className="text-sky-300/40 text-[10px] font-semibold">Uptime</p>
          </div>
        </div>
      </div>
    </div>
  )
}
