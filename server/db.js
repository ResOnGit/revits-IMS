import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { seedIfEmpty } from './seed.js'
import { hakUntuk } from './hak.js'
import { emailOk, hashSama, hashSecret, normEmail, OTP_MAX_COBA } from './auth.js'
import {
  JURNAL_PAGE_DEFAULT,
  JURNAL_PAGE_MAX,
  JURNAL_RECENT_LIMIT,
} from '../shared/jurnal-limits.js'
import { parseItemBody, parseNonNegInt, parseQtyInt } from './validate.js'

export function resetAndSeed(db) {
  db.pragma('foreign_keys = OFF')
  db.exec(`
    DELETE FROM otp;
    DELETE FROM sesi;
    DELETE FROM jurnal;
    DELETE FROM hitung_fisik;
    DELETE FROM items;
    DELETE FROM pengguna;
    DELETE FROM toko;
  `)
  db.pragma('foreign_keys = ON')
  seedIfEmpty(db)
}


const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'data', 'revits.db')

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function hariIniISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS toko (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nama TEXT NOT NULL,
      nama_pendek TEXT NOT NULL,
      merk TEXT NOT NULL DEFAULT '',
      tagline TEXT,
      alamat TEXT,
      telepon TEXT,
      catatan TEXT
    );

    CREATE TABLE IF NOT EXISTS pengguna (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      email TEXT,
      peran TEXT NOT NULL,
      status TEXT NOT NULL,
      keterangan TEXT
    );

    CREATE TABLE IF NOT EXISTS otp (
      id TEXT PRIMARY KEY,
      pengguna_id TEXT NOT NULL REFERENCES pengguna(id),
      kode_hash TEXT NOT NULL,
      kedaluwarsa INTEGER NOT NULL,
      percobaan INTEGER NOT NULL DEFAULT 0,
      dibuat INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sesi (
      id TEXT PRIMARY KEY,
      pengguna_id TEXT NOT NULL REFERENCES pengguna(id),
      token_hash TEXT NOT NULL UNIQUE,
      kedaluwarsa INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      kategori TEXT NOT NULL,
      jenis TEXT NOT NULL,
      satuan TEXT NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      stok_minimum INTEGER NOT NULL DEFAULT 0,
      harga_jual INTEGER,
      harga_komplit INTEGER,
      harga_saja INTEGER,
      kondisi TEXT,
      catatan TEXT
    );

    CREATE TABLE IF NOT EXISTS jurnal (
      id TEXT PRIMARY KEY,
      tanggal TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      item_id TEXT NOT NULL REFERENCES items(id),
      item_nama TEXT NOT NULL,
      satuan TEXT NOT NULL,
      jenis TEXT NOT NULL,
      kuantitas INTEGER NOT NULL,
      pihak TEXT,
      pembayaran TEXT,
      alasan TEXT,
      catatan TEXT,
      dicatat_oleh TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hitung_fisik (
      item_id TEXT PRIMARY KEY REFERENCES items(id),
      fisik INTEGER NOT NULL
    );
  `)

  const kolomToko = db.prepare('PRAGMA table_info(toko)').all().map((c) => c.name)
  if (!kolomToko.includes('merk')) {
    db.exec(`ALTER TABLE toko ADD COLUMN merk TEXT NOT NULL DEFAULT ''`)
  }

  const kolomPengguna = db.prepare('PRAGMA table_info(pengguna)').all().map((c) => c.name)
  if (!kolomPengguna.includes('email')) {
    db.exec('ALTER TABLE pengguna ADD COLUMN email TEXT')
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS pengguna_email_unik
    ON pengguna(email) WHERE email IS NOT NULL;

    CREATE INDEX IF NOT EXISTS jurnal_created_at ON jurnal(created_at);
    CREATE INDEX IF NOT EXISTS jurnal_tanggal ON jurnal(tanggal);
    CREATE INDEX IF NOT EXISTS jurnal_item_id ON jurnal(item_id);
  `)
}

function toToko(row) {
  if (!row) return null
  return {
    nama: row.nama,
    namaPendek: row.nama_pendek,
    merk: row.merk ?? '',
    tagline: row.tagline ?? '',
    alamat: row.alamat ?? '',
    telepon: row.telepon ?? '',
    catatan: row.catatan ?? '',
  }
}

