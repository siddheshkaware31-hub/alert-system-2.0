import { SeenClient } from 'seenwa'
import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const API_KEY = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY
// Correct base URL and phone number ID discovered from live Seen API (wa.vsartech.com)
const SEEN_BASE_URL = (process.env.SEEN_WHATSAPP_API_URL || 'https://wa.vsartech.com/api/v1').replace(/\/+$/, '')
const SEEN_PHONE_NUMBER_ID = process.env.SEEN_WHATSAPP_PHONE_NUMBER_ID || '1343836215481945'

interface SendTemplateOptions {
  to: string
  templateName: string
  variables?: string[]
  languageCode?: string
}

/**
 * Sends a WhatsApp text message using the official Seen SDK (`seenwa`)
 * Phone Number: +91 84213 99912 (vesartech) | phoneNumberId: 1343836215481945
 */
export async function sendSeenWhatsAppText(to: string, text: string): Promise<{ messageId?: string; error?: string }> {
  assertNotLiveContact(to, 'whatsapp')

  if (!API_KEY) {
    console.log(`[Seen WhatsApp Mock] Text to ${to}: ${text}`)
    return { messageId: `mock-seen-wa-${Date.now()}` }
  }

  const formattedPhone = to.replace(/[^0-9]/g, '')

  try {
    const client = new SeenClient({ apiKey: API_KEY, baseUrl: SEEN_BASE_URL })

    const result = (await client.messages.sendText({
      to: formattedPhone,
      phone_number_id: SEEN_PHONE_NUMBER_ID,
      message: text,
    })) as any

    return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Seen API error'
    console.error('Seen WhatsApp Error:', errorMsg)
    return { error: errorMsg }
  }
}

/**
 * Sends a WhatsApp template message using the official Seen SDK (`seenwa`)
 */
export async function sendSeenWhatsAppTemplate(opts: SendTemplateOptions): Promise<{ messageId?: string; error?: string }> {
  assertNotLiveContact(opts.to, 'whatsapp')

  if (!API_KEY) {
    console.log(`[Seen WhatsApp Mock] Template '${opts.templateName}' to ${opts.to}`)
    return { messageId: `mock-seen-wa-${Date.now()}` }
  }

  const formattedPhone = opts.to.replace(/[^0-9]/g, '')
  const components = opts.variables?.length
    ? [
        {
          type: 'body',
          parameters: opts.variables.map(v => ({ type: 'text', text: v })),
        },
      ]
    : undefined

  try {
    const client = new SeenClient({ apiKey: API_KEY, baseUrl: SEEN_BASE_URL })

    const result = (await client.messages.sendTemplate({
      to: formattedPhone,
      phone_number_id: SEEN_PHONE_NUMBER_ID,
      template_name: opts.templateName,
      language_code: opts.languageCode || 'en',
      components,
    })) as any

    return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Seen API Template error'
    console.error('Seen WhatsApp Template Error:', errorMsg)
    return { error: errorMsg }
  }
}
