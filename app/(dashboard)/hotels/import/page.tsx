'use client'

import { useState, useRef } from 'react'
import { Upload, AlertTriangle, FileSpreadsheet, FileText } from 'lucide-react'

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

    const form = new FormData()
    form.append('file', file)

    const endpoint = mode === 'velocity-xlsx' ? '/api/hotels/import-xlsx' : '/api/hotels/import'

    try {
      const res = await fetch(endpoint, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
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
    } catch {
      setError('Failed to send notifications')
    } finally {
      setNotifying(false)
    }
  }

  const accept = mode === 'velocity-xlsx' ? '.xlsx,.xls' : '.csv'
  const acceptLabel = mode === 'velocity-xlsx' ? 'Excel file (.xlsx)' : 'CSV file'

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Hotel Bookings</h1>
        <p className="text-gray-500 mt-1">Upload hotel booking data to import into the system.</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleModeChange('velocity-xlsx')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            mode === 'velocity-xlsx'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FileSpreadsheet size={16} />
          Velocity Reconfirmation Sheet
        </button>
        <button
          onClick={() => handleModeChange('standard-csv')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            mode === 'standard-csv'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FileText size={16} />
          Standard CSV
        </button>
      </div>

      {mode === 'velocity-xlsx' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm mb-1">Live Data — No Notifications Will Be Sent</h3>
              <p className="text-amber-800 text-xs">
                This mode imports the <strong>Hotel Reconfirmation 2026</strong> Excel sheet. Booking statuses are
                read from the sheet (Reconfirmed / Cancelled / Pending) and stored. <strong>No WhatsApp or
                email messages are sent</strong> during this import.
              </p>
              <p className="text-amber-700 text-xs mt-2 font-medium">
                Expected columns: VEL ID · Check In Date · Guest Name · Hotel Name · Corporate Name ·
                Email status · Payment Status · Reconfirmed Status · HCN · COUNTRY · Supplier Name
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-teal-900 mb-2 text-sm">Required CSV Format</h3>
          <p className="text-teal-800 text-xs font-mono bg-teal-100 rounded px-3 py-2 overflow-x-auto">
            hotel_name, hotel_email, hotel_phone, booking_ref, check_in_date, check_out_date, room_type, num_rooms, traveler_name, traveler_email, traveler_phone
          </p>
          <p className="text-teal-700 text-xs mt-2">Required: hotel_name, booking_ref, check_in_date, check_out_date (YYYY-MM-DD), traveler_name, traveler_email</p>
          <div className="mt-3">
            <a
              href="data:text/csv;charset=utf-8,hotel_name,hotel_email,hotel_phone,booking_ref,check_in_date,check_out_date,room_type,num_rooms,traveler_name,traveler_email,traveler_phone%0AHotel Grand,reservations@hotelgrand.com,+919876543210,HB2026001,2026-09-05,2026-09-08,Deluxe,2,Priya Mehta,priya@example.com,+919876500001"
              download="hotel_bookings_sample.csv"
              className="text-teal-600 hover:text-teal-800 text-xs font-medium underline"
            >
              Download sample CSV
            </a>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-teal-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex justify-center mb-3">
            <Upload size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-medium">Click to select {acceptLabel}</p>
          <p className="text-gray-400 text-sm mt-1">or drag and drop here</p>
          {file && <p className="text-teal-600 font-medium mt-3 text-sm">{file.name}</p>}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading & Parsing…' : 'Upload & Import'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Import Complete</h2>

          {result.summary && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.summary.awaitingReply ?? result.summary.confirmed ?? 0}</p>
                <p className="text-blue-600 text-xs">Awaiting Reply</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{result.summary.pending}</p>
                <p className="text-yellow-600 text-xs">Pending</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-500">{result.summary.cancelled}</p>
                <p className="text-gray-500 text-xs">Cancelled</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{result.successRows}</p>
              <p className="text-green-600 text-sm">Imported successfully</p>
            </div>
            <div className={`${result.failedRows > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 text-center`}>
              <p className={`text-3xl font-bold ${result.failedRows > 0 ? 'text-red-700' : 'text-gray-400'}`}>{result.failedRows}</p>
              <p className={`text-sm ${result.failedRows > 0 ? 'text-red-600' : 'text-gray-400'}`}>Failed rows</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Row errors:</p>
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-700 text-xs">
                    {e.row > 0 ? `Row ${e.row}: ` : ''}{e.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {mode === 'velocity-xlsx' && result.successRows > 0 && (
            <div className="space-y-3">
              {result.notifications && result.notifications.queued > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm font-semibold mb-1">Notifications dispatched</p>
                  <p className="text-blue-700 text-sm">
                    {result.notifications.queued} pending bookings triggered agent alerts —{' '}
                    <strong>{result.notifications.sent} sent</strong>
                    {result.notifications.failed > 0 && `, ${result.notifications.failed} failed`}.
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Agents received WhatsApp + email for bookings marked "Send Notification = YES".
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-green-600 mt-0.5 shrink-0" />
                  <p className="text-green-800 text-sm">
                    All bookings already confirmed — no notifications needed.
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === 'standard-csv' && result.successRows > 0 && (
            <div>
              {notifyResult ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-semibold">Confirmation requests sent!</p>
                  <p className="text-green-600 text-sm">{notifyResult.sent} sent · {notifyResult.failed} failed</p>
                  <p className="text-green-600 text-xs mt-1">Hotels have been asked to confirm bookings via email and WhatsApp.</p>
                </div>
              ) : (
                <button
                  onClick={handleNotify}
                  disabled={notifying}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {notifying ? 'Sending confirmation requests…' : `Request Confirmation from ${result.successRows} Hotel${result.successRows !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