function parseMerk(value) {
  const merk = String(value ?? '').trim().replace(/\s+/g, '')
  if (!merk) return { ok: false, pesan: 'Lambang wajib diisi.' }
  if (merk.length > 4) return { ok: false, pesan: 'Lambang maksimal 4 karakter.' }
  return { ok: true, merk }
}

function toItem(row) {
  return {
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kategori: row.kategori,
    jenis: row.jenis,
    satuan: row.satuan,
    stok: row.stok,
    stokMinimum: row.stok_minimum,
    hargaJual: row.harga_jual,
    hargaKomplit: row.harga_komplit,
    hargaSaja: row.harga_saja,
    kondisi: row.kondisi,
    catatan: row.catatan,
  }
}

function toJurnal(row) {
  return {
    id: row.id,
    tanggal: row.tanggal,
    createdAt: row.created_at,
    itemId: row.item_id,
    itemNama: row.item_nama,
    satuan: row.satuan,
    jenis: row.jenis,
    kuantitas: row.kuantitas,
    pihak: row.pihak ?? '',
    pembayaran: row.pembayaran ?? '',
    alasan: row.alasan ?? '',
    catatan: row.catatan ?? '',
    dicatatOleh: row.dicatat_oleh,
  }
}

function toPengguna(row) {
  if (!row) return null
  return {
    id: row.id,
    nama: row.nama,
    email: row.email ?? '',
    peran: row.peran,
    status: row.status,
    keterangan: row.keterangan ?? '',
  }
}

function bersihkanKadaluarsa(db) {
  const now = Date.now()
  db.prepare('DELETE FROM sesi WHERE kedaluwarsa < ?').run(now)
  db.prepare('DELETE FROM otp WHERE kedaluwarsa < ?').run(now)
}

export function openDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  bersihkanKadaluarsa(db)
  const seeded = seedIfEmpty(db)
  return { db, seeded, dbPath }
}

export function getPengguna(db, id) {
  const row = db.prepare('SELECT * FROM pengguna WHERE id = ?').get(id)
  return row ? toPengguna(row) : null
}

export function getPenggunaByEmail(db, email) {
  const key = normEmail(email)
  if (!key) return null
  const row = db.prepare('SELECT * FROM pengguna WHERE lower(email) = ?').get(key)
  return row ? toPengguna(row) : null
}

function recentJurnal(db, limit = JURNAL_RECENT_LIMIT) {
  return db
    .prepare('SELECT * FROM jurnal ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map(toJurnal)
}

function parseListJurnalQuery(query = {}) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? ''), 10) || 1)
  const rawLimit = Number.parseInt(String(query.limit ?? ''), 10) || JURNAL_PAGE_DEFAULT
  const limit = Math.min(JURNAL_PAGE_MAX, Math.max(1, rawLimit))
  const jenis = String(query.jenis ?? 'Semua')
  const q = String(query.q ?? '').trim()
  const urut = query.urut === 'lama' ? 'lama' : 'baru'
  return { page, limit, jenis, q, urut }
}

