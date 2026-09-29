'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, CheckCircle2, Loader2 } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface Props {
  bookingId: string
  pnr: string
  alreadySent?: boolean
}

/**
 * "Virtual Employee" — sends the digital boarding pass (email + WhatsApp)
 * directly to the traveller, replacing the manual check-in workflow.
 */
export default function SendBoardingPassButton({ bookingId, pnr, alreadySent }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadySent ?? false)

  async function handleSend() {
    setLoading(true)
    try {
      const res = await fetch('/api/flights/boarding-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIds: [bookingId] }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'Boarding pass has not been issued yet') {
          notify({
            type: 'error',
            title: 'Boarding pass has not been issued yet',
            message: data.message || 'Web check-in opens 48 hours before departure date.',
          })
          return
        }
        throw new Error(data.error || 'Dispatch failed')
      }

      setDone(true)
      notify({
        type: 'success',
        title: '🎟️ Boarding Pass Dispatched!',
        message: `Pass for PNR ${pnr} sent to traveller via Email & WhatsApp.`,
      })
      router.refresh()
    } catch (err: unknown) {
      notify({
        type: 'error',
        title: 'Dispatch Failed',
        message: err instanceof Error ? err.message : 'Could not send boarding pass',
      })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs">
        <CheckCircle2 size={14} />
        Boarding Pass Sent
      </div>
    )
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Ticket size={14} />
      )}
      {loading ? 'Dispatching Pass…' : 'Send Boarding Pass'}
    </button>
  )
}
