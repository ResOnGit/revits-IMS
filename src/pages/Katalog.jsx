import { useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatRp } from '../lib/format'
import { Icon } from '../components/Icons'
import { Badge, Modal, Notice, PageHeader } from '../components/ui'
import { daftarKategori, nadaKategori } from '../../shared/kategori.js'
import { FORM_KOSONG, itemKeForm } from '../lib/itemForm'
import { ItemForm } from '../components/ItemForm'

function tampilHarga(item) {
  if (item.hargaKomplit != null) {
    return (
      <div>
        <div>Komplit {formatRp(item.hargaKomplit)}</div>
        {item.hargaSaja != null && (
          <div className="muted">Adaptor saja {formatRp(item.hargaSaja)}</div>
        )}
      </div>
    )
  }
  return formatRp(item.hargaJual)
}

export default function Katalog() {
  const { items, hak, simpanItem } = useApp()
  const [q, setQ] = useState('')
  const [kategori, setKategori] = useState('')
  const [jenis, setJenis] = useState('')
  const [hanyaRendah, setHanyaRendah] = useState(false)
  const [sunting, setSunting] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const suntingRef = useRef(null)
  if (sunting) suntingRef.current = sunting
  const modeSunting = sunting ?? suntingRef.current

  const kategoriOptions = useMemo(
    () => daftarKategori(items.map((i) => i.kategori)),
    [items],
  )

  const daftarJenis = useMemo(() => {
    const set = new Set(
      items
        .filter((i) => !kategori || kategori === 'Semua' || i.kategori === kategori)
        .map((i) => i.jenis),
    )
    return [...set].sort()
  }, [items, kategori])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((item) => {
      if (kategori && kategori !== 'Semua' && item.kategori !== kategori) return false
      if (jenis && jenis !== 'Semua' && item.jenis !== jenis) return false
      if (hanyaRendah && item.stok > item.stokMinimum) return false
      if (!s) return true
      return `${item.nama} ${item.kode} ${item.jenis} ${item.catatan ?? ''}`.toLowerCase().includes(s)
    })
  }, [items, q, kategori, jenis, hanyaRendah])

  function mulaiBaru() {
    setSunting('baru')
    setForm(FORM_KOSONG)
    setNotice(null)
  }

  function mulaiUbah(item) {
    setSunting(item.id)
    setForm(itemKeForm(item))
    setNotice(null)
  }

  async function simpan(e) {
    e.preventDefault()
    setSaving(true)
    const hasil = await simpanItem(form, sunting === 'baru' ? null : sunting)
    setSaving(false)
    setNotice(hasil)
    if (hasil.ok) {
      setSunting(null)
    }
  }

  function tutupForm() {
    setSunting(null)
    setNotice(null)
  }

  return (
    <div>
      <PageHeader
        title="Katalog"
        subtitle="Daftar barang di toko. Tambah, ubah metadata, cari, dan lihat stok serta harga."
        actions={
          hak.ubahInventori ? (
            <button className="btn btn-primary" type="button" onClick={mulaiBaru}>
              Barang baru
            </button>
          ) : null
        }
      />

      <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
        {notice?.pesan}
      </Notice>

      {!hak.ubahInventori && (
        <Notice type="warn">Operator hanya melihat katalog. Tambah/ubah barang dinonaktifkan.</Notice>
      )}

      <Modal open={Boolean(sunting) && hak.ubahInventori} onClose={tutupForm}>
        <Notice type="danger" onClose={() => setNotice(null)}>
          {notice && !notice.ok ? notice.pesan : null}
        </Notice>
        <ItemForm
          form={form}
          setForm={setForm}
          items={items}
          onSubmit={simpan}
          onCancel={tutupForm}
          saving={saving}
          title={modeSunting === 'baru' ? 'Barang baru' : 'Ubah barang'}
          mode={modeSunting === 'baru' ? 'baru' : 'ubah'}
        />
      </Modal>

      <div className="toolbar">
        <div className="search-wrap">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            placeholder="Cari nama, kode, atau jenis barang…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={`select${kategori ? '' : ' is-placeholder'}`}
          value={kategori}
          onChange={(e) => {
            const next = e.target.value === 'Semua' ? '' : e.target.value
            setKategori(next)
            setJenis('')
          }}
        >
          <option value="" disabled hidden>
            Cari kategori
          </option>
          <option value="Semua">N/A</option>
          {kategoriOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className={`select${jenis ? '' : ' is-placeholder'}`}
          value={jenis}
          onChange={(e) => setJenis(e.target.value === 'Semua' ? '' : e.target.value)}
        >
          <option value="" disabled hidden>
            Cari jenis…
          </option>
          <option value="Semua">N/A</option>
          {daftarJenis.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={hanyaRendah}
            onChange={(e) => setHanyaRendah(e.target.checked)}
          />
          Stok rendah
        </label>
      </div>

      <p className="result-count">{filtered.length} barang</p>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Barang</th>
              <th>Kategori</th>
              <th>Stok</th>
              <th>Satuan</th>
              <th>Harga</th>
              {hak.ubahInventori && <th />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const rendah = item.stok <= item.stokMinimum
              return (
                <tr key={item.id}>
                  <td className="mono">{item.kode}</td>
                  <td>
                    <div className="cell-title">{item.nama}</div>
                    <div className="muted">
                      {item.jenis}
                      {item.kondisi ? ` · ${item.kondisi}` : ''}
                      {item.catatan ? ` · ${item.catatan}` : ''}
                    </div>
                  </td>
                  <td>
                    <Badge tone={nadaKategori(item.kategori)}>{item.kategori}</Badge>
                  </td>
                  <td>
                    <span className={rendah ? 'stok-low' : ''}>
                      {item.stok}
                      {rendah ? ' · rendah' : ''}
                    </span>
                  </td>
                  <td>{item.satuan}</td>
                  <td>{tampilHarga(item)}</td>
                  {hak.ubahInventori && (
                    <td>
                      <button className="link-btn" type="button" onClick={() => mulaiUbah(item)}>
                        Ubah
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty">Tidak ada barang yang cocok.</p>}
      </div>
    </div>
  )
}
