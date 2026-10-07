import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { hariIniISO } from '../lib/format'
import { ItemPicker } from '../components/ItemPicker'
import { StrukModal } from '../components/Struk'
import { Badge, MODAL_LEAVE_MS, Modal, Notice, PageHeader } from '../components/ui'
import { bacaOpsiStruk, rowStrukDariHasil, simpanOpsiStruk } from '../lib/struk'

export default function BarangTerjual() {
  const { items, catatTerjual, hak, jurnal, toko } = useApp()
  const [catatOpen, setCatatOpen] = useState(false)
  const [itemId, setItemId] = useState('')
  const [kuantitas, setKuantitas] = useState('')
  const [pihak, setPihak] = useState('')
  const [tanggal, setTanggal] = useState(hariIniISO())
  const [pembayaran, setPembayaran] = useState('Tunai')
  const [catatan, setCatatan] = useState('')
  const [tampilStruk, setTampilStruk] = useState(bacaOpsiStruk)
  const [strukRow, setStrukRow] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterHari, setFilterHari] = useState(true)
  const [filterBayar, setFilterBayar] = useState('Semua')

  const item = items.find((i) => i.id === itemId)
  const hariIni = hariIniISO()
  const strukTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(strukTimer.current), [])

  const penjualan = useMemo(() => {
    return jurnal.filter((j) => {
      if (j.jenis !== 'keluar') return false
      if (filterHari && j.tanggal !== hariIni) return false
      if (filterBayar !== 'Semua' && j.pembayaran !== filterBayar) return false
      return true
    })
  }, [jurnal, filterHari, filterBayar, hariIni])

  function bukaCatat() {
    setNotice(null)
    setCatatOpen(true)
  }

  function gantiOpsiStruk(nilai) {
    setTampilStruk(nilai)
    simpanOpsiStruk(nilai)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const hasil = await catatTerjual({ itemId, kuantitas, pihak, tanggal, pembayaran, catatan })
    setSaving(false)
    if (hasil.ok) {
      const row = rowStrukDariHasil(hasil)
      setCatatOpen(false)
      setItemId('')
      setKuantitas('')
      setPihak('')
      setCatatan('')
      if (tampilStruk && row) {
        setNotice(null)
        window.clearTimeout(strukTimer.current)
        strukTimer.current = window.setTimeout(() => setStrukRow(row), MODAL_LEAVE_MS)
      } else {
        setNotice(hasil)
      }
    } else {
      setNotice(hasil)
    }
  }

  return (
    <div>
      <PageHeader
        title="Barang Terjual"
        subtitle="Catat barang yang keluar karena dijual. Bisa ke pelanggan toko atau instansi."
        actions={
          hak.ubahInventori ? (
            <button className="btn btn-primary" type="button" onClick={bukaCatat}>
              Catat penjualan
            </button>
          ) : null
        }
      />

      {!catatOpen && (
        <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
          {notice?.pesan}
        </Notice>
      )}

      {!hak.ubahInventori && (
        <Notice type="warn">
          Operator hanya melihat transaksi. Gunakan saringan di bawah untuk Tunai / Non-Tunai.
        </Notice>
      )}

      <Modal open={catatOpen && hak.ubahInventori} onClose={() => setCatatOpen(false)}>
        <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
          {notice?.pesan}
        </Notice>
        <form className="panel form" onSubmit={submit}>
          <h2>Catat penjualan</h2>
          <ItemPicker items={items} value={itemId} onChange={setItemId} />
          <div className="form-row">
            <label className="field">
              <span className="field-label">Jumlah</span>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={kuantitas}
                onChange={(e) => setKuantitas(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Satuan</span>
              <input className="input" value={item?.satuan ?? '—'} readOnly />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Pembeli / kategori</span>
            <input
              className="input"
              value={pihak}
              placeholder="Contoh: Pelanggan toko, Samapta, Biddokkes"
              onChange={(e) => setPihak(e.target.value)}
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span className="field-label">Tanggal</span>
              <input
                className="input"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Pembayaran</span>
              <select
                className="select"
                value={pembayaran}
                onChange={(e) => setPembayaran(e.target.value)}
              >
                <option>Tunai</option>
                <option>Non-Tunai / EDC</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Catatan</span>
            <textarea
              className="input"
              rows={3}
              value={catatan}
              placeholder="Opsional"
              onChange={(e) => setCatatan(e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={tampilStruk}
              onChange={(e) => gantiOpsiStruk(e.target.checked)}
            />
            Tampilkan struk setelah simpan
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan penjualan'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setCatatOpen(false)}>
              Batal
            </button>
          </div>
        </form>
      </Modal>

      <section className="panel">
        <div className="panel-head">
          <h2>Transaksi keluar</h2>
        </div>
        <div className="toolbar compact">
          <label className="check">
            <input
              type="checkbox"
              checked={filterHari}
              onChange={(e) => setFilterHari(e.target.checked)}
            />
            Hari ini saja
          </label>
          <select
            className="select"
            value={filterBayar}
            onChange={(e) => setFilterBayar(e.target.value)}
          >
            <option value="Semua">Semua pembayaran</option>
            <option value="Tunai">Tunai</option>
            <option value="Non-Tunai / EDC">Non-Tunai / EDC</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Barang</th>
                <th>Pembeli</th>
                <th>Bayar</th>
                <th>Jumlah</th>
                <th className="cell-aksi">
                  <span className="sr-only">Struk</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {penjualan.map((row) => (
                <tr key={row.id}>
                  <td>{row.tanggal}</td>
                  <td>{row.itemNama}</td>
                  <td>{row.pihak || '—'}</td>
                  <td>
                    {row.pembayaran ? (
                      <Badge tone={row.pembayaran === 'Tunai' ? 'ok' : 'comp'}>
                        {row.pembayaran}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    −{row.kuantitas} {row.satuan}
                  </td>
                  <td className="cell-aksi">
                    <button type="button" className="link-btn" onClick={() => setStrukRow(row)}>
                      Struk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {penjualan.length === 0 && (
          <p className="empty">Tidak ada transaksi untuk saringan ini.</p>
        )}
      </section>

      <StrukModal
        open={Boolean(strukRow)}
        onClose={() => setStrukRow(null)}
        toko={toko}
        row={strukRow}
        items={items}
      />
    </div>
  )
}
