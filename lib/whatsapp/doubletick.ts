import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const BASE_URL = process.env.DOUBLETICK_API_URL || 'https://public.doubletick.io'
const API_KEY = process.env.DOUBLETICK_API_KEY!

interface TemplateComponent {
  type: 'body' | 'header' | 'button'
  parameters: Array<{ type: 'text'; text: string }>
}

interface SendTemplateOptions {
  to: string
  templateName: string
  variables: string[]
  languageCode?: string
}

async function post(path: string, body: unknown): Promise<{ messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      return { error: data?.message || `HTTP ${res.status}` }
    }
    return { messageId: data?.messages?.[0]?.id || data?.id }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function sendWhatsAppTemplate(opts: SendTemplateOptions) {
  assertNotLiveContact(opts.to, 'whatsapp')
  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: opts.variables.map(v => ({ type: 'text', text: v })),
    },
  ]

  return post('/whatsapp/message/template', {
    to: opts.to,
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode || 'en' },
      components,
    },
  })
}

export async function sendWhatsAppText(to: string, text: string) {
  assertNotLiveContact(to, 'whatsapp')
  return post('/whatsapp/message/text', {
    to,
    content: { text },
  })
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.DOUBLETICK_WEBHOOK_SECRET
  if (!secret) return true
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return expected === signature
}
