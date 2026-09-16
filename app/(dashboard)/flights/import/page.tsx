'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'

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

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/flights/import', { method: 'POST', body: form })
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
      const res = await fetch('/api/flights/notify', {
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

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Flight Bookings</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file with flight booking data to import travelers and send confirmations.</p>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm">Required CSV Format</h3>
        <p className="text-blue-800 text-xs font-mono bg-blue-100 rounded px-3 py-2 overflow-x-auto">
          pnr, ticket_number, flight_number, airline_code, origin, destination, departure_date, departure_time, arrival_time, traveler_name, traveler_email, traveler_phone
        </p>
        <p className="text-blue-700 text-xs mt-2">Required: pnr, flight_number, origin, destination, departure_date (YYYY-MM-DD), traveler_name, traveler_email, traveler_phone</p>
        <div className="mt-3">
          <a
            href="data:text/csv;charset=utf-8,pnr,ticket_number,flight_number,airline_code,origin,destination,departure_date,departure_time,arrival_time,traveler_name,traveler_email,traveler_phone%0AABC123,,AI302,AI,DEL,BOM,2026-09-01,06:00,08:00,Rahul Sharma,rahul@example.com,+919876543210"
            download="flight_bookings_sample.csv"
            className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
          >
            Download sample CSV
          </a>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex justify-center mb-3">
            <Upload size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-medium">Click to select CSV file</p>
          <p className="text-gray-400 text-sm mt-1">or drag and drop here</p>
          {file && <p className="text-blue-600 font-medium mt-3 text-sm">{file.name}</p>}
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading & Parsing…' : 'Upload & Import'}
        </button>
      </div>

      {/* Import Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Import Complete</h2>
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
                  <p key={i} className="text-red-700 text-xs">Row {e.row}: {e.error}</p>
                ))}
              </div>
            </div>
          )}

          {result.successRows > 0 && (
            <div>
              {notifyResult ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-semibold">Notifications sent!</p>
                  <p className="text-green-600 text-sm">{notifyResult.sent} sent · {notifyResult.failed} failed</p>
                </div>
              ) : (
                <button
                  onClick={handleNotify}
                  disabled={notifying}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {notifying ? 'Sending confirmations…' : `Send Flight Confirmations to ${result.successRows} Traveler${result.successRows !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
