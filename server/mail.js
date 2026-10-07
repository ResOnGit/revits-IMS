import nodemailer from 'nodemailer'

function otpKeConsole(ke, kode) {
  if (process.env.OTP_LOG_TO_CONSOLE === '1') {
    console.log(`[otp] Kode untuk ${ke}: ${kode}`)
  }
}

function transporter() {
  const user = process.env.SMTP_USER
  const pass = (process.env.SMTP_PASS || '').replace(/\s/g, '')
  if (!user || !pass) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  })
}

export async function kirimOtp(ke, kode) {
  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'revits@localhost'
  const mailer = transporter()
  if (!mailer) {
    otpKeConsole(ke, kode)
    return { dikirim: false }
  }

  try {
    await mailer.sendMail({
      from,
      to: ke,
      subject: 'Kode masuk revits',
      text: `Kode masuk Anda: ${kode}\n\nBerlaku 5 menit. Jangan bagikan kode ini.`,
    })
    return { dikirim: true }
  } catch (err) {
    console.error('[otp] Gagal kirim email:', err.message)
    otpKeConsole(ke, kode)
    return { dikirim: false, error: err.message }
  }
}
