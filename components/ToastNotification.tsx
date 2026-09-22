'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Mail, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
}

let toastListeners: Array<(toast: ToastMessage) => void> = []

export function notify(toast: Omit<ToastMessage, 'id'>) {
  const fullToast: ToastMessage = { ...toast, id: Math.random().toString() }
  toastListeners.forEach(listener => listener(fullToast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    function handleNewToast(newToast: ToastMessage) {
      setToasts(prev => [newToast, ...prev].slice(0, 5))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 6000)
    }

    toastListeners.push(handleNewToast)
    return () => {
      toastListeners = toastListeners.filter(l => l !== handleNewToast)
    }
  }, [])

  function removeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 select-none pointer-events-none">
      {toasts.map(t => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'
        const isInfo = t.type === 'info'

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-fade-in flex items-start gap-3.5 ${
              isSuccess
                ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-500/10'
                : isError
                ? 'bg-slate-900/95 text-white border-rose-500/40 shadow-rose-500/10'
                : isInfo
                ? 'bg-slate-900/95 text-white border-sky-500/40 shadow-sky-500/10'
                : 'bg-slate-900/95 text-white border-amber-500/40 shadow-amber-500/10'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' : isError ? 'bg-rose-500/20 text-rose-400' : isInfo ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isSuccess ? <CheckCircle2 size={20} /> : isError ? <XCircle size={20} /> : isInfo ? <Mail size={20} /> : <AlertTriangle size={20} />}
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-white">{t.title}</h4>
              </div>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">{t.message}</p>
              {t.details && t.details.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-400 font-mono">
                  {t.details.map((d, i) => (
                    <p key={i} className="truncate">• {d}</p>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
