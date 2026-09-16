import { NextRequest } from 'next/server'

export function verifyCronSecret(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}
