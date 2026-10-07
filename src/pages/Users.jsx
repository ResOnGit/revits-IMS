import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, Notice, PageHeader } from '../components/ui'

const PERAN_KET = {
  Admin: 'Akses penuh: katalog, pencatatan, jurnal, selisih, pengguna, dan toko.',
  Karyawan: 'Bisa mencatat barang masuk/terjual dan hitung fisik. Tidak melihat halaman pengguna. Pengaturan toko dikunci.',
  Operator: 'Hanya melihat transaksi, termasuk Tunai dan Non-Tunai / EDC. Tidak mengubah data.',
}

const FORM_KOSONG = {
  nama: '',
  email: '',
  peran: 'Karyawan',
  status: 'Aktif',
  keterangan: '',
}

export default function Users() {
  const { pengguna, currentUser, hak, simpanPengguna } = useApp()
  const [sunting, setSunting] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function mulaiBaru() {
    setSunting('baru')
    setForm(FORM_KOSONG)
    setNotice(null)
  }

  function mulaiUbah(u) {
    setSunting(u.id)
    setForm({
      nama: u.nama,
      email: u.email || '',
      peran: u.peran,
      status: u.status,
      keterangan: u.keterangan || '',
    })
    setNotice(null)
  }

  async function simpan(e) {
    e.preventDefault()
    setSaving(true)
    const hasil = await simpanPengguna(form, sunting === 'baru' ? null : sunting)
    setSaving(false)
    setNotice(hasil)
    if (hasil.ok) {
      setSunting(null)
      setForm(FORM_KOSONG)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengguna"
        subtitle="Akun masuk memakai email. Nonaktif = tidak bisa minta kode."
        actions={
          hak.ubahPengguna ? (
            <button className="btn btn-primary" type="button" onClick={mulaiBaru}>
              Pengguna baru
            </button>
          ) : null
        }
      />

      <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
        {notice?.pesan}
      </Notice>

      {!hak.ubahPengguna && (
        <Notice type="warn">Hanya Admin yang dapat menambah atau mengubah pengguna.</Notice>
      )}

      {sunting && hak.ubahPengguna && (
        <form className="panel form narrow" onSubmit={simpan}>
          <h2>{sunting === 'baru' ? 'Pengguna baru' : 'Ubah pengguna'}</h2>
          <label className="field">
            <span className="field-label">Nama</span>
            <input
              className="input"
              value={form.nama}
              onChange={(e) => set('nama', e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span className="field-label">Peran</span>
              <select className="input" value={form.peran} onChange={(e) => set('peran', e.target.value)}>
                <option>Admin</option>
                <option>Karyawan</option>
                <option>Operator</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="input"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option>Aktif</option>
                <option>Nonaktif</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Keterangan</span>
            <input
              className="input"
              value={form.keterangan}
              onChange={(e) => set('keterangan', e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setSunting(null)
                setNotice(null)
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Status</th>
              <th>Keterangan</th>
              {hak.ubahPengguna && <th />}
            </tr>
          </thead>
          <tbody>
            {pengguna.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="cell-title">{u.nama}</div>
                  {u.id === currentUser?.id && <div className="muted">Anda</div>}
                </td>
                <td>{u.email || '—'}</td>
                <td>
                  <Badge
                    tone={u.peran === 'Admin' ? 'ok' : u.peran === 'Operator' ? 'neutral' : 'comp'}
                  >
                    {u.peran}
                  </Badge>
                </td>
                <td>
                  <Badge tone={u.status === 'Aktif' ? 'ok' : 'neutral'}>{u.status}</Badge>
                </td>
                <td>{u.keterangan}</td>
                {hak.ubahPengguna && (
                  <td>
                    <button className="link-btn" type="button" onClick={() => mulaiUbah(u)}>
                      Ubah
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-grid">
        {Object.entries(PERAN_KET).map(([peran, ket]) => (
          <section key={peran} className="panel">
            <h2>{peran}</h2>
            <p className="page-sub">{ket}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
