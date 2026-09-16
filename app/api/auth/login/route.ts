import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession, sessionCookieOptions } from '@/lib/auth/session'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    console.log('LOGIN: request received')

    const { email, password } = await request.json()

    console.log('LOGIN: email received:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    console.log('LOGIN: creating Supabase service client')

    const db = createServiceClient()

    console.log('LOGIN: querying admin_users')

    const { data: user, error } = await db
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error) {
      console.error('LOGIN SUPABASE ERROR:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('LOGIN: user found')

    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('LOGIN: password valid')

    const token = await createSession({
      userId: user.id,
      email: user.email,
    })

    console.log('LOGIN: session created')

    const response = NextResponse.json({ ok: true })

    response.cookies.set(sessionCookieOptions(token))

    return response
  } catch (error) {
    console.error('LOGIN FATAL ERROR:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown login error',
      },
      { status: 500 }
    )
  }
}