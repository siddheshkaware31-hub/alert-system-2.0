'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import { use } from 'react'

interface EntityDetails {
  flight_number?: string
  origin?: string
  destination?: string
  departure_date?: string
  traveler_name?: string
  pnr?: string
  hotel_name?: string
  booking_ref?: string
  check_in_date?: string
  check_out_date?: string
}

interface FeedbackData {
  entityType: 'flight' | 'hotel'
  entityDetails: EntityDetails
  rating: number | null
  submitted: boolean
}

export default function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback?token=${token}`)
      if (!res.ok) { setError('Invalid or expired feedback link.'); return }
      const json = await res.json()
      setData(json)
      if (json.submitted) setSubmitted(true)
      if (json.rating) setSelectedRating(json.rating)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    if (selectedRating === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating: selectedRating, comment }),
      })
      if (res.ok) setSubmitted(true)
      else setError('Failed to submit. Please try again.')
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-semibold">Loading...</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">😔</p>
          <p className="text-slate-800 font-bold text-lg">{error}</p>
        </div>
      </div>
    )
  }

  const d = data!.entityDetails
  const isHotel = data!.entityType === 'hotel'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#050b17] via-[#091428] to-[#050b17] text-white py-6 px-6">
        <div className="max-w-lg mx-auto">
          <p className="text-2xl font-black">velo<span className="text-sky-400">trav</span></p>
          <p className="text-[10px] font-bold tracking-widest text-sky-400 uppercase mt-1">Rate Your Experience</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
            <p className="text-slate-500">Your feedback has been recorded. We appreciate you taking the time to share your experience.</p>
            {selectedRating > 0 && (
              <div className="flex justify-center gap-1 mt-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={28} className={i <= selectedRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Trip Details */}
            <div className={`p-6 ${isHotel ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-600 to-indigo-700'} text-white`}>
              <p className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-2">
                {isHotel ? '🏨 Hotel Stay' : '✈️ Flight'}
              </p>
              {isHotel ? (
                <>
                  <h2 className="text-xl font-bold">{d.hotel_name}</h2>
                  <p className="text-sm opacity-80 mt-1">Ref: {d.booking_ref} · {d.check_in_date} → {d.check_out_date}</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{d.flight_number} · {d.origin} → {d.destination}</h2>
                  <p className="text-sm opacity-80 mt-1">PNR: {d.pnr} · {d.departure_date}</p>
                </>
              )}
              <p className="text-sm mt-2">Hi {d.traveler_name}!</p>
            </div>

            {/* Rating */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">How was your experience?</h3>
              <p className="text-sm text-slate-500 mb-6">Tap a star to rate</p>

              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onClick={() => setSelectedRating(i)}
                    onMouseEnter={() => setHoveredRating(i)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        i <= (hoveredRating || selectedRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {selectedRating > 0 && (
                <p className="text-center text-sm font-semibold text-slate-600 mb-6">
                  {ratingLabels[selectedRating]}
                </p>
              )}

              {/* Comment */}
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Any additional comments? (optional)"
                className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-800 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={selectedRating === 0 || submitting}
                className={`w-full mt-4 py-3.5 rounded-xl font-bold text-white transition-all ${
                  selectedRating > 0
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>

              {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
