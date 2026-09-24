import { SeenClient } from 'seenwa'
import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const API_KEY = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY
const PHONE_NUMBER_ID = process.env.SEEN_WHATSAPP_PHONE_NUMBER_ID || process.env.SEEN_PHONE_NUMBER_ID || 'default'

interface SendTemplateOptions {
  to: string
  templateName: string
  variables?: string[]
  languageCode?: string
}

function getCandidateBaseUrls(): string[] {
  return Array.from(
    new Set(
      [
        process.env.SEEN_WHATSAPP_API_URL,
        'https://wa.vsartech.com/api/v1',
        'https://wa.vsartech.com/api',
        'https://wa.vsartech.com',
        'https://api.seen.vsartech.com/api/v1',
      ]
        .filter(Boolean)
        .map(u => (u as string).replace(/\/+$/, ''))
    )
  )
}

/**
 * Sends a WhatsApp text message using the official Seen SDK (`seenwa`)
 */
export async function sendSeenWhatsAppText(to: string, text: string): Promise<{ messageId?: string; error?: string }> {
  assertNotLiveContact(to, 'whatsapp')

  if (!API_KEY) {
    console.log(`[Seen WhatsApp Mock] Text to ${to}: ${text}`)
    return { messageId: `mock-seen-wa-${Date.now()}` }
  }

  const formattedPhone = to.replace(/[^0-9]/g, '')
  const baseUrls = getCandidateBaseUrls()
  let lastError = ''

  for (const baseUrl of baseUrls) {
    try {
      const client = new SeenClient({
        apiKey: API_KEY,
        baseUrl,
      })

      const result = (await client.messages.sendText({
        to: formattedPhone,
        phone_number_id: PHONE_NUMBER_ID,
        message: text,
      })) as any

      return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Seen API error'
      // If error is not a 404 URL route issue, stop retrying
      if (!lastError.includes('404')) {
        break
      }
    }
  }

  console.error('Seen WhatsApp Error:', lastError)
  return { error: lastError }
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

  const baseUrls = getCandidateBaseUrls()
  let lastError = ''

  for (const baseUrl of baseUrls) {
    try {
      const client = new SeenClient({
        apiKey: API_KEY,
        baseUrl,
      })

      const result = (await client.messages.sendTemplate({
        to: formattedPhone,
        phone_number_id: PHONE_NUMBER_ID,
        template_name: opts.templateName,
        language_code: opts.languageCode || 'en',
        components,
      })) as any

      return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Seen API Template error'
      if (!lastError.includes('404')) {
        break
      }
    }
  }

  console.error('Seen WhatsApp Template Error:', lastError)
  return { error: lastError }
}
