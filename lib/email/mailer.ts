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

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ messageId: string }> {
  assertNotLiveContact(options.to, 'email')
  const t = getTransporter()
  const info = await t.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    replyTo: process.env.SMTP_FROM_EMAIL, // replies land back in the monitored inbox
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
  return { messageId: info.messageId }
}
