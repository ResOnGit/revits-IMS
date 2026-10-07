export function unikUrut(...sumber) {
  const seen = new Set()
  const hasil = []
  for (const nama of sumber.flat()) {
    const trimmed = String(nama || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    hasil.push(trimmed)
  }
  return hasil.sort((a, b) => a.localeCompare(b, 'id'))
}

export function cocokSaran(daftar, nama) {
  const s = String(nama || '').trim()
  if (!s) return ''
  return daftar.find((k) => k.toLowerCase() === s.toLowerCase()) || s
}

export function saringSaran(daftar, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return daftar
  const persis = []
  const awal = []
  const dalam = []
  for (const nama of daftar) {
    const n = nama.toLowerCase()
    if (n === q) persis.push(nama)
    else if (n.startsWith(q)) awal.push(nama)
    else if (n.includes(q)) dalam.push(nama)
  }
  return [...persis, ...awal, ...dalam]
}
