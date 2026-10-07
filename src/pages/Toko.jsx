import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { BrandMark, Notice, PageHeader } from '../components/ui'

export default function Toko() {
  const { toko, simpanToko, hak } = useApp()
  const [form, setForm] = useState({ ...toko, merk: toko.merk ?? '' })
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function simpan(e) {
    e.preventDefault()
    setSaving(true)
    const hasil = await simpanToko(form)
    setSaving(false)
    setNotice(hasil)
    if (hasil.ok && hasil.toko) setForm(hasil.toko)
  }

  return (
    <div>
      <PageHeader
        title="Toko"
        subtitle="Informasi toko. General, etc."
      />

      <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
        {notice?.pesan}
      </Notice>

      {!hak.ubahToko && (
        <Notice type="warn">Hanya Admin yang dapat mengubah data toko pada prototype ini.</Notice>
      )}

      <form className="panel form narrow" onSubmit={simpan}>
        <label className="field">
          <span className="field-label">Nama toko</span>
          <input
            className="input"
            value={form.nama}
            disabled={!hak.ubahToko}
            onChange={(e) => set('nama', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Lambang</span>
          <div className="merk-row">
            <BrandMark text={form.merk} />
            <input
              className="input"
              value={form.merk ?? ''}
              maxLength={4}
              disabled={!hak.ubahToko}
              onChange={(e) => set('merk', e.target.value.replace(/\s/g, '').slice(0, 4))}
            />
          </div>
          <span className="muted">Kotak di sidebar dan halaman masuk. Maksimal 4 karakter.</span>
        </label>
        <label className="field">
          <span className="field-label">Nama pendek</span>
          <input
            className="input"
            value={form.namaPendek}
            disabled={!hak.ubahToko}
            onChange={(e) => set('namaPendek', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Tagline</span>
          <input
            className="input"
            value={form.tagline}
            disabled={!hak.ubahToko}
            onChange={(e) => set('tagline', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Alamat</span>
          <input
            className="input"
            value={form.alamat}
            disabled={!hak.ubahToko}
            onChange={(e) => set('alamat', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Telepon</span>
          <input
            className="input"
            value={form.telepon}
            disabled={!hak.ubahToko}
            onChange={(e) => set('telepon', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Catatan (opsional*)</span>
          <textarea
            className="input"
            rows={4}
            value={form.catatan}
            disabled={!hak.ubahToko}
            onChange={(e) => set('catatan', e.target.value)}
          />
        </label>
        {hak.ubahToko && (
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        )}
      </form>
    </div>
  )
}
