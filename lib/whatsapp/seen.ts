import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const BASE_URL = process.env.SEEN_WHATSAPP_API_URL || process.env.DOUBLETICK_API_URL || 'https://wa.vsartech.com'
const API_KEY = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY

interface SendWhatsAppOptions {
  to: string
  text?: string
  templateName?: string
  variables?: string[]
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

  try {
    const formattedPhone = to.replace(/[^0.9]/g, '')
    const res = await fetch(`${BASE_URL}/api/v1/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: formattedPhone,
        message: text,
        type: 'text',
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { error: data?.message || data?.error || `HTTP ${res.status}` }
    }
    return { messageId: data?.message_id || data?.id || data?.data?.id || `seen-${Date.now()}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown Seen API error' }
  }
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

  try {
    const formattedPhone = opts.to.replace(/[^0-9]/g, '')
    const res = await fetch(`${BASE_URL}/api/v1/messages/template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: formattedPhone,
        template_name: opts.templateName,
        variables: opts.variables || [],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { error: data?.message || data?.error || `HTTP ${res.status}` }
    }
    return { messageId: data?.message_id || data?.id || `seen-${Date.now()}` }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown Seen API error' }
  }
}
