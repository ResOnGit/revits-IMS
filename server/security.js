const OTP_IP_WINDOW_MS = 60 * 60 * 1000
const OTP_IP_MAX = 10

const otpIpHits = new Map()

function pruneOtpIp() {
  const now = Date.now()
  for (const [ip, entries] of otpIpHits) {
    const fresh = entries.filter((t) => now - t < OTP_IP_WINDOW_MS)
    if (fresh.length) otpIpHits.set(ip, fresh)
    else otpIpHits.delete(ip)
  }
}

export function otpIpTerlaluSering(ip) {
  pruneOtpIp()
  const entries = otpIpHits.get(ip) || []
  return entries.length >= OTP_IP_MAX
}

export function catatOtpIp(ip) {
  pruneOtpIp()
  const entries = otpIpHits.get(ip) || []
  entries.push(Date.now())
  otpIpHits.set(ip, entries)
}

function originDiizinkan(req) {
  const origin = req.get('Origin')
  if (!origin) return true
  const host = req.get('Host')
  if (host && (origin === `http://${host}` || origin === `https://${host}`)) {
    return true
  }
  if (process.env.NODE_ENV !== 'production') {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  }
  return false
}

export function setupSecurity(app) {
  app.disable('x-powered-by')

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  })

  app.use((req, res, next) => {
    const origin = req.get('Origin')
    if (origin) {
      if (!originDiizinkan(req)) {
        return res.status(403).json({ ok: false, pesan: 'Permintaan ditolak.' })
      }
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
    if (req.path.startsWith('/api/auth/otp/')) return next()
    if (!req.get('Origin')) return next()
    if (!originDiizinkan(req)) {
      return res.status(403).json({ ok: false, pesan: 'Permintaan ditolak.' })
    }
    next()
  })
}

// Express requires 4-arg signature for error middleware.
export function errorHandler(err, _req, res, _next) {
  void _next
  console.error(err)
  res.status(500).json({ ok: false, pesan: 'Terjadi kesalahan server.' })
}
