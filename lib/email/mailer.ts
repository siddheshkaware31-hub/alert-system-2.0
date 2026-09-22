import nodemailer from 'nodemailer'
import { assertNotLiveContact } from '@/lib/guards/liveContacts'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }
  return transporter
}

const FAKE_DOMAINS = [
  'example.com', 'example.org', 'example.net', 
  'test.com', 'invalid.com', 'domain.com', 
  'sample.com', 'localhost'
]

function resolveSafeEmail(email: string): { targetEmail: string; isRedirected: boolean } {
  const cleanEmail = (email || '').trim().toLowerCase()
  const domain = cleanEmail.split('@')[1] || ''

  if (FAKE_DOMAINS.includes(domain)) {
    const safeFallback = process.env.SMTP_FROM_EMAIL || 'siddheshvelocity31@gmail.com'
    return { targetEmail: safeFallback, isRedirected: true }
  }

  return { targetEmail: email, isRedirected: false }
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ messageId: string }> {
  assertNotLiveContact(options.to, 'email')
  
  const { targetEmail, isRedirected } = resolveSafeEmail(options.to)
  const finalSubject = isRedirected ? `[Demo Test for ${options.to}] ${options.subject}` : options.subject

  const t = getTransporter()
  const info = await t.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    replyTo: process.env.SMTP_FROM_EMAIL,
    to: targetEmail,
    subject: finalSubject,
    html: options.html,
    text: options.text,
  })
  return { messageId: info.messageId }
}
