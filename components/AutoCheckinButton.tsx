'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface Props {
  bookingId: string
  pnr: string
  flightNumber: string
  airline: string | null
  alreadyCheckedIn?: boolean
}

/**
 * "Virtual Employee" auto check-in button.
 * Triggers Playwright to visit Air India / IndiGo website,
 * complete web check-in, and send the PDF to the traveler.
 */
export default function AutoCheckinButton({ bookingId, pnr, flightNumber, airline, alreadyCheckedIn }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'captcha' | 'error'>(
    alreadyCheckedIn ? 'done' : 'idle'
  )
  const [errorMsg, setErrorMsg] = useState('')

  const supported = airline === 'AI' || airline === '6E' || airline === 'UK' || airline === 'QP' || airline === 'SG' || airline === 'IX'
  const airlineName =
    airline === '6E' ? 'IndiGo' :
    airline === 'QP' ? 'Akasa Air' :
    airline === 'SG' ? 'SpiceJet' :
    airline === 'IX' ? 'Air India Express' : 'Air India'

  async function handleAutoCheckin() {
    setStatus('running')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/flights/${bookingId}/auto-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'CAPTCHA_REQUIRED') {
          setStatus('captcha')
          notify({
            type: 'error',
            title: '🤖 CAPTCHA Detected',
            message: 'Airline blocked automated check-in. Please complete check-in manually on the airline site.',
          })
        } else if (data.error === 'Boarding pass has not been issued yet') {
          setStatus('error')
          setErrorMsg('Boarding pass has not been issued yet')
          notify({
            type: 'error',
            title: 'Boarding pass has not been issued yet',
            message: data.message || 'Web check-in opens 48 hours before departure date.',
          })
        } else {
          setStatus('error')
          setErrorMsg(data.error || 'Auto check-in failed')
          notify({ type: 'error', title: 'Auto Check-in Failed', message: data.error || 'Unknown error' })
        }
        return
      }

      setStatus('done')
      notify({
        type: 'success',
        title: '🎟️ Web Check-in Complete!',
        message: `Boarding pass for PNR ${pnr} dispatched via Email & WhatsApp.`,
      })
      router.refresh()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Request failed')
      notify({ type: 'error', title: 'Request Failed', message: 'Could not reach the server' })
    }
  }

  if (!supported) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-400 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-200">
        <Bot size={14} />
        Auto Check-in not available for {airline || 'this airline'}
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs">
        <CheckCircle2 size={14} />
        Web Check-in Done · Pass Sent
      </div>
    )
  }

  if (status === 'captcha') {
    return (
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold px-4 py-2 rounded-xl text-xs">
          <AlertTriangle size={14} />
          CAPTCHA blocked — check airline site manually
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 font-semibold px-3 py-1.5 rounded-xl text-xs">
          <AlertTriangle size={13} />
          {errorMsg.substring(0, 60)}
        </div>
        <button
          onClick={handleAutoCheckin}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
        >
          <RefreshCw size={12} /> Retry Auto Check-in
        </button>
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 font-bold px-4 py-2 rounded-xl text-xs animate-pulse">
        <Loader2 size={14} className="animate-spin" />
        Bot checking in on {airlineName} website…
      </div>
    )
  }

  return (
    <button
      onClick={handleAutoCheckin}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all text-xs cursor-pointer"
    >
      <Bot size={14} />
      Auto Web Check-in
      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
        {airlineName}
      </span>
    </button>
  )
}
