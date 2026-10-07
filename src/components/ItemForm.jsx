import { useMemo } from 'react'
import { daftarKategori } from '../../shared/kategori.js'
import { unikUrut } from '../lib/saran.js'
import { KategoriPicker } from './KategoriPicker'
import { SuggestPicker } from './SuggestPicker'

export function ItemForm({
  form,
  setForm,
  items = [],
  onSubmit,
  onCancel,
  saving,
  title,
  mode = 'baru',
}) {
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const computing = form.kategori === 'Computing'
  const kategoriSuggestions = useMemo(
    () => daftarKategori(items.map((i) => i.kategori)),
    [items],
  )
  const jenisSuggestions = useMemo(() => {
    const kat = String(form.kategori || '').trim().toLowerCase()
    const pasti = kategoriSuggestions.some((k) => k.toLowerCase() === kat)
    return unikUrut(
      items.filter((i) => !pasti || i.kategori.toLowerCase() === kat).map((i) => i.jenis),
    )
  }, [items, form.kategori, kategoriSuggestions])
  const satuanSuggestions = useMemo(
    () => unikUrut(items.map((i) => i.satuan)),
    [items],
  )

  return (
    <form className="panel form narrow" onSubmit={onSubmit}>
      <h2>{title}</h2>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Kode</span>
          <input
            className="input mono"
            value={form.kode}
            onChange={(e) => set('kode', e.target.value)}
            required
          />
        </label>
        <div className="field">
          <span className="field-label">Kategori</span>
          <KategoriPicker
            value={form.kategori}
            onChange={(k) => set('kategori', k)}
            options={kategoriSuggestions}
          />
        </div>
      </div>
      <label className="field">
        <span className="field-label">Nama barang</span>
        <input
          className="input"
          value={form.nama}
          onChange={(e) => set('nama', e.target.value)}
          required
        />
      </label>
      <div className="form-row">
        <div className="field">
          <span className="field-label">Jenis</span>
          <SuggestPicker
            value={form.jenis}
            onChange={(j) => set('jenis', j)}
            options={jenisSuggestions}
            placeholder="Pulpen, Adaptor, dll."
            tambahLabel="Tambah jenis"
            required
          />
        </div>
        <div className="field">
          <span className="field-label">Satuan</span>
          <SuggestPicker
            value={form.satuan}
            onChange={(s) => set('satuan', s)}
            options={satuanSuggestions}
            placeholder="pcs, Box, Lusin…"
            tambahLabel="Tambah satuan"
            maxLength={24}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Stok minimum</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={form.stokMinimum}
            onChange={(e) => set('stokMinimum', e.target.value)}
          />
        </label>
        {mode === 'baru' && (
          <label className="field">
            <span className="field-label">Stok awal</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.stokAwal}
              onChange={(e) => set('stokAwal', e.target.value)}
            />
          </label>
        )}
      </div>
      {computing ? (
        <div className="form-row">
          <label className="field">
            <span className="field-label">Harga komplit</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.hargaKomplit}
              onChange={(e) => set('hargaKomplit', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Harga adaptor saja</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={form.hargaSaja}
              onChange={(e) => set('hargaSaja', e.target.value)}
            />
          </label>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">Harga jual</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={form.hargaJual}
            onChange={(e) => set('hargaJual', e.target.value)}
          />
        </label>
      )}
      {computing && (
        <label className="field">
          <span className="field-label">Kondisi</span>
          <input
            className="input"
            value={form.kondisi}
            onChange={(e) => set('kondisi', e.target.value)}
            placeholder="Baru, Bekas, dll."
          />
        </label>
      )}
      <label className="field">
        <span className="field-label">Catatan</span>
        <input
          className="input"
          value={form.catatan}
          onChange={(e) => set('catatan', e.target.value)}
        />
      </label>
      {mode === 'ubah' && (
        <p className="muted page-sub">Stok hanya berubah lewat Barang Masuk, Terjual, atau Cari Selisih.</p>
      )}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