export function listJurnal(db, query = {}) {
  const { page, limit, jenis, q, urut } = parseListJurnalQuery(query)
  const where = []
  const params = {}

  if (jenis !== 'Semua') {
    where.push('jenis = @jenis')
    params.jenis = jenis
  }
  if (q) {
    where.push(`(
      lower(item_nama) LIKE @q OR
      lower(pihak) LIKE @q OR
      lower(alasan) LIKE @q OR
      lower(catatan) LIKE @q OR
      lower(dicatat_oleh) LIKE @q
    )`)
    params.q = `%${q.toLowerCase()}%`
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderSql =
    urut === 'lama'
      ? 'ORDER BY tanggal ASC, created_at ASC'
      : 'ORDER BY tanggal DESC, created_at DESC'
  const offset = (page - 1) * limit

  const total = db.prepare(`SELECT COUNT(*) AS n FROM jurnal ${whereSql}`).get(params).n
  const rows = db
    .prepare(`SELECT * FROM jurnal ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset })
    .map(toJurnal)

  return {
    ok: true,
    rows,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  }
}

export function getState(db, user) {
  const toko = toToko(db.prepare('SELECT * FROM toko WHERE id = 1').get())
  const items = db.prepare('SELECT * FROM items ORDER BY kode').all().map(toItem)
  const jurnal = recentJurnal(db)
  const semua = db.prepare('SELECT * FROM pengguna ORDER BY nama').all().map(toPengguna)
  const hak = hakUntuk(user.peran)
  const pengguna = hak.lihatPengguna ? semua : semua.filter((u) => u.id === user.id)
  const hitungFisik = {}
  for (const row of db.prepare('SELECT item_id, fisik FROM hitung_fisik').all()) {
    hitungFisik[row.item_id] = row.fisik
  }
  return {
    toko,
    items,
    jurnal,
    pengguna,
    hitungFisik,
    saya: {
      id: user.id,
      nama: user.nama,
      email: user.email ?? '',
      peran: user.peran,
      status: user.status,
      keterangan: user.keterangan ?? '',
    },
    sesiBerakhir: user.sesiBerakhir ?? null,
  }
}

export function getBrand(db) {
  const toko = toToko(db.prepare('SELECT * FROM toko WHERE id = 1').get())
  return {
    merk: toko?.merk ?? '',
    namaPendek: toko?.namaPendek || '',
  }
}

export function simpanToko(db, body, user) {
  const nama = String(body.nama ?? '').trim()
  const namaPendek = String(body.namaPendek ?? '').trim()
  const parsedMerk = parseMerk(body.merk)
  if (!nama || !namaPendek) {
    return { ok: false, pesan: 'Nama toko dan nama pendek wajib diisi.' }
  }
  if (!parsedMerk.ok) return parsedMerk
  db.prepare(`
    UPDATE toko SET
      nama = @nama,
      nama_pendek = @namaPendek,
      merk = @merk,
      tagline = @tagline,
      alamat = @alamat,
      telepon = @telepon,
      catatan = @catatan
    WHERE id = 1
  `).run({
    nama,
    namaPendek,
    merk: parsedMerk.merk,
    tagline: String(body.tagline ?? ''),
    alamat: String(body.alamat ?? ''),
    telepon: String(body.telepon ?? ''),
    catatan: String(body.catatan ?? ''),
  })
  return { ok: true, pesan: 'Data toko disimpan.', ...getState(db, user) }
}

export function getSatuanList(db) {
  return db.prepare(`
    SELECT DISTINCT satuan FROM items
    WHERE satuan IS NOT NULL AND trim(satuan) != ''
    ORDER BY satuan
  `).all().map((r) => r.satuan)
}

export function buatItem(db, body, user) {
  const parsed = parseItemBody(body, { izinkanStokAwal: true })
  if (!parsed.ok) return parsed

  const bentrok = db.prepare('SELECT id FROM items WHERE kode = ?').get(parsed.kode)
  if (bentrok) return { ok: false, pesan: 'Kode barang sudah dipakai.' }

  const id = uid('itm')
  const stok = parsed.stokAwal
  const now = Date.now()

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO items (
        id, kode, nama, kategori, jenis, satuan, stok, stok_minimum,
        harga_jual, harga_komplit, harga_saja, kondisi, catatan
      ) VALUES (
        @id, @kode, @nama, @kategori, @jenis, @satuan, @stok, @stokMinimum,
        @hargaJual, @hargaKomplit, @hargaSaja, @kondisi, @catatan
      )
    `).run({
      id,
      kode: parsed.kode,
      nama: parsed.nama,
      kategori: parsed.kategori,
      jenis: parsed.jenis,
      satuan: parsed.satuan,
      stok,
      stokMinimum: parsed.stokMinimum,
      hargaJual: parsed.hargaJual,
      hargaKomplit: parsed.hargaKomplit,
      hargaSaja: parsed.hargaSaja,
      kondisi: parsed.kondisi,
      catatan: parsed.catatan,
    })

    if (stok > 0) {
      insertJurnal(db, {
        id: uid('j'),
        tanggal: hariIniISO(),
        createdAt: now,
        itemId: id,
        itemNama: parsed.nama,
        satuan: parsed.satuan,
        jenis: 'masuk',
        kuantitas: stok,
        pihak: '',
        pembayaran: '',
        alasan: 'Stok awal',
        catatan: '',
        dicatatOleh: user.nama,
      })
    }
  })
  tx()

  return { ok: true, pesan: 'Barang ditambahkan ke katalog.', itemId: id, ...getState(db, user) }
}

