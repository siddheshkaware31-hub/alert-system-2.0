import { assertNotLiveContact } from '@/lib/guards/liveContacts'
import { sendSeenWhatsAppText, sendSeenWhatsAppTemplate } from './seen'

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
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return { error: `HTTP ${res.status}: Invalid response format` }
    }
    if (!res.ok) {
      return { error: data?.message || data?.error || `HTTP ${res.status}` }
    }
    return { messageId: data?.messages?.[0]?.id || data?.id }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

function isSeenProvider(): boolean {
  const key = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY || ''
  const url = process.env.SEEN_WHATSAPP_API_URL || process.env.DOUBLETICK_API_URL || ''
  return key.startsWith('wa_live_') || key.startsWith('wa_') || url.includes('vsartech') || !!process.env.SEEN_WHATSAPP_API_KEY
}

export async function sendWhatsAppTemplate(opts: SendTemplateOptions) {
  assertNotLiveContact(opts.to, 'whatsapp')
  
  if (isSeenProvider()) {
    return sendSeenWhatsAppTemplate(opts)
  }

  if (!API_KEY) {
    console.log(`[WhatsApp Mock] Template '${opts.templateName}' to ${opts.to}`)
    return { messageId: `mock-wa-${Date.now()}` }
  }

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

  if (isSeenProvider()) {
    return sendSeenWhatsAppText(to, text)
  }

  if (!API_KEY) {
    console.log(`[WhatsApp Mock] Text to ${to}: ${text}`)
    return { messageId: `mock-wa-${Date.now()}` }
  }
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
