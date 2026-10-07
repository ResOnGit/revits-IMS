import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export const COOKIE_NAME = 'revits_session'
export const SESSION_MS = 12 * 60 * 60 * 1000
export const OTP_MS = 5 * 60 * 1000
export const OTP_MAX_COBA = 5

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS,
    secure: process.env.COOKIE_SECURE === '1',
  }
}

export function clearCookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.COOKIE_SECURE === '1',
  }
}

export function hashSecret(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

export function hashSama(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

export function tokenSesi() {
  return randomBytes(32).toString('hex')
}

export function kodeOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function normEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