export function ubahItem(db, id, body, user) {
  const lama = db.prepare('SELECT id FROM items WHERE id = ?').get(id)
  if (!lama) return { ok: false, pesan: 'Barang tidak ditemukan.' }

  const parsed = parseItemBody(body)
  if (!parsed.ok) return parsed

  const bentrok = db.prepare('SELECT id FROM items WHERE kode = ? AND id != ?').get(parsed.kode, id)
  if (bentrok) return { ok: false, pesan: 'Kode barang sudah dipakai.' }

  db.prepare(`
    UPDATE items SET
      kode = @kode, nama = @nama, kategori = @kategori, jenis = @jenis, satuan = @satuan,
      stok_minimum = @stokMinimum, harga_jual = @hargaJual, harga_komplit = @hargaKomplit,
      harga_saja = @hargaSaja, kondisi = @kondisi, catatan = @catatan
    WHERE id = @id
  `).run({
    id,
    kode: parsed.kode,
    nama: parsed.nama,
    kategori: parsed.kategori,
    jenis: parsed.jenis,
    satuan: parsed.satuan,
    stokMinimum: parsed.stokMinimum,
    hargaJual: parsed.hargaJual,
    hargaKomplit: parsed.hargaKomplit,
    hargaSaja: parsed.hargaSaja,
    kondisi: parsed.kondisi,
    catatan: parsed.catatan,
  })

  return { ok: true, pesan: 'Data barang disimpan.', ...getState(db, user) }
}

function insertJurnal(db, row) {
  db.prepare(`
    INSERT INTO jurnal (
      id, tanggal, created_at, item_id, item_nama, satuan, jenis, kuantitas,
      pihak, pembayaran, alasan, catatan, dicatat_oleh
    ) VALUES (
      @id, @tanggal, @createdAt, @itemId, @itemNama, @satuan, @jenis, @kuantitas,
      @pihak, @pembayaran, @alasan, @catatan, @dicatatOleh
    )
  `).run(row)
}

export function catatMasuk(db, body, user) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(body.itemId)
  if (!item) return { ok: false, pesan: 'Pilih barang terlebih dahulu.' }
  const qtyParsed = parseQtyInt(body.kuantitas)
  if (!qtyParsed.ok) return qtyParsed
  const qty = qtyParsed.qty

  const tx = db.transaction(() => {
    db.prepare('UPDATE items SET stok = stok + ? WHERE id = ?').run(qty, item.id)
    insertJurnal(db, {
      id: uid('j'),
      tanggal: body.tanggal || hariIniISO(),
      createdAt: Date.now(),
      itemId: item.id,
      itemNama: item.nama,
      satuan: item.satuan,
      jenis: 'masuk',
      kuantitas: qty,
      pihak: '',
      pembayaran: '',
      alasan: 'Barang masuk',
      catatan: body.catatan ?? '',
      dicatatOleh: user.nama,
    })
  })
  tx()
  return { ok: true, pesan: `${item.nama} bertambah ${qty} ${item.satuan}.`, ...getState(db, user) }
}

export function catatTerjual(db, body, user) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(body.itemId)
  if (!item) return { ok: false, pesan: 'Pilih barang terlebih dahulu.' }
  const qtyParsed = parseQtyInt(body.kuantitas)
  if (!qtyParsed.ok) return qtyParsed
  const qty = qtyParsed.qty
  if (qty > item.stok) {
    return { ok: false, pesan: `Stok tidak cukup. Tersisa ${item.stok} ${item.satuan}.` }
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE items SET stok = stok - ? WHERE id = ?').run(qty, item.id)
    insertJurnal(db, {
      id: uid('j'),
      tanggal: body.tanggal || hariIniISO(),
      createdAt: Date.now(),
      itemId: item.id,
      itemNama: item.nama,
      satuan: item.satuan,
      jenis: 'keluar',
      kuantitas: qty,
      pihak: body.pihak ?? '',
      pembayaran: body.pembayaran ?? '',
      alasan: 'Barang terjual',
      catatan: body.catatan ?? '',
      dicatatOleh: user.nama,
    })
  })
  tx()
  return { ok: true, pesan: `${item.nama} terjual ${qty} ${item.satuan}.`, ...getState(db, user) }
}

