'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { Upload, AlertTriangle, FileSpreadsheet, FileText, Sparkles, Plane, Building2, CheckCircle2 } from 'lucide-react'
import { notify } from '@/components/ToastNotification'

interface ImportResult {
  batchId: string
  successRows: number
  failedRows: number
  errors: Array<{ row: number; error: string }>
  summary?: { awaitingReply?: number; confirmed?: number; cancelled: number; pending: number }
  notifications?: { queued: number; sent: number; failed: number }
}

type ImportMode = 'velocity-xlsx' | 'standard-csv'

export default function HotelImportPage() {
  const [mode, setMode] = useState<ImportMode>('velocity-xlsx')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ sent: number; failed: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleModeChange(m: ImportMode) {
    setMode(m)
    setFile(null)
    setResult(null)
    setError('')
    setNotifyResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    const startTime = Date.now()

    const form = new FormData()
    form.append('file', file)

    const endpoint = mode === 'velocity-xlsx' ? '/api/hotels/import-xlsx' : '/api/hotels/import'

    try {
      const res = await fetch(endpoint, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      // Ensure Hotel Keycard Pulse animation is visible for at least 1.8s
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
      const res = await fetch('/api/hotels/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: result.batchId }),
      })
      const data = await res.json()
      setNotifyResult({ sent: data.sent, failed: data.failed })

      if (data.sent > 0) {
        notify({
          type: 'success',
          title: 'Hotel Reconfirmations Dispatched! 🏨',
          message: `Successfully delivered ${data.sent} reconfirmation request(s) via 1-click token links & WhatsApp.`,
        })
      }
      if (data.failed > 0) {
        notify({
          type: 'error',
          title: 'Dispatch Issue Detected',
          message: `${data.failed} hotel reconfirmation alert(s) failed. Check email & phone inputs.`,
        })
      }
    } catch {
      setError('Failed to send notifications')
      notify({
        type: 'error',
        title: 'Network Error',
        message: 'Could not connect to hotel notification service.',
      })
    } finally {
      setNotifying(false)
    }
  }

  const accept = '.csv,.xlsx,.xls'
  const acceptLabel = mode === 'velocity-xlsx' ? 'Excel or CSV file (.xlsx, .csv)' : 'CSV or Excel file (.csv, .xlsx)'

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
        <Link href="/flights/import" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Upload size={18} /> Import Flights
        </Link>
        <Link href="/hotels" className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-slate-800 shrink-0">
          <Building2 size={18} /> Reservations
        </Link>
        <Link href="/hotels/import" className="flex items-center gap-2 pb-3 border-b-2 border-blue-600 text-blue-600 font-bold shrink-0">
          <Upload size={18} /> Import Hotels
        </Link>
      </div>

      {/* File Format Selection Pills */}
      <div className="flex border-b border-slate-200 gap-6 mb-8 pb-2 font-semibold text-xs text-slate-500">
        <button
          onClick={() => handleModeChange('velocity-xlsx')}
          className={`flex items-center gap-2 pb-2 border-b-2 transition-all font-extrabold ${
            mode === 'velocity-xlsx'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={16} />
          Velocity Reconfirmation (.xlsx)
        </button>
        <button
          onClick={() => handleModeChange('standard-csv')}
          className={`flex items-center gap-2 pb-2 border-b-2 transition-all font-extrabold ${
            mode === 'standard-csv'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          Standard Hotel CSV
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-900">Import Hotel Bookings</h2>
        <p className="text-slate-500 text-xs mt-1">Select and upload your booking sheets to sync confirmation statuses across email and WhatsApp alerts.</p>
      </div>

      {mode === 'velocity-xlsx' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold mb-1 text-amber-800">
            <AlertTriangle size={16} /> Velocity Reconfirmation 2026 Sheet
          </div>
          <p className="text-slate-600">Booking statuses are read directly from the sheet columns (<span className="font-semibold text-slate-900">Reconfirmed / Pending / Cancelled</span>). Expected columns: VEL ID, Guest Name, Hotel Name, HCN, Reconfirmed Status.</p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-xs text-blue-900">
          <div className="font-bold mb-1">Required CSV Format</div>
          <p className="font-mono bg-white border border-blue-100 p-2 rounded-lg text-[11px] overflow-x-auto text-slate-700">
            hotel_name, hotel_email, hotel_phone, booking_ref, check_in_date, check_out_date, room_type, num_rooms, traveler_name, traveler_email, traveler_phone
          </p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href="/hotel_sample.csv"
              download="hotel_sample.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-all"
            >
              📥 Download Sample CSV
            </a>
            <a
              href="/hotel_sample.xlsx"
              download="hotel_sample.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all"
            >
              📊 Download Sample Excel (.xlsx)
            </a>
          </div>
        </div>
      )}

      {/* Dropzone Box */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer bg-slate-50/60 mb-6"
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex justify-center mb-2">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
            <Upload size={22} />
          </div>
        </div>
        <p className="text-slate-800 font-bold text-xs">Click to select {acceptLabel}</p>
        <p className="text-slate-400 text-[11px] mt-0.5">or drag and drop your file here</p>
        {file && (
          <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold shadow-sm">
            <FileSpreadsheet size={14} /> {file.name}
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
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
          {loading ? 'Processing Upload…' : 'UPLOAD & START IMPORT'}
        </button>
      </div>

      {/* Results */}
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
          {mode === 'standard-csv' && result.successRows > 0 && (
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md text-xs tracking-wider uppercase transition-all"
            >
              {notifying ? 'Dispatching Requests…' : `Request Confirmation from ${result.successRows} Hotel(s)`}
            </button>
          )}
        </div>
      )}

      {/* Hotel Import Animated Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden animate-fade-in">
            {/* Background Decorative Grid */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Hotel Building & Keycard Animation Scene */}
            <div className="relative h-36 flex items-center justify-center mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#06181f] via-[#0e3543] to-[#071e28] border border-teal-500/20 shadow-inner">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-teal-600/10 via-transparent to-transparent" />
              
              {/* Concentric pulse rings */}
              <div className="absolute h-28 w-28 rounded-full border border-teal-400/15 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="absolute h-20 w-20 rounded-full border border-emerald-400/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
              
              {/* Floating room key particles */}
              <div className="absolute top-3 left-6 text-teal-400/30 animate-bounce" style={{ animationDuration: '3s' }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
              </div>
              <div className="absolute bottom-4 right-7 text-emerald-400/25 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
              </div>
              <div className="absolute top-5 right-12 text-sky-400/20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1.2s' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm-7 4V3h16v18H4zM6 1v22h12V1H6z"/></svg>
              </div>

              {/* Main building icon with glow */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-sky-500 text-white shadow-lg shadow-teal-500/40 animate-hotel-pulse relative z-10">
                <Building2 size={36} strokeWidth={2.2} />
              </div>
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Importing Hotel Manifest...</h3>
            <p className="text-slate-500 text-xs mt-2 font-medium leading-relaxed">
              Reading reservation references, generating 1-click token links & configuring WhatsApp webhooks.
            </p>

            {/* Step Ticker */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Parsing Rooms
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Syncing Tokens
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full animate-pulse" style={{ animationDelay: '1s' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Webhooks
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mt-5 overflow-hidden border border-slate-200/80">
              <div className="h-full w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

