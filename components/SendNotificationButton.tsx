'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface SendNotificationButtonProps {
  bookingId: string
  type: 'flight' | 'hotel'
  label?: string
}

export default function SendNotificationButton({ bookingId, type, label }: SendNotificationButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    const endpoint = type === 'flight' ? '/api/flights/notify' : '/api/hotels/notify'
    const body = { bookingIds: [bookingId] }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to dispatch notification')

      notify({
        type: 'success',
        title: 'Notification Sent! 🚀',
        message: `Successfully dispatched ${type} confirmation email & WhatsApp message.`,
      })

      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send'
      notify({
        type: 'error',
        title: 'Dispatch Failed',
        message: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
    >
      <Send size={14} className={loading ? 'animate-pulse' : ''} />
      {loading ? 'Sending Alerts…' : (label || `Send ${type === 'flight' ? 'Flight' : 'Hotel'} Alerts`)}
    </button>
  )
}
