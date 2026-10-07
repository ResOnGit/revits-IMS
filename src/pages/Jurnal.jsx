import { useEffect, useState } from 'react'
import { LABEL_GERAKAN } from '../lib/constants'
import { formatTanggal } from '../lib/format'
import { fetchJurnal } from '../lib/jurnal'
import { Icon } from '../components/Icons'
import { Badge, Notice, PageHeader } from '../components/ui'

export default function Jurnal() {
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [jenis, setJenis] = useState('Semua')
  const [urut, setUrut] = useState('baru')
  const [halaman, setHalaman] = useState(1)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 50 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      setQDebounced(q)
      setHalaman(1)
    }, 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      const data = await fetchJurnal({
        page: halaman,
        jenis,
        q: qDebounced,
        urut,
      })
      if (cancelled) return
      if (data.ok === false) {
        setError(data.pesan || 'Gagal memuat jurnal.')
        setRows([])
        setMeta({ total: 0, page: 1, pages: 1, limit: data.limit ?? 50 })
      } else {
        setRows(data.rows ?? [])
        setMeta({
          total: data.total ?? 0,
          page: data.page ?? 1,
          pages: data.pages ?? 1,
          limit: data.limit ?? 50,
        })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [halaman, jenis, urut, qDebounced])

  const mulai = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const selesai = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div>
      <PageHeader
        title="Jurnal"
        subtitle="Riwayat gerakan stok: masuk, keluar, dan penyesuaian. Bukan laporan akuntansi."
      />

      {error && (
        <Notice type="danger" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      <div className="toolbar">
        <div className="search-wrap">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            placeholder="Cari barang, instansi, atau catatan…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={jenis}
          onChange={(e) => {
            setJenis(e.target.value)
            setHalaman(1)
          }}
        >
          <option value="Semua">Semua gerakan</option>
          <option value="masuk">Stok masuk</option>
          <option value="keluar">Stok keluar</option>
          <option value="penyesuaian">Penyesuaian</option>
        </select>
        <select
          className="select"
          value={urut}
          onChange={(e) => {
            setUrut(e.target.value)
            setHalaman(1)
          }}
        >
          <option value="baru">Tanggal terbaru</option>
          <option value="lama">Tanggal terlama</option>
        </select>
      </div>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Barang</th>
              <th>Gerakan</th>
              <th>Jumlah</th>
              <th>Alasan / catatan</th>
              <th>Pihak</th>
              <th>Dicatat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty">
                  Memuat jurnal…
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatTanggal(row.tanggal)}</td>
                  <td>
                    <div className="cell-title">{row.itemNama}</div>
                  </td>
                  <td>
                    <Badge
                      tone={
                        row.jenis === 'masuk' ? 'ok' : row.jenis === 'keluar' ? 'warn' : 'neutral'
                      }
                    >
                      {LABEL_GERAKAN[row.jenis]}
                    </Badge>
                  </td>
                  <td className={row.jenis === 'keluar' || row.kuantitas < 0 ? 'diff-neg' : 'diff-pos'}>
                    {row.jenis === 'keluar'
                      ? `−${row.kuantitas}`
                      : row.kuantitas > 0
                        ? `+${row.kuantitas}`
                        : row.kuantitas}{' '}
                    {row.satuan}
                  </td>
                  <td>
                    <div>{row.alasan}</div>
                    {row.catatan && <div className="muted">{row.catatan}</div>}
                    {row.pembayaran && <div className="muted">{row.pembayaran}</div>}
                  </td>
                  <td>{row.pihak || '—'}</td>
                  <td className="muted">{row.dicatatOleh}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="empty">Tidak ada entri jurnal.</p>}

        {!loading && meta.total > 0 && (
          <div className="pager">
            <p className="pager-info muted">
              Menampilkan {mulai}–{selesai} dari {meta.total}
              {meta.pages > 1 && ` · Halaman ${meta.page} dari ${meta.pages}`}
            </p>
            <div className="pager-actions">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={meta.page <= 1}
                onClick={() => setHalaman((p) => p - 1)}
              >
                Sebelumnya
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={meta.page >= meta.pages}
                onClick={() => setHalaman((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
