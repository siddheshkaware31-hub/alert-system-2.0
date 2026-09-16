import { NextRequest, NextResponse } from 'next/server'
import { pollEmailReplies } from '@/lib/email/imapPoller'

// Called by Supabase pg_cron every 5 minutes.
// Connects via IMAP to the Gmail inbox, finds unread emails that
// reference hotel booking refs, stores them as replies, and
// auto-confirms bookings where the reply text indicates confirmation.
export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pollEmailReplies()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[poll-replies] POST error:', msg, stack)
    return NextResponse.json({ error: msg, stack }, { status: 500 })
  }
}

// Also allow GET for manual trigger from dashboard
export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pollEmailReplies()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[poll-replies] GET error:', msg, stack)
    return NextResponse.json({ error: msg, stack }, { status: 500 })
  }
}
