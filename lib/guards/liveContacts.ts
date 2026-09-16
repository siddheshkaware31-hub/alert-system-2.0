// Live Velocity/WTFares staff contacts.
// In non-production environments, sending to any of these is blocked
// to prevent accidental messages to real team members during testing.

const LIVE_EMAILS = new Set([
  'sonali@wtfares.com',
  'pragati@velocity.travel',
  'pranali@velocity.travel',
  'sales@wtfares.com',
  'aniket.k@velocity.travel',
  'neha@wtfares.com',
  'vishal@wtfares.com',
  'devendra@velocity.travel',
  'madhura@velocity.travel',
  'saurabh.f@velocity.travel',
  'nitins@velocity.travel',
])

const LIVE_PHONES = new Set([
  '+919168891444',
  '+919209014745',
  '+918956489350',
  '+918956489351',
  '+918956489356',
  '+919209014744',
  '+918956489352',
  '+918956686781',
])

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

export function isLiveContact(emailOrPhone: string): boolean {
  const val = emailOrPhone.trim().toLowerCase()
  if (val.includes('@')) return LIVE_EMAILS.has(val)
  return LIVE_PHONES.has(normalizePhone(emailOrPhone))
}

export function assertNotLiveContact(emailOrPhone: string, channel: 'email' | 'whatsapp'): void {
  if (process.env.NODE_ENV === 'production') return
  if (process.env.ALLOW_LIVE_CONTACTS === 'true') return
  if (isLiveContact(emailOrPhone)) {
    throw new Error(
      `[TEST MODE] Blocked ${channel} to live staff contact "${emailOrPhone}". ` +
      `Set ALLOW_LIVE_CONTACTS=true in .env.local to send real messages in dev.`
    )
  }
}
