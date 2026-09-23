import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const BASE_URL = (process.env.SEEN_WHATSAPP_API_URL || process.env.DOUBLETICK_API_URL || 'https://wa.vsartech.com').replace(/\/+$/, '')
const API_KEY = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY

interface SendWhatsAppOptions {
  to: string
  text?: string
  templateName?: string
  variables?: string[]
}

async function safeParseJson(res: Response): Promise<{ data: any; isJson: boolean }> {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return { data, isJson: true }
  } catch {
    return { data: text, isJson: false }
  }
}

/**
 * Sends a WhatsApp text or template message via Seen WhatsApp API platform (wa.vsartech.com)
 */
export async function sendSeenWhatsAppText(to: string, text: string): Promise<{ messageId?: string; error?: string }> {
  assertNotLiveContact(to, 'whatsapp')

  if (!API_KEY) {
    console.log(`[Seen WhatsApp Mock] Text to ${to}: ${text}`)
    return { messageId: `mock-seen-wa-${Date.now()}` }
  }

  // Clean phone number (digits only, e.g. 919876543210)
  const formattedPhone = to.replace(/[^0-9]/g, '')

  const payload = {
    receiver: formattedPhone,
    number: formattedPhone,
    phone: formattedPhone,
    recipient: formattedPhone,
    message: text,
    msg: text,
    body: text,
    type: 'text',
    api_key: API_KEY,
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${API_KEY}`,
    'x-api-key': API_KEY,
    'apikey': API_KEY,
    'Content-Type': 'application/json',
  }

  // Candidate endpoints across popular Seen / Wasender WhatsApp gateways
  const endpoints = [
    `${BASE_URL}/api/send`,
    `${BASE_URL}/api/send-message`,
    `${BASE_URL}/api/messages/send`,
    `${BASE_URL}/api/v1/send`,
    `${BASE_URL}/api/v1/messages/send`,
    `${BASE_URL}/api/v1/whatsapp/send`,
    `${BASE_URL}/api/create-message`,
  ]

  let lastError = ''

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const { data, isJson } = await safeParseJson(res)

      if (res.ok && isJson && (data.status === true || data.success === true || data.id || data.message_id || data.status === 'success' || data.messages || data.data?.id)) {
        return { messageId: data?.message_id || data?.id || data?.data?.id || `seen-${Date.now()}` }
      }

      if (isJson) {
        lastError = data?.message || data?.error || `HTTP ${res.status}`
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Fetch failed'
    }
  }

  return { error: lastError || 'Failed to send WhatsApp message via Seen API. Check API Docs for exact URL endpoint.' }
}

/**
 * Sends a WhatsApp template message via Seen WhatsApp API platform
 */
export async function sendSeenWhatsAppTemplate(opts: SendWhatsAppOptions): Promise<{ messageId?: string; error?: string }> {
  assertNotLiveContact(opts.to, 'whatsapp')

  if (!API_KEY) {
    console.log(`[Seen WhatsApp Mock] Template '${opts.templateName}' to ${opts.to}`)
    return { messageId: `mock-seen-wa-${Date.now()}` }
  }

  const formattedPhone = opts.to.replace(/[^0-9]/g, '')

  try {
    const res = await fetch(`${BASE_URL}/api/v1/messages/template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: formattedPhone,
        number: formattedPhone,
        template_name: opts.templateName,
        variables: opts.variables || [],
        api_key: API_KEY,
      }),
    })

    const { data, isJson } = await safeParseJson(res)
    if (!res.ok || !isJson) {
      return { error: isJson ? (data?.message || data?.error) : `HTTP ${res.status}` }
    }
    return { messageId: data?.message_id || data?.id || `seen-${Date.now()}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown Seen API error' }
  }
}
