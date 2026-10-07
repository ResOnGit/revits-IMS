export function formatRp(nilai) {
  if (nilai == null || nilai === '') return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai)
}

export function formatTanggal(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`))
}

export function formatAngka(nilai) {
  return new Intl.NumberFormat('id-ID').format(nilai)
}

export const SESI_HAMPIR_HABIS_MS = 2 * 60 * 60 * 1000

export function sisaSesi(berakhir) {
  if (!berakhir) {
    return { teks: 'tidak diketahui', ms: null, hampirHabis: false }
  }
  const sisa = berakhir - Date.now()
  if (sisa <= 0) {
    return { teks: 'habis', ms: 0, hampirHabis: true }
  }
  const menit = Math.floor(sisa / 60_000)
  const jam = Math.floor(menit / 60)
  const sisaMenit = menit % 60
  let teks
  if (jam >= 1) {
    teks = sisaMenit ? `${jam} jam ${sisaMenit} menit` : `${jam} jam`
  } else {
    teks = `${Math.max(1, menit)} menit`
  }
  return { teks, ms: sisa, hampirHabis: sisa <= SESI_HAMPIR_HABIS_MS }
}

export function hariIniISO() {
  return keISO(new Date())
}

export function isoOffsetHari(iso, hari) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + hari)
  return keISO(d)
}

export function labelHariPendek(iso) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(new Date(`${iso}T00:00:00`))
}

function keISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
