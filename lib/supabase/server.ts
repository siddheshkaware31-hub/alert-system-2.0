import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')

  console.log(
    'SUPABASE URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )

  console.log(
    'SERVICE KEY EXISTS:',
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log(
    'SERVICE KEY LENGTH:',
    process.env.SUPABASE_SERVICE_ROLE_KEY?.length
  )

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}