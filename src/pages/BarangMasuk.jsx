import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { hariIniISO } from '../lib/format'
import { ItemPicker } from '../components/ItemPicker'
import { FORM_KOSONG } from '../lib/itemForm'
import { ItemForm } from '../components/ItemForm'
import { Modal, Notice, PageHeader } from '../components/ui'

export default function BarangMasuk() {
  const { items, catatMasuk, hak, jurnal, simpanItem } = useApp()
  const [catatOpen, setCatatOpen] = useState(false)
  const [itemId, setItemId] = useState('')
  const [kuantitas, setKuantitas] = useState('')
  const [tanggal, setTanggal] = useState(hariIniISO())
  const [catatan, setCatatan] = useState('')
  const [notice, setNotice] = useState(null)
  const [tambahBaru, setTambahBaru] = useState(false)
  const [formBaru, setFormBaru] = useState(FORM_KOSONG)
  const [saving, setSaving] = useState(false)
  const [savingBaru, setSavingBaru] = useState(false)

  const item = items.find((i) => i.id === itemId)
  const riwayatMasuk = jurnal.filter((j) => j.jenis === 'masuk').slice(0, 8)

  function bukaCatat() {
    setNotice(null)
    setTambahBaru(false)
    setCatatOpen(true)
  }

  function tutupCatat() {
    setCatatOpen(false)
    setTambahBaru(false)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const hasil = await catatMasuk({ itemId, kuantitas, tanggal, catatan })
    setSaving(false)
    setNotice(hasil)
    if (hasil.ok) {
      setItemId('')
      setKuantitas('')
      setCatatan('')
      setCatatOpen(false)
    }
  }

  async function simpanBaru(e) {
    e.preventDefault()
    setSavingBaru(true)
    const hasil = await simpanItem(formBaru)
    setSavingBaru(false)
    if (hasil.ok) {
      if (hasil.itemId) setItemId(hasil.itemId)
      setTambahBaru(false)
      setFormBaru(FORM_KOSONG)
      setNotice({ ok: true, pesan: 'Barang ditambahkan. Lanjut isi jumlah masuk.' })
    } else {
      setNotice(hasil)
    }
  }

  return (
    <div>
      <PageHeader
        title="Barang Masuk"
        subtitle="Catat barang yang masuk ke toko. Stok katalog akan bertambah."
        actions={
          hak.ubahInventori ? (
            <button className="btn btn-primary" type="button" onClick={bukaCatat}>
              Catat masuk
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
        <Notice type="warn">Operator hanya dapat melihat. Pencatatan barang masuk dinonaktifkan.</Notice>
      )}

      <Modal open={catatOpen && hak.ubahInventori} onClose={tutupCatat}>
        <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
          {notice?.pesan}
        </Notice>
        {tambahBaru ? (
          <ItemForm
            form={formBaru}
            setForm={setFormBaru}
            items={items}
            onSubmit={simpanBaru}
            onCancel={() => {
              setTambahBaru(false)
              setNotice(null)
            }}
            saving={savingBaru}
            title="Tambah barang ke katalog"
            mode="baru"
          />
        ) : (
          <form className="panel form" onSubmit={submit}>
            <h2>Catat masuk</h2>
            <ItemPicker
              items={items}
              value={itemId}
              onChange={setItemId}
              onTambah={() => {
                setFormBaru(FORM_KOSONG)
                setNotice(null)
                setTambahBaru(true)
              }}
            />
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
              <span className="field-label">Tanggal</span>
              <input
                className="input"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Catatan</span>
              <textarea
                className="input"
                rows={3}
                value={catatan}
                placeholder="Supplier, nomor nota, kondisi, dll."
                onChange={(e) => setCatatan(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan barang masuk'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={tutupCatat}>
                Batal
              </button>
            </div>
          </form>
        )}
      </Modal>

      <section className="panel">
        <h2>Masuk terakhir</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Barang</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {riwayatMasuk.map((row) => (
                <tr key={row.id}>
                  <td>{row.tanggal}</td>
                  <td>
                    <div>{row.itemNama}</div>
                    <div className="muted">{row.catatan || row.alasan}</div>
                  </td>
                  <td>
                    +{row.kuantitas} {row.satuan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
