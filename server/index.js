import './load-env.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import {
  openDb,
  getState,
  getBrand,
  listJurnal,
  getSatuanList,
  simpanToko,
  buatItem,
  ubahItem,
  catatMasuk,
  catatTerjual,
  catatPenyesuaian,
  dbPath,
  getPenggunaByEmail,
  simpanOtp,
  otpTerbaru,
  verifikasiOtp,
  buatSesi,
  penggunaDariSesi,
  hapusSesiToken,
  buatPengguna,
  ubahPengguna,
} from './db.js'
import { hakUntuk } from './hak.js'
import {
  COOKIE_NAME,
  SESSION_MS,
  OTP_MS,
  cookieOpts,
  clearCookieOpts,
  kodeOtp,
  normEmail,
  tokenSesi,
} from './auth.js'
import { kirimOtp } from './mail.js'
import { setupSecurity, errorHandler, otpIpTerlaluSering, catatOtpIp } from './security.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '0.0.0.0'

const { db, seeded } = openDb()
const app = express()

setupSecurity(app)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ ok: false, pesan: 'Permintaan tidak valid.' })
  }
  next(err)
})

function bacaUser(req) {
  return penggunaDariSesi(db, req.cookies[COOKIE_NAME])
}

function wajibMasuk(req, res, next) {
  const user = bacaUser(req)
  if (!user) {
    return res.status(401).json({ ok: false, pesan: 'Silakan masuk.' })
  }
  if (user.status !== 'Aktif') {
    hapusSesiToken(db, req.cookies[COOKIE_NAME])
    res.clearCookie(COOKIE_NAME, clearCookieOpts())
    return res.status(401).json({ ok: false, pesan: 'Akun tidak aktif.' })
  }
  req.user = user
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/otp/request', async (req, res) => {
  const email = normEmail(req.body?.email)
  if (!email) {
    return res.status(400).json({ ok: false, pesan: 'Isi email.' })
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  if (otpIpTerlaluSering(ip)) {
    return res.status(429).json({
      ok: false,
      pesan: 'Terlalu banyak permintaan. Coba lagi nanti.',
    })
  }

  const user = getPenggunaByEmail(db, email)
  if (!user || user.status !== 'Aktif') {
    return res.status(400).json({
      ok: false,
      pesan: 'Tidak bisa mengirim kode. Periksa email atau hubungi admin.',
    })
  }

  const last = otpTerbaru(db, user.id)
  if (last && Date.now() - last.dibuat < 30_000) {
    return res.status(400).json({ ok: false, pesan: 'Tunggu sebentar sebelum minta kode lagi.' })
  }

  const kode = kodeOtp()
  simpanOtp(db, user.id, kode, OTP_MS)
  catatOtpIp(ip)

  const kirim = await kirimOtp(user.email, kode)
  if (kirim.error) {
    return res.status(500).json({
      ok: false,
      pesan: 'Gagal mengirim email. Hubungi admin atau coba lagi.',
    })
  }

  res.json({
    ok: true,
    pesan: kirim.dikirim
      ? 'Sukses. Jika tidak ada, cek spam.'
      : 'SMTP belum diisi. Set OTP_LOG_TO_CONSOLE=1 di dev untuk melihat kode di terminal.',
  })
})

app.post('/api/auth/otp/verify', (req, res) => {
  const email = normEmail(req.body?.email)
  const kode = String(req.body?.kode ?? '').replace(/\s/g, '')
  if (!email || !kode) {
    return res.status(400).json({ ok: false, pesan: 'Isi email dan kode.' })
  }

  const user = getPenggunaByEmail(db, email)
  if (!user || user.status !== 'Aktif') {
    return res.status(400).json({ ok: false, pesan: 'Email atau kode tidak valid.' })
  }

  const cek = verifikasiOtp(db, user.id, kode)
  if (!cek.ok) return res.status(400).json(cek)

  const token = tokenSesi()
  buatSesi(db, user.id, token, SESSION_MS)
  res.cookie(COOKIE_NAME, token, cookieOpts())
  const sesiBerakhir = Date.now() + SESSION_MS
  res.json({ ok: true, pesan: 'Masuk berhasil.', ...getState(db, { ...user, sesiBerakhir }) })
})

app.post('/api/auth/logout', (req, res) => {
  hapusSesiToken(db, req.cookies[COOKIE_NAME])
  res.clearCookie(COOKIE_NAME, clearCookieOpts())
  res.json({ ok: true, pesan: 'Keluar.' })
})

app.get('/api/brand', (_req, res) => {
  res.json(getBrand(db))
})

app.get('/api/state', wajibMasuk, (req, res) => {
  res.json(getState(db, req.user))
})

app.get('/api/jurnal', wajibMasuk, (req, res) => {
  res.json(listJurnal(db, req.query))
})

app.get('/api/satuan', wajibMasuk, (_req, res) => {
  res.json({ ok: true, satuan: getSatuanList(db) })
})

app.put('/api/toko', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahToko) {
    return res.status(403).json({ ok: false, pesan: 'Hanya Admin yang dapat mengubah data toko.' })
  }
  res.json(simpanToko(db, req.body, req.user))
})

app.post('/api/items', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahInventori) {
    return res.status(403).json({ ok: false, pesan: 'Tidak diizinkan menambah barang.' })
  }
  const hasil = buatItem(db, req.body, req.user)
  res.status(hasil.ok ? 200 : 400).json(hasil)
})

app.put('/api/items/:id', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahInventori) {
    return res.status(403).json({ ok: false, pesan: 'Tidak diizinkan mengubah barang.' })
  }
  const hasil = ubahItem(db, req.params.id, req.body, req.user)
  res.status(hasil.ok ? 200 : 400).json(hasil)
})

app.post('/api/masuk', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahInventori) {
    return res.status(403).json({ ok: false, pesan: 'Tidak diizinkan mencatat barang masuk.' })
  }
  res.json(catatMasuk(db, req.body, req.user))
})

app.post('/api/terjual', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahInventori) {
    return res.status(403).json({ ok: false, pesan: 'Tidak diizinkan mencatat penjualan.' })
  }
  res.json(catatTerjual(db, req.body, req.user))
})

app.post('/api/penyesuaian', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahInventori) {
    return res.status(403).json({ ok: false, pesan: 'Tidak diizinkan menyesuaikan stok.' })
  }
  res.json(catatPenyesuaian(db, req.body, req.user))
})

app.post('/api/pengguna', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahPengguna) {
    return res.status(403).json({ ok: false, pesan: 'Hanya Admin yang dapat menambah pengguna.' })
  }
  const hasil = buatPengguna(db, req.body, req.user)
  res.status(hasil.ok ? 200 : 400).json(hasil)
})

app.put('/api/pengguna/:id', wajibMasuk, (req, res) => {
  if (!hakUntuk(req.user.peran).ubahPengguna) {
    return res.status(403).json({ ok: false, pesan: 'Hanya Admin yang dapat mengubah pengguna.' })
  }
  const hasil = ubahPengguna(db, req.params.id, req.body, req.user)
  res.status(hasil.ok ? 200 : 400).json(hasil)
})

if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.log(`revits API http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log(`SQLite ${dbPath}${seeded ? ' (seeded)' : ''}`)
  if (fs.existsSync(dist)) console.log('Serving UI from dist/')
  if (!process.env.SMTP_PASS) {
    console.log('SMTP_PASS kosong — set OTP_LOG_TO_CONSOLE=1 untuk cetak OTP di terminal (dev saja).')
  }
})
