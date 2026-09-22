'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { Upload, Sparkles, Plane, Building2, CheckCircle2, XCircle } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface ImportResult {
  batchId: string
  successRows: number
  failedRows: number
  errors: Array<{ row: number; error: string }>
}

export default function FlightImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ sent: number; failed: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    const startTime = Date.now()

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/flights/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      // Ensure Flight Takeoff animation is visible for at least 1.8s
      const elapsed = Date.now() - startTime
      if (elapsed < 1800) await new Promise(r => setTimeout(r, 1800 - elapsed))

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleNotify() {
    if (!result?.batchId) return
    setNotifying(true)
    try {
      const res = await fetch('/api/flights/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: result.batchId }),
      })
      const data = await res.json()
      setNotifyResult({ sent: data.sent, failed: data.failed })

      if (data.sent > 0) {
        notify({
          type: 'success',
          title: 'Flight Confirmations Dispatched! ✈️',
          message: `Successfully sent ${data.sent} digital boarding pass email(s) & WhatsApp alerts.`,
          details: data.results?.map((r: { id: string; email: string; whatsapp: string }) => 
            `Booking #${r.id.slice(0, 8)}: Email [${r.email}], WhatsApp [${r.whatsapp}]`
          ),
        })
      }
      if (data.failed > 0) {
        notify({
          type: 'error',
          title: 'Dispatch Issue Detected',
          message: `${data.failed} alert(s) failed to send. Check SMTP logs or phone number formatting.`,
        })
      }
    } catch {
      setError('Failed to send notifications')
      notify({
        type: 'error',
        title: 'Network Error',
        message: 'Could not connect to flight notification dispatch service.',
      })
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 max-w-6xl mx-auto">
      {/* Top Operations Navigation */}
      <div className="flex border-b border-slate-200 gap-8 mb-8 pb-3 font-semibold text-sm text-slate-500 overflow-x-auto">
        <Link href="/dashboard" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Sparkles size={18} /> Command Center
        </Link>
        <Link href="/flights" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Plane size={18} /> Live Flights
        </Link>
        <Link href="/flights/import" className="flex items-center gap-2 pb-3 border-b-2 border-blue-600 text-blue-600 font-bold shrink-0">
          <Upload size={18} /> Import Flights
        </Link>
        <Link href="/hotels" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Building2 size={18} /> Reservations
        </Link>
        <Link href="/hotels/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Hotels
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-900">Import Flight Bookings</h2>
        <p className="text-slate-500 text-xs mt-1">Upload a CSV file with flight booking data to import travelers and dispatch flight boarding alerts.</p>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-xs text-blue-900">
        <div className="font-bold mb-1">Required CSV Format</div>
        <p className="font-mono bg-white border border-blue-100 p-2.5 rounded-xl text-[11px] overflow-x-auto text-slate-700">
          pnr, ticket_number, flight_number, airline_code, origin, destination, departure_date, departure_time, arrival_time, traveler_name, traveler_email, traveler_phone
        </p>
        <p className="text-slate-500 text-[11px] mt-2">
          Required columns: <span className="font-semibold text-slate-800">pnr, flight_number, origin, destination, departure_date (YYYY-MM-DD), traveler_name, traveler_email, traveler_phone</span>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <a
            href="/flight_sample.csv"
            download="flight_sample.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-all"
          >
            📥 Download Sample CSV
          </a>
          <a
            href="/flight_sample.xlsx"
            download="flight_sample.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all"
          >
            📊 Download Sample Excel (.xlsx)
          </a>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer bg-slate-50/60 mb-6"
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex justify-center mb-2">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
            <Upload size={22} />
          </div>
        </div>
        <p className="text-slate-800 font-bold text-xs">Click to select CSV or Excel (.xlsx) file</p>
        <p className="text-slate-400 text-[11px] mt-0.5">or drag and drop your file here (.csv, .xlsx, .xls)</p>
        {file && (
          <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold shadow-sm">
            <Upload size={14} /> {file.name}
          </div>
        )}
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-semibold">{error}</div>
      )}

      {/* Pill Search Button (MakeMyTrip Style) */}
      <div className="flex justify-center">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white font-extrabold px-12 py-3.5 rounded-full shadow-lg transition-all disabled:opacity-40 text-sm tracking-wider uppercase"
        >
          {loading ? 'Processing File…' : 'UPLOAD & START IMPORT'}
        </button>
      </div>

      {/* Import Result */}
      {result && (
        <div className="mt-8 pt-8 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Import Result Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-emerald-600">{result.successRows}</p>
              <p className="text-slate-600 text-xs font-medium">Successfully Imported</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-400">{result.failedRows}</p>
              <p className="text-slate-500 text-xs font-medium">Failed Rows</p>
            </div>
          </div>

          {result.successRows > 0 && (
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              {notifying ? 'Sending Confirmations…' : `Send Flight Confirmations to ${result.successRows} Traveler(s)`}
            </button>
          )}

          {notifyResult && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between text-xs font-semibold shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span>Dispatch Summary: <strong className="text-emerald-400">{notifyResult.sent}</strong> email & WhatsApp alert(s) sent successfully.</span>
              </div>
              {notifyResult.failed > 0 && (
                <span className="text-rose-400 font-bold bg-rose-500/20 px-3 py-1 rounded-full">{notifyResult.failed} failed</span>
              )}
            </div>
          )}
        </div>
      )}
      {/* Flight Import Animated Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden animate-fade-in">
            {/* Background Decorative Grid */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Realistic Flying Airplane Graphic Box */}
            <div className="relative h-28 flex items-center justify-center mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#091936] via-[#102a5c] to-[#091936] border border-sky-500/30 shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/10 to-transparent animate-pulse" />
              <div className="flex items-center gap-2 animate-flight-takeoff">
                <div className="w-24 h-1 bg-gradient-to-l from-white/90 via-sky-300/40 to-transparent rounded-full blur-[1px]" />
                <svg className="w-12 h-12 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)] transform rotate-[85deg]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Importing Flight Manifest...</h3>
            <p className="text-slate-500 text-xs mt-2 font-medium leading-relaxed">
              Parsing PNRs, passenger tickets & syncing departure schedules with live AirLabs radar.
            </p>

            {/* Animated Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mt-6 overflow-hidden border border-slate-200/80">
              <div className="h-full w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