export function catatPenyesuaian(db, body, user) {
  const perubahan = Array.isArray(body.perubahan) ? body.perubahan : []
  const catatanUmum = body.catatan ?? ''

  const hasil = []
  for (const { itemId, fisik } of perubahan) {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId)
    if (!item) continue
    const fisikParsed = parseNonNegInt(fisik)
    if (!fisikParsed.ok) continue
    const fisikN = fisikParsed.value
    const selisih = fisikN - item.stok
    if (selisih === 0) continue
    hasil.push({ item, selisih, fisik: fisikN })
  }

  if (hasil.length === 0) {
    return { ok: false, pesan: 'Tidak ada selisih yang perlu dicatat.' }
  }

  const tx = db.transaction(() => {
    const now = Date.now()
    const tanggal = hariIniISO()
    const upsertHitung = db.prepare(`
      INSERT INTO hitung_fisik (item_id, fisik) VALUES (?, ?)
      ON CONFLICT(item_id) DO UPDATE SET fisik = excluded.fisik
    `)
    for (const { item, selisih, fisik } of hasil) {
      db.prepare('UPDATE items SET stok = ? WHERE id = ?').run(fisik, item.id)
      upsertHitung.run(item.id, fisik)
      insertJurnal(db, {
        id: uid('j'),
        tanggal,
        createdAt: now,
        itemId: item.id,
        itemNama: item.nama,
        satuan: item.satuan,
        jenis: 'penyesuaian',
        kuantitas: selisih,
        pihak: '',
        pembayaran: '',
        alasan: 'Hasil hitung fisik',
        catatan: catatanUmum
          ? `${catatanUmum} (sistem ${item.stok} → fisik ${fisik})`
          : `Stok sistem ${item.stok}, fisik ${fisik}`,
        dicatatOleh: user.nama,
      })
    }
  })
  tx()
  return { ok: true, pesan: `${hasil.length} barang disesuaikan ke stok fisik.`, ...getState(db, user) }
}

const PERAN_OK = new Set(['Admin', 'Karyawan', 'Operator'])
const STATUS_OK = new Set(['Aktif', 'Nonaktif'])

function adminAktif(u) {
  return u.peran === 'Admin' && u.status === 'Aktif'
}

function jumlahAdminAktif(db) {
  return db.prepare(
    `SELECT COUNT(*) AS n FROM pengguna WHERE peran = 'Admin' AND status = 'Aktif'`,
  ).get().n
}

function parsePenggunaBody(body, wajibEmail) {
  const nama = String(body.nama ?? '').trim()
  const email = normEmail(body.email)
  const peran = String(body.peran ?? '').trim()
  const status = String(body.status ?? 'Aktif').trim()
  const keterangan = String(body.keterangan ?? '').trim()
  if (!nama) return { ok: false, pesan: 'Nama wajib diisi.' }
  if (wajibEmail && !email) return { ok: false, pesan: 'Email wajib diisi.' }
  if (email && !emailOk(email)) return { ok: false, pesan: 'Format email tidak valid.' }
  if (!PERAN_OK.has(peran)) return { ok: false, pesan: 'Peran tidak dikenal.' }
  if (!STATUS_OK.has(status)) return { ok: false, pesan: 'Status tidak dikenal.' }
  return { ok: true, nama, email: email || null, peran, status, keterangan }
}

export function simpanOtp(db, penggunaId, kode, ttlMs) {
  const now = Date.now()
  db.prepare('DELETE FROM otp WHERE pengguna_id = ?').run(penggunaId)
  db.prepare(`
    INSERT INTO otp (id, pengguna_id, kode_hash, kedaluwarsa, percobaan, dibuat)
    VALUES (@id, @penggunaId, @kodeHash, @kedaluwarsa, 0, @dibuat)
  `).run({
    id: uid('otp'),
    penggunaId,
    kodeHash: hashSecret(kode),
    kedaluwarsa: now + ttlMs,
    dibuat: now,
  })
}

export function otpTerbaru(db, penggunaId) {
  return db.prepare(
    'SELECT * FROM otp WHERE pengguna_id = ? ORDER BY dibuat DESC LIMIT 1',
  ).get(penggunaId)
}

