'use client'

import { useState, useEffect, use } from 'react'
import { Building2, CheckCircle2, XCircle, Calendar, User, FileText, Send, ShieldCheck, Hash } from 'lucide-react'

interface BookingInfo {
  id: string
  hotel_name: string
  booking_ref: string
  traveler_name: string
  check_in_date: string
  check_out_date: string
  room_type?: string
  num_rooms?: number
  confirmation_status: string
  hcn?: string
  notes?: string
}

export default function HotelConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedStatus, setSubmittedStatus] = useState<'confirmed' | 'cancelled' | null>(null)

  // Form state
  const [hcn, setHcn] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/hotels/confirm/${token}`)
        const data = await res.json()
        if (!res.ok || !data.booking) {
          setError(data.error || 'Booking not found or link expired.')
        } else {
          setBooking(data.booking)
          if (data.booking.hcn) setHcn(data.booking.hcn)
          if (data.booking.notes) setNotes(data.booking.notes)
          if (data.booking.confirmation_status === 'confirmed') setSubmittedStatus('confirmed')
          if (data.booking.confirmation_status === 'cancelled') setSubmittedStatus('cancelled')
        }
      } catch {
        setError('Failed to load booking details.')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [token])

  async function handleDecision(action: 'confirm' | 'decline') {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/hotels/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hcn, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmittedStatus(action === 'confirm' ? 'confirmed' : 'cancelled')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing confirmation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading Reservation Details…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <XCircle size={36} />
          </div>
          <h2 className="text-xl font-extrabold mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
        </div>
      </div>
    )
  }

  if (submittedStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-emerald-500/30 rounded-3xl p-8 text-center text-white shadow-2xl animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={40} />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            RESERVATION CONFIRMED
          </span>
          <h2 className="text-2xl font-black mt-3">Booking Reconfirmed!</h2>
          <p className="text-slate-300 text-xs mt-2 leading-relaxed">
            Thank you, <strong className="text-white">{booking?.hotel_name}</strong>. Reservation Ref <strong className="text-emerald-400">{booking?.booking_ref}</strong> for <strong className="text-white">{booking?.traveler_name}</strong> has been marked confirmed.
          </p>
          {hcn && (
            <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-xs text-slate-300 font-mono inline-block">
              Hotel Confirmation #: <strong className="text-white">{hcn}</strong>
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-6">Automated notification dispatched to traveler email & WhatsApp.</p>
        </div>
      </div>
    )
  }

  if (submittedStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/30 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <XCircle size={40} />
          </div>
          <h2 className="text-xl font-black">Reservation Declined</h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Booking ref <strong className="text-white">{booking?.booking_ref}</strong> has been marked unavailable. Corporate travel desk has been alerted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-teal-500 to-emerald-500 text-white rounded-2xl shadow-lg shadow-teal-500/20">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white leading-tight">{booking?.hotel_name}</h1>
              <p className="text-teal-400 text-xs font-semibold">1-Click Hotel Confirmation Portal</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full text-[10px] font-bold tracking-wider uppercase">
            VERIFIED LINK
          </div>
        </div>

        {/* Booking Details Card Grid */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} /> BOOKING REF
              </p>
              <p className="text-sm font-extrabold text-white mt-1 font-mono">{booking?.booking_ref}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User size={12} /> GUEST NAME
              </p>
              <p className="text-sm font-extrabold text-white mt-1">{booking?.traveler_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700/40">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> CHECK-IN
              </p>
              <p className="text-xs font-extrabold text-emerald-400 mt-1">{booking?.check_in_date}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> CHECK-OUT
              </p>
              <p className="text-xs font-extrabold text-teal-400 mt-1">{booking?.check_out_date}</p>
            </div>
          </div>
        </div>

        {/* Form Inputs for Hotel Desk */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Hash size={14} className="text-teal-400" /> Hotel Confirmation Number (HCN) <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={hcn}
              onChange={e => setHcn(e.target.value)}
              placeholder="e.g. HCN-984210"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-teal-400" /> Reconfirmation Notes / Special Instructions <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Deluxe Room confirmed with breakfast included."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleDecision('decline')}
            disabled={submitting}
            className="bg-slate-800 hover:bg-rose-900/30 text-rose-400 border border-rose-500/30 font-bold py-3.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            Decline / Fully Booked
          </button>
          <button
            onClick={() => handleDecision('confirm')}
            disabled={submitting}
            className="bg-gradient-to-r from-teal-500 via-emerald-600 to-sky-600 hover:from-teal-400 hover:to-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              'Submitting…'
            ) : (
              <>
                <Send size={15} /> Confirm Reservation
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-teal-500" />
          VeloTrav Corporate Travel Desk · Secure Confirmation Token
        </div>
      </div>
    </div>
  )
}
