import { useMemo, useState } from 'react'

export function ItemPicker({ items, value, onChange, disabled, onTambah }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const selected = items.find((i) => i.id === value)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((item) =>
      `${item.nama} ${item.kode} ${item.jenis} ${item.kategori}`.toLowerCase().includes(s),
    )
  }, [items, q])

  return (
    <div className="picker">
      <label className="field-label">Barang</label>
      <input
        className="input"
        disabled={disabled}
        placeholder="Cari nama, kode, atau jenis…"
        value={open ? q : selected ? `${selected.nama} (${selected.kode})` : q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => {
          setOpen(true)
          setQ('')
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
      />
      {open && !disabled && (
        <ul className="picker-list">
          {filtered.length === 0 && <li className="picker-empty">Tidak ada barang.</li>}
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="picker-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.id)
                  setQ('')
                  setOpen(false)
                }}
              >
                <span>
                  <strong>{item.nama}</strong>
                  <span className="muted">
                    {item.kode} · {item.kategori} · {item.jenis}
                  </span>
                </span>
                <span className="picker-stok">
                  {item.stok} {item.satuan}
                </span>
              </button>
            </li>
          ))}
          {onTambah && (
            <li className="picker-tambah">
              <button
                type="button"
                className="link-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  onTambah()
                }}
              >
                Barang belum ada? Tambah ke katalog
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
