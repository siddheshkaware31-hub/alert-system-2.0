export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'true') return true
  if (process.env.DEMO_MODE === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function hasSmtp(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
}

export function hasWhatsApp(): boolean {
  return Boolean(process.env.DOUBLETICK_API_KEY)
}

export function hasFlightApi(): boolean {
  return Boolean(process.env.AIRLABS_API_KEY)
}
