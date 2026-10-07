import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cocokSaran, saringSaran, unikUrut } from '../lib/saran.js'

export function SuggestPicker({
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
  required,
  maxLength,
  tambahLabel = 'Tambah',
  susun,
}) {
  const rootRef = useRef(null)
  const aktifRef = useRef(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const awalRef = useRef(value)
  const daftarRef = useRef([])
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [ekstra, setEkstra] = useState([])
  const [aktif, setAktif] = useState(0)

  const teks = String(value ?? '')
  const daftar = useMemo(
    () => (susun ? susun(options, ekstra) : unikUrut(options, ekstra)),
    [options, ekstra, susun],
  )
  const filtered = useMemo(() => saringSaran(daftar, teks), [daftar, teks])
  const bisaTambah =
    Boolean(teks.trim()) && !daftar.some((k) => k.toLowerCase() === teks.trim().toLowerCase())
  const tampilList = open && !disabled && (filtered.length > 0 || bisaTambah)

  valueRef.current = value
  onChangeRef.current = onChange
  daftarRef.current = daftar

  useEffect(() => {
    if (!open) return undefined
    function tutup(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        commitDanTutup()
      }
    }
    document.addEventListener('mousedown', tutup)
    return () => document.removeEventListener('mousedown', tutup)
  }, [open])

  useEffect(() => {
    if (!tampilList) return
    aktifRef.current?.scrollIntoView({ block: 'nearest' })
  }, [aktif, tampilList])

  function commitDanTutup() {
    setOpen(false)
    const trimmed = String(valueRef.current || '').trim()
    const rapi = trimmed ? cocokSaran(daftarRef.current, trimmed) : ''
    if (rapi !== valueRef.current) onChangeRef.current(rapi)
  }

  function batal() {
    setOpen(false)
    if (awalRef.current !== valueRef.current) onChangeRef.current(awalRef.current)
  }

  function pilih(nama) {
    onChange(nama)
    setOpen(false)
  }

  function tambah() {
    const nama = teks.trim()
    if (!nama) return
    if (maxLength && nama.length > maxLength) return
    const existing = cocokSaran(daftar, nama)
    if (daftar.some((k) => k.toLowerCase() === nama.toLowerCase())) {
      pilih(existing)
      return
    }
    setEkstra((prev) => [...prev, nama])
    pilih(nama)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      batal()
      return
    }
    if (e.key === 'Tab') {
      commitDanTutup()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setAktif(0)
        return
      }
      const max = filtered.length + (bisaTambah ? 1 : 0) - 1
      if (max < 0) return
      setAktif((i) => Math.min(i + 1, max))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return
      setAktif((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (aktif < filtered.length) {
        pilih(filtered[aktif])
        return
      }
      if (bisaTambah) tambah()
    }
  }

  return (
    <div className={`picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <div className="picker-combo">
        <input
          className="input"
          value={teks}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={tampilList}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setAktif(0)
          }}
          onFocus={(e) => {
            awalRef.current = value
            setOpen(true)
            setAktif(0)
            e.target.select()
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {tampilList && (
        <div className="picker-list picker-kategori">
          <ul className="picker-options" id={listId} role="listbox">
            {filtered.map((nama, i) => (
              <li key={nama.toLowerCase()}>
                <button
                  type="button"
                  ref={i === aktif ? aktifRef : null}
                  className={`picker-item${i === aktif ? ' is-on' : ''}`}
                  role="option"
                  aria-selected={i === aktif}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setAktif(i)}
                  onClick={() => pilih(nama)}
                >
                  {nama}
                </button>
              </li>
            ))}
          </ul>
          {bisaTambah && (
            <div className="picker-tambah">
              <button
                type="button"
                ref={aktif === filtered.length ? aktifRef : null}
                className={`link-btn${aktif === filtered.length ? ' is-on' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAktif(filtered.length)}
                onClick={tambah}
              >
                {tambahLabel} “{teks.trim()}”
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
