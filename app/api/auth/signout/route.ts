import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.set({
    name: 'auth_session',
    value: '',
    maxAge: 0,
    path: '/',
  })
  return response
}
