import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { daftarKategori } from '../../shared/kategori.js'
import { Notice, PageHeader } from '../components/ui'

export default function CariSelisih() {
  const { items, hitungFisik, setHitungFisik, catatPenyesuaian, hak } = useApp()
  const [kategori, setKategori] = useState('Semua')
  const [notice, setNotice] = useState(null)
  const [catatan, setCatatan] = useState('')

  const kategoriOptions = useMemo(
    () => daftarKategori(items.map((i) => i.kategori)),
    [items],
  )

  const daftar = useMemo(() => {
    return items
      .filter((i) => kategori === 'Semua' || i.kategori === kategori)
      .map((item) => {
        const raw = hitungFisik[item.id]
        const terisi = raw !== undefined && raw !== ''
        const fisik = terisi ? Number(raw) : null
        const beda = terisi ? fisik - item.stok : null
        return { item, terisi, fisik, beda }
      })
  }, [items, hitungFisik, kategori])

  const ringkas = daftar.reduce(
    (acc, row) => {
      if (!row.terisi) acc.belum += 1
      else if (row.beda === 0) acc.sesuai += 1
      else acc.selisih += 1
      return acc
    },
    { belum: 0, sesuai: 0, selisih: 0 },
  )

  function setFisik(itemId, value) {
    setHitungFisik((prev) => ({ ...prev, [itemId]: value }))
  }

  async function simpan() {
    const perubahan = daftar
      .filter((row) => row.terisi && row.beda !== 0)
      .map((row) => ({ itemId: row.item.id, fisik: row.fisik }))
    const hasil = await catatPenyesuaian(perubahan, catatan)
    setNotice(hasil)
  }

  return (
    <div>
      <PageHeader
        title="Cari Selisih"
        subtitle="Bandingkan stok di sistem dengan hasil hitung fisik. Isi kolom fisik, lalu lihat selisihnya."
      />

      <Notice type={notice?.ok ? 'ok' : 'danger'} onClose={() => setNotice(null)}>
        {notice?.pesan}
      </Notice>

      {!hak.ubahInventori && (
        <Notice type="warn">Operator dapat melihat perbandingan, tetapi tidak menyesuaikan stok.</Notice>
      )}

      <div className="selisih-summary">
        <div>
          <strong>{ringkas.selisih}</strong> selisih
        </div>
        <div>
          <strong>{ringkas.sesuai}</strong> sesuai
        </div>
        <div>
          <strong>{ringkas.belum}</strong> belum dihitung
        </div>
      </div>

      <div className="toolbar">
        <select className="select" value={kategori} onChange={(e) => setKategori(e.target.value)}>
          <option>Semua</option>
          {kategoriOptions.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        {hak.ubahInventori && (
          <>
            <input
              className="input"
              style={{ maxWidth: 280 }}
              placeholder="Catatan hitungan (opsional)"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
            <button className="btn btn-primary" type="button" onClick={simpan}>
              Sesuaikan stok yang selisih
            </button>
          </>
        )}
      </div>

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Barang</th>
              <th>Satuan</th>
              <th>Stok sistem</th>
              <th>Stok fisik</th>
              <th>Selisih</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map(({ item, terisi, beda }) => {
              const cls =
                !terisi ? '' : beda < 0 ? 'row-neg' : beda > 0 ? 'row-pos' : 'row-ok'
              return (
                <tr key={item.id} className={cls}>
                  <td>
                    <div className="cell-title">{item.nama}</div>
                    <div className="muted">
                      {item.kode} · {item.kategori}
                    </div>
                  </td>
                  <td>{item.satuan}</td>
                  <td>
                    {item.stok} {item.satuan}
                  </td>
                  <td>
                    <input
                      className="input input-narrow"
                      type="number"
                      min="0"
                      value={hitungFisik[item.id] ?? ''}
                      placeholder="—"
                      disabled={!hak.ubahInventori}
                      onChange={(e) => setFisik(item.id, e.target.value)}
                    />
                  </td>
                  <td>
                    {!terisi ? (
                      <span className="muted">Belum diisi</span>
                    ) : beda === 0 ? (
                      <span className="diff-zero">0 {item.satuan}</span>
                    ) : (
                      <span className={beda < 0 ? 'diff-neg strong' : 'diff-pos strong'}>
                        {beda > 0 ? '+' : ''}
                        {beda} {item.satuan}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
