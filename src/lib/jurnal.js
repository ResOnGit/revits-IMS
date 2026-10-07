import { JURNAL_PAGE_DEFAULT } from '../../shared/jurnal-limits.js'

export async function fetchJurnal({ page = 1, limit = JURNAL_PAGE_DEFAULT, jenis = 'Semua', q = '', urut = 'baru' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    jenis,
    q,
    urut,
  })
  const res = await fetch(`/api/jurnal?${params}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, pesan: data.pesan || `Server error (${res.status})`, rows: [], total: 0, page: 1, pages: 1, limit }
  }
  return data
}
