export const KATEGORI_MAX_LEN = 40

function unikBerurutan(namaList) {
  const seen = new Set()
  const hasil = []
  for (const nama of namaList) {
    const trimmed = String(nama || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    hasil.push(trimmed)
  }
  return hasil
}

/** Unik, urut abjad. Hanya dari barang yang sudah ada (plus yang sedang diketik). */
export function daftarKategori(...sumber) {
  return unikBerurutan(sumber.flat()).sort((a, b) => a.localeCompare(b, 'id'))
}

export function cocokKategori(daftar, nama) {
  const s = String(nama || '').trim()
  if (!s) return ''
  return daftar.find((k) => k.toLowerCase() === s.toLowerCase()) || s
}

export function nadaKategori(nama) {
  if (nama === 'ATK') return 'atk'
  if (nama === 'Computing') return 'comp'
  return 'neutral'
}