export function verifikasiOtp(db, penggunaId, kode) {
  const row = otpTerbaru(db, penggunaId)
  if (!row) return { ok: false, pesan: 'Kode tidak ditemukan. Minta kode baru.' }
  if (Date.now() > row.kedaluwarsa) {
    db.prepare('DELETE FROM otp WHERE id = ?').run(row.id)
    return { ok: false, pesan: 'Kode sudah kedaluwarsa. Minta kode baru.' }
  }
  if (row.percobaan >= OTP_MAX_COBA) {
    db.prepare('DELETE FROM otp WHERE id = ?').run(row.id)
    return { ok: false, pesan: 'Terlalu banyak percobaan. Minta kode baru.' }
  }
  if (!hashSama(row.kode_hash, hashSecret(kode))) {
    db.prepare('UPDATE otp SET percobaan = percobaan + 1 WHERE id = ?').run(row.id)
    return { ok: false, pesan: 'Kode salah.' }
  }
  db.prepare('DELETE FROM otp WHERE pengguna_id = ?').run(penggunaId)
  return { ok: true }
}

export function buatSesi(db, penggunaId, token, ttlMs) {
  db.prepare(`
    INSERT INTO sesi (id, pengguna_id, token_hash, kedaluwarsa)
    VALUES (@id, @penggunaId, @tokenHash, @kedaluwarsa)
  `).run({
    id: uid('sesi'),
    penggunaId,
    tokenHash: hashSecret(token),
    kedaluwarsa: Date.now() + ttlMs,
  })
}

export function penggunaDariSesi(db, token) {
  if (!token) return null
  const row = db.prepare(`
    SELECT p.*, s.kedaluwarsa AS sesi_kedaluwarsa
    FROM sesi s
    JOIN pengguna p ON p.id = s.pengguna_id
    WHERE s.token_hash = ? AND s.kedaluwarsa > ?
  `).get(hashSecret(token), Date.now())
  if (!row) return null
  return { ...toPengguna(row), sesiBerakhir: row.sesi_kedaluwarsa }
}

export function hapusSesiToken(db, token) {
  if (!token) return
  db.prepare('DELETE FROM sesi WHERE token_hash = ?').run(hashSecret(token))
}

export function hapusSesiPengguna(db, penggunaId) {
  db.prepare('DELETE FROM sesi WHERE pengguna_id = ?').run(penggunaId)
}

export function buatPengguna(db, body, actor) {
  const parsed = parsePenggunaBody(body, true)
  if (!parsed.ok) return parsed
  const bentrok = db.prepare('SELECT id FROM pengguna WHERE lower(email) = ?').get(parsed.email)
  if (bentrok) return { ok: false, pesan: 'Email sudah dipakai.' }
  const id = uid('u')
  db.prepare(`
    INSERT INTO pengguna (id, nama, email, peran, status, keterangan)
    VALUES (@id, @nama, @email, @peran, @status, @keterangan)
  `).run({ id, ...parsed })
  return { ok: true, pesan: 'Pengguna ditambahkan.', ...getState(db, actor) }
}

export function ubahPengguna(db, id, body, actor) {
  const lama = getPengguna(db, id)
  if (!lama) return { ok: false, pesan: 'Pengguna tidak ditemukan.' }
  const parsed = parsePenggunaBody(body, true)
  if (!parsed.ok) return parsed
  const bentrok = db.prepare(
    'SELECT id FROM pengguna WHERE lower(email) = ? AND id != ?',
  ).get(parsed.email, id)
  if (bentrok) return { ok: false, pesan: 'Email sudah dipakai.' }

  const baru = { ...lama, ...parsed }
  if (adminAktif(lama) && !adminAktif(baru) && jumlahAdminAktif(db) <= 1) {
    return { ok: false, pesan: 'Tidak bisa menonaktifkan atau menurunkan Admin terakhir.' }
  }
  if (id === actor.id && parsed.status !== 'Aktif') {
    return { ok: false, pesan: 'Tidak bisa menonaktifkan akun yang sedang dipakai.' }
  }

  db.prepare(`
    UPDATE pengguna SET
      nama = @nama, email = @email, peran = @peran, status = @status, keterangan = @keterangan
    WHERE id = @id
  `).run({ id, ...parsed })

  if (parsed.status !== 'Aktif') hapusSesiPengguna(db, id)

  const actorBaru = id === actor.id ? getPengguna(db, actor.id) : actor
  return { ok: true, pesan: 'Pengguna disimpan.', ...getState(db, actorBaru) }
}
