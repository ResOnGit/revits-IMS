import { KATEGORI_MAX_LEN } from '../shared/kategori.js'

/** Bilangan bulat positif untuk qty transaksi. */
export function parseQtyInt(value, { max = 1_000_000 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > max) {
    return { ok: false, pesan: 'Jumlah harus bilangan bulat positif.' }
  }
  return { ok: true, qty: n }
}

/** Bilangan bulat non-negatif (stok minimum, fisik, harga). */
export function parseNonNegInt(value, { max = 999_999_999, allowEmpty = false } = {}) {
  if (allowEmpty && (value === '' || value == null)) {
    return { ok: true, value: null }
  }
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) {
    return { ok: false, pesan: 'Angka tidak valid.' }
  }
  return { ok: true, value: n }
}

export function parseItemBody(body, { wajibKode = true, izinkanStokAwal = false } = {}) {
  const kode = String(body.kode ?? '').trim()
  const nama = String(body.nama ?? '').trim()
  const kategori = String(body.kategori ?? '').trim()
  const jenis = String(body.jenis ?? '').trim()
  const satuan = String(body.satuan ?? '').trim()
  const kondisi = String(body.kondisi ?? '').trim()
  const catatan = String(body.catatan ?? '').trim()

  if (wajibKode && !kode) return { ok: false, pesan: 'Kode wajib diisi.' }
  if (kode.length > 32) return { ok: false, pesan: 'Kode terlalu panjang.' }
  if (!nama) return { ok: false, pesan: 'Nama barang wajib diisi.' }
  if (nama.length > 120) return { ok: false, pesan: 'Nama terlalu panjang.' }
  if (!kategori) return { ok: false, pesan: 'Kategori wajib diisi.' }
  if (kategori.length > KATEGORI_MAX_LEN) return { ok: false, pesan: 'Kategori terlalu panjang.' }
  if (!jenis) return { ok: false, pesan: 'Jenis wajib diisi.' }
  if (!satuan) return { ok: false, pesan: 'Satuan wajib diisi.' }
  if (satuan.length > 24) return { ok: false, pesan: 'Satuan terlalu panjang.' }

  const stokMinimum = parseNonNegInt(body.stokMinimum ?? 0)
  if (!stokMinimum.ok) return stokMinimum

  let stokAwal = { ok: true, value: 0 }
  if (izinkanStokAwal) {
    stokAwal = parseNonNegInt(body.stokAwal ?? 0)
    if (!stokAwal.ok) return stokAwal
  }

  const hargaJual = parseNonNegInt(body.hargaJual, { allowEmpty: true })
  if (!hargaJual.ok) return hargaJual
  const hargaKomplit = parseNonNegInt(body.hargaKomplit, { allowEmpty: true })
  if (!hargaKomplit.ok) return hargaKomplit
  const hargaSaja = parseNonNegInt(body.hargaSaja, { allowEmpty: true })
  if (!hargaSaja.ok) return hargaSaja

  return {
    ok: true,
    kode,
    nama,
    kategori,
    jenis,
    satuan,
    kondisi: kondisi || null,
    catatan: catatan || null,
    stokMinimum: stokMinimum.value,
    stokAwal: stokAwal.value,
    hargaJual: hargaJual.value,
    hargaKomplit: hargaKomplit.value,
    hargaSaja: hargaSaja.value,
  }
}
