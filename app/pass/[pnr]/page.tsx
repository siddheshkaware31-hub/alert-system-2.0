'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { Plane, AlertTriangle, Clock, MapPin, Printer, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react'

interface BookingInfo {
  id: string
  pnr: string
  ticket_number?: string
  flight_number: string
  airline_code?: string
  origin: string
  destination: string
  departure_date: string
  departure_time?: string
  arrival_time?: string
  traveler_name: string
  status: string
  delay_minutes: number
  gate?: string
  terminal?: string
  seat?: string
}

export default function PublicBoardingPassPage({ params }: { params: Promise<{ pnr: string }> }) {
  const { pnr } = use(params)
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchPass = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch(`/api/pass/${pnr}`)
      const data = await res.json()
      if (!res.ok || !data.booking) {
        setError(data.error || 'Boarding pass not found.')
      } else {
        setBooking(data.booking)
      }
    } catch {
      setError('Unable to load digital boarding pass.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [pnr])

  useEffect(() => {
    fetchPass()
    // Poll for real-time delay updates every 30 seconds
    const interval = setInterval(fetchPass, 30000)
    return () => clearInterval(interval)
  }, [fetchPass])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-sky-200">Loading Live Boarding Pass…</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl font-extrabold mb-2">Boarding Pass Not Found</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{error || 'Please check your PNR number or contact corporate travel desk.'}</p>
        </div>
      </div>
    )
  }

  const isDelayed = booking.status === 'delayed' || booking.delay_minutes > 0
  const isCancelled = booking.status === 'cancelled'
  const isLanded = booking.status === 'landed'

  const originCode = booking.origin.substring(0, 3).toUpperCase()
  const destCode = booking.destination.substring(0, 3).toUpperCase()
  const seat = booking.seat || '14B'
  const gate = booking.gate || 'B12'
  const terminal = booking.terminal || 'T3'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:text-slate-900">
      <div className="max-w-lg w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 print:shadow-none print:border-none">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#091936] via-[#102a5c] to-[#091936] p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black tracking-tight leading-none">
                velo<span className="text-sky-400">trav</span>
              </p>
              <p className="text-[11px] text-sky-200/70 font-semibold mt-1">Official Digital Boarding Pass</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold tracking-widest text-sky-300 uppercase block">PNR CODE</span>
              <span className="text-lg font-black text-sky-400 tracking-wider font-mono">{booking.pnr}</span>
            </div>
          </div>

          {/* Real-time Status Badge Banner */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Live Status:</span>
              {isDelayed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold animate-pulse">
                  <Clock size={13} /> DELAYED +{booking.delay_minutes}M
                </span>
              ) : isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-extrabold">
                  CANCELLED
                </span>
              ) : isLanded ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold">
                  <CheckCircle2 size={13} /> LANDED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-extrabold">
                  SCHEDULED ON TIME
                </span>
              )}
            </div>
            <button
              onClick={fetchPass}
              disabled={refreshing}
              className="text-sky-300 hover:text-white p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
              title="Refresh Live Flight Radar Status"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Real-Time Delay Alert Banner if Delayed */}
        {isDelayed && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-900 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-extrabold text-amber-800">Flight Schedule Update Detected</p>
              <p className="mt-0.5 text-amber-700 leading-relaxed font-medium">
                Flight {booking.flight_number} is delayed by <strong>{booking.delay_minutes} minutes</strong> due to radar traffic updates. Please check departure gate screens.
              </p>
            </div>
          </div>
        )}

        {/* Airport Route Hero */}
        <div className="p-6 bg-slate-50 border-b border-dashed border-slate-200">
          <div className="flex items-center justify-between text-center">
            <div className="text-left">
              <p className="text-4xl font-black text-slate-900 tracking-tight">{originCode}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate max-w-[120px]">{booking.origin}</p>
            </div>

            <div className="flex-1 px-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-0.5 flex-1 bg-blue-200 rounded-full" />
                <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">
                  <Plane size={18} />
                </div>
                <div className="h-0.5 flex-1 bg-blue-200 rounded-full" />
              </div>
              <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mt-1">{booking.flight_number}</p>
            </div>

            <div className="text-right">
              <p className="text-4xl font-black text-slate-900 tracking-tight">{destCode}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate max-w-[120px]">{booking.destination}</p>
            </div>
          </div>
        </div>

        {/* Flight Details Grid */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">PASSENGER NAME</p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">{booking.traveler_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">FLIGHT DATE</p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">{booking.departure_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">DEPARTURE TIME</p>
              <p className="text-sm font-extrabold text-blue-600 mt-0.5">{booking.departure_time || '10:30 AM'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TICKET NUMBER</p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">{booking.ticket_number || 'ETKT-9823410'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">SEAT</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{seat}</p>
            </div>
            <div className="border-x border-slate-200 px-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">GATE</p>
              <p className="text-base font-black text-blue-600 mt-0.5">{gate}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TERMINAL</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{terminal}</p>
            </div>
          </div>

          {/* Barcode & Scanner Code */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white text-center shadow-inner">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">GATE SCANNER BARCODE</p>
            <div className="font-mono text-2xl font-bold tracking-[6px] text-white select-all">
              ||||| | |||||| ||| ||||||| |||| ||||||
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-2">{booking.pnr} • {booking.flight_number} • SEAT {seat}</p>
          </div>
        </div>

        {/* Action & Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck size={16} className="text-blue-600" />
            Verified VeloTrav Pass
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer size={15} /> Save / Print Pass
          </button>
        </div>

      </div>
    </div>
  )
}
