import { formatRp, formatTanggal } from './format.js'

const KUNCI_OPSI = 'revits.strukSetelahSimpan'
const LEBAR = 360
const PAD_X = 32
const TENGAH = LEBAR / 2
const FONT = `'Segoe UI', system-ui, sans-serif`
const FOOTER_1 = 'Terima kasih'
const FOOTER_2 = 'telah berbelanja.'

export function bacaOpsiStruk() {
  try {
    return localStorage.getItem(KUNCI_OPSI) === '1'
  } catch {
    return false
  }
}

export function simpanOpsiStruk(nilai) {
  try {
    localStorage.setItem(KUNCI_OPSI, nilai ? '1' : '0')
  } catch {
    /* abaikan kuota / mode privat */
  }
}

export function rowStrukDariHasil(hasil) {
  return (hasil?.jurnal || []).find((j) => j.jenis === 'keluar') ?? null
}

export function bangunStruk(toko, row, items = []) {
  const merk = String(toko?.merk ?? '').trim().replace(/\s+/g, '').slice(0, 4)
  const qty = Number(row?.kuantitas)
  const produk = items.find((i) => i.id === row?.itemId)
  const harga = hargaSatuan(produk)
  const jumlah = harga != null && Number.isFinite(qty) ? harga * qty : null
  const baris = [
    {
      nama: String(row?.itemNama || 'Barang').trim() || 'Barang',
      kuantitas: row?.kuantitas ?? '',
      satuan: String(row?.satuan || '').trim(),
      harga,
      jumlah,
    },
  ]
  const total = baris.reduce((n, item) => (item.jumlah == null ? n : n + item.jumlah), 0)
  const adaHarga = baris.some((item) => item.jumlah != null)
  return {
    merk,
    nama: String(toko?.nama || 'Toko').trim() || 'Toko',
    telepon: String(toko?.telepon || '').trim(),
    alamat: String(toko?.alamat || '').trim(),
    tanggal: row?.tanggal || '',
    pihak: String(row?.pihak || '').trim(),
    pembayaran: String(row?.pembayaran || '').trim(),
    catatan: String(row?.catatan || '').trim(),
    baris,
    total: adaHarga ? total : null,
  }
}

export function strukKeTeks(struk) {
  const baris = []
  baris.push(struk.nama)
  if (struk.telepon) baris.push(struk.telepon)
  baris.push('')
  if (struk.tanggal) baris.push(formatTanggal(struk.tanggal))
  if (struk.pembayaran) baris.push(struk.pembayaran)
  if (struk.pihak) baris.push(struk.pihak)
  baris.push('')
  for (const item of struk.baris) {
    baris.push(item.nama)
    const qty = [item.kuantitas, item.satuan].filter(Boolean).join(' ')
    if (qty) baris.push(qty)
  }
  if (struk.total != null) {
    baris.push('')
    baris.push(`Total ${formatRp(struk.total)}`)
  }
  if (struk.catatan) {
    baris.push('')
    baris.push(struk.catatan)
  }
  baris.push('')
  baris.push(`${FOOTER_1} ${FOOTER_2}`)
  if (struk.alamat) {
    baris.push('')
    baris.push(struk.alamat)
  }
  return baris.join('\n')
}

export function namaBerkasStruk(struk) {
  const slug = String(struk.nama || 'toko')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const tgl = struk.tanggal || 'struk'
  return `struk-${slug || 'toko'}-${tgl}.png`
}

