'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface TrackResult {
  checked: number
  updated: number
  alerts_sent: number
  message?: string
  success?: boolean
}

export default function LiveTrackerControl() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)
  const [error, setError] = useState('')

  async function handleRunTracking() {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/flights/track', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Flight tracking failed')
      setResult(data)
      router.refresh()

      notify({
        type: data.alerts_sent > 0 ? 'success' : 'info',
        title: 'Flight Radar Tracking Complete! ⚡',
        message: `Polled ${data.checked} flight(s). Updated ${data.updated} status(es). Dispatched ${data.alerts_sent} delay alert(s).`,
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to execute tracking'
      setError(errMsg)
      notify({
        type: 'error',
        title: 'Tracking Failed',
        message: errMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-[#091936] via-[#0f2754] to-[#091936] text-white rounded-2xl p-4 shadow-sm border border-blue-600/30 mb-6 transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sky-300 shrink-0 shadow-inner">
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white">AirLabs & AviationStack Live Tracker</h3>
              <span className="bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Status Radar
              </span>
            </div>
            <p className="text-sky-100/70 text-[11px] mt-0.5">
              Poll live flight radar for delay minutes, terminal/gate updates, and automated alert dispatching.
            </p>
          </div>
        </div>

        {/* Compact Poll Button */}
        <button
          onClick={handleRunTracking}
          disabled={loading}
          className="bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold px-3.5 py-1.5 rounded-full shadow-md hover:shadow-sky-500/20 transition-all text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Polling Radar…' : '⚡ Track Flights'}
        </button>
      </div>

      {/* Result Status Alert Banner */}
      {result && (
        <div className="mt-3 pt-2.5 border-t border-blue-800/50 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-blue-950/60 p-2.5 rounded-xl text-white">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 size={14} />
            <span>Tracking Complete!</span>
          </div>
          <div className="flex items-center gap-3 text-slate-200 font-medium">
            <span>✈️ Checked: <strong className="text-sky-300">{result.checked}</strong></span>
            <span>🔄 Updated: <strong className="text-amber-300">{result.updated}</strong></span>
            <span>📩 Alerts Sent: <strong className="text-emerald-400">{result.alerts_sent}</strong></span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2 font-medium">
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
