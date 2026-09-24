import { SeenClient } from 'seenwa'
import { assertNotLiveContact } from '@/lib/guards/liveContacts'

const API_KEY = process.env.SEEN_WHATSAPP_API_KEY || process.env.DOUBLETICK_API_KEY

interface SendTemplateOptions {
  to: string
  templateName: string
  variables?: string[]
  languageCode?: string
}

function getCandidateClientOptions(): Array<{ apiKey: string; baseUrl?: string }> {
  const list: Array<{ apiKey: string; baseUrl?: string }> = [
    { apiKey: API_KEY! }, // Official default seenwa SDK cloud API (https://api.seen.com/api/v1)
  ]

  if (process.env.SEEN_WHATSAPP_API_URL) {
    list.push({ apiKey: API_KEY!, baseUrl: process.env.SEEN_WHATSAPP_API_URL.replace(/\/+$/, '') })
  }

  const customUrls = [
    'https://wa.vsartech.com/api/v1',
    'https://wa.vsartech.com/api',
    'https://wa.vsartech.com',
    'https://api.seen.vsartech.com/api/v1',
  ]

  for (const url of customUrls) {
    list.push({ apiKey: API_KEY!, baseUrl: url })
  }

  return list
}

function getCandidatePhoneIds(): string[] {
  return Array.from(
    new Set(
      [
        process.env.SEEN_WHATSAPP_PHONE_NUMBER_ID,
        process.env.SEEN_PHONE_NUMBER_ID,
        process.env.SEEN_WHATSAPP_SESSION_KEY,
        'automatefd alert system',
        'default',
      ].filter(Boolean)
    )
  ) as string[]
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
  const optionsList = getCandidateClientOptions()
  const phoneIds = getCandidatePhoneIds()
  let lastError = ''

  for (const clientOpts of optionsList) {
    for (const phoneId of phoneIds) {
      try {
        const client = new SeenClient(clientOpts)

        const result = (await client.messages.sendText({
          to: formattedPhone,
          phone_number_id: phoneId,
          message: text,
        })) as any

        return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Seen API error'
        // If error is 404 route matching issue or "Not found" phone ID, try next candidate
        if (!lastError.toLowerCase().includes('404') && !lastError.toLowerCase().includes('not found')) {
          break
        }
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

  const optionsList = getCandidateClientOptions()
  const phoneIds = getCandidatePhoneIds()
  let lastError = ''

  for (const clientOpts of optionsList) {
    for (const phoneId of phoneIds) {
      try {
        const client = new SeenClient(clientOpts)

        const result = (await client.messages.sendTemplate({
          to: formattedPhone,
          phone_number_id: phoneId,
          template_name: opts.templateName,
          language_code: opts.languageCode || 'en',
          components,
        })) as any

        return { messageId: result?.id || result?.message_id || `seen-${Date.now()}` }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Seen API Template error'
        if (!lastError.toLowerCase().includes('404') && !lastError.toLowerCase().includes('not found')) {
          break
        }
      }
    }
  }

  console.error('Seen WhatsApp Template Error:', lastError)
  return { error: lastError }
}