export function strukKeSvg(struk) {
  const parts = []
  let y = 28

  const merkSize = 40
  const merkX = TENGAH - merkSize / 2
  const merkFs = struk.merk.length > 3 ? 9 : 11
  parts.push(
    `<rect x="${merkX}" y="${y}" width="${merkSize}" height="${merkSize}" rx="8" fill="#0f766e"/>`,
  )
  parts.push(
    teks(TENGAH, y + merkSize / 2, escapeXml(struk.merk), {
      size: merkFs,
      weight: 700,
      fill: '#ffffff',
      baseline: 'middle',
    }),
  )
  y += merkSize + 16

  for (const line of bungkus(struk.nama, 32)) {
    parts.push(teks(TENGAH, y, escapeXml(line), { size: 15, weight: 650, fill: '#1f2933' }))
    y += 20
  }

  if (struk.telepon) {
    y += 2
    for (const line of bungkus(struk.telepon, 32)) {
      parts.push(teks(TENGAH, y, escapeXml(line), { size: 12, fill: '#5c6b7a' }))
      y += 16
    }
  }

  y += 12
  parts.push(garisPutus(y))
  y += 22

  if (struk.tanggal) {
    parts.push(teks(TENGAH, y, escapeXml(formatTanggal(struk.tanggal)), { size: 12, fill: '#5c6b7a' }))
    y += 18
  }
  if (struk.pembayaran) {
    parts.push(teks(TENGAH, y, escapeXml(struk.pembayaran), { size: 12, fill: '#1f2933', weight: 650 }))
    y += 18
  }
  if (struk.pihak) {
    parts.push(teks(TENGAH, y, escapeXml(struk.pihak), { size: 12, fill: '#5c6b7a' }))
    y += 18
  }

  y += 6
  parts.push(garisPutus(y))
  y += 22

  for (const item of struk.baris) {
    for (const line of bungkus(item.nama, 28)) {
      parts.push(teks(TENGAH, y, escapeXml(line), { size: 14, weight: 650, fill: '#1f2933' }))
      y += 18
    }
    const qty = [item.kuantitas, item.satuan].filter(Boolean).join(' ')
    if (qty) {
      parts.push(teks(TENGAH, y, escapeXml(qty), { size: 12, fill: '#5c6b7a' }))
      y += 18
    }
    y += 4
  }

  if (struk.catatan) {
    y += 2
    for (const line of bungkus(struk.catatan, 32)) {
      parts.push(teks(TENGAH, y, escapeXml(line), { size: 12, fill: '#5c6b7a' }))
      y += 16
    }
  }

  y += 8
  parts.push(garisPutus(y))
  y += 26

  if (struk.total != null) {
    parts.push(teks(TENGAH, y, 'Total', { size: 12, fill: '#5c6b7a' }))
    y += 18
    parts.push(teks(TENGAH, y, escapeXml(formatRp(struk.total)), { size: 16, weight: 700, fill: '#1f2933' }))
    y += 22
    parts.push(garisPutus(y))
    y += 26
  }

  parts.push(teks(TENGAH, y, FOOTER_1, { size: 13, weight: 650, fill: '#1f2933' }))
  y += 18
  parts.push(teks(TENGAH, y, FOOTER_2, { size: 12, fill: '#5c6b7a' }))
  y += 36

  if (struk.alamat) {
    for (const line of bungkus(struk.alamat, 40)) {
      parts.push(teks(TENGAH, y, escapeXml(line), { size: 10, fill: '#8a9aab' }))
      y += 14
    }
  }

  y += 22
  const tinggi = y

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEBAR}" height="${tinggi}" viewBox="0 0 ${LEBAR} ${tinggi}">
  <rect width="${LEBAR}" height="${tinggi}" fill="#ffffff"/>
  ${parts.join('\n  ')}
</svg>`
}

export async function strukKePngBlob(struk, scale = 2) {
  const svg = strukKeSvg(struk)
  const blobSvg = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blobSvg)
  try {
    const img = await muatGambar(url)
    const view = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
    const lebar = Number(view?.[1]) || img.naturalWidth || img.width || LEBAR
    const tinggi = Number(view?.[2]) || img.naturalHeight || img.height
    if (!lebar || !tinggi) throw new Error('Gagal merender struk.')
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(lebar * scale)
    canvas.height = Math.round(tinggi * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await canvasKeBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function bungkus(teks, maxChars) {
  const raw = String(teks ?? '').trim()
  if (!raw) return []
  const words = raw.split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if (w.length > maxChars) {
      if (cur) {
        lines.push(cur)
        cur = ''
      }
      for (let i = 0; i < w.length; i += maxChars) {
        const chunk = w.slice(i, i + maxChars)
        if (chunk.length === maxChars) lines.push(chunk)
        else cur = chunk
      }
      continue
    }
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function teks(x, y, content, { size, fill, weight = 400, baseline = 'auto' } = {}) {
  const base = baseline === 'middle' ? ' dominant-baseline="middle"' : ''
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${FONT}"${base}>${content}</text>`
}

function garisPutus(y) {
  return `<line x1="${PAD_X}" y1="${y}" x2="${LEBAR - PAD_X}" y2="${y}" stroke="#d8dee6" stroke-width="1" stroke-dasharray="3 3"/>`
}

function muatGambar(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal merender struk.'))
    img.src = url
  })
}

function canvasKeBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Gagal membuat gambar struk.'))
    }, 'image/png')
  })
}

function hargaSatuan(item) {
  if (!item) return null
  if (item.hargaKomplit != null) return item.hargaKomplit
  if (item.hargaJual != null) return item.hargaJual
  if (item.hargaSaja != null) return item.hargaSaja
  return null
}
