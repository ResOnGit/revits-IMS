import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { LABEL_GERAKAN } from '../lib/constants'
import { formatAngka, formatTanggal, hariIniISO, isoOffsetHari, labelHariPendek } from '../lib/format'
import { Badge, EmptyState, PageHeader } from '../components/ui'

const HARI_GRAFIK = 7
const BATAS_TABEL = 8
const BATAS_TERBARU = 6
const BATAS_LARIS = 5

function hitungHari(jurnal, iso) {
  let masuk = 0
  let keluar = 0
  let penyesuaian = 0
  for (const j of jurnal) {
    if (j.tanggal !== iso) continue
    if (j.jenis === 'masuk') masuk += 1
    else if (j.jenis === 'keluar') keluar += 1
    else if (j.jenis === 'penyesuaian') penyesuaian += 1
  }
  return { masuk, keluar, penyesuaian, total: masuk + keluar + penyesuaian }
}

function StokBar({ stok, min }) {
  const target = Math.max(Number(min) || 0, 1)
  const pct = Math.min(100, Math.round((Math.max(0, stok) / target) * 100))
  return (
    <div
      className="stok-bar"
      title={`Stok ${stok} dari minimum ${min}`}
      aria-hidden="true"
    >
      <span className={`stok-bar-fill${pct < 100 ? ' is-low' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Dashboard() {
  const { items, jurnal, setPage, hitungFisik, hak } = useApp()
  const hariIni = hariIniISO()

  const hariList = useMemo(
    () => Array.from({ length: HARI_GRAFIK }, (_, i) => isoOffsetHari(hariIni, i - (HARI_GRAFIK - 1))),
    [hariIni],
  )

  const hariIniHitung = useMemo(() => hitungHari(jurnal, hariIni), [jurnal, hariIni])

  const grafik = useMemo(
    () => hariList.map((iso) => ({ iso, ...hitungHari(jurnal, iso) })),
    [hariList, jurnal],
  )

  const grafikMax = Math.max(1, ...grafik.flatMap((h) => [h.keluar, h.masuk]))

  const stokRendah = useMemo(
    () =>
      items
        .filter((i) => i.stok <= i.stokMinimum)
        .sort((a, b) => a.stok - a.stokMinimum - (b.stok - b.stokMinimum) || a.nama.localeCompare(b.nama, 'id')),
    [items],
  )

  const fisik = useMemo(() => {
    const daftar = []
    let belum = 0
    for (const item of items) {
      const raw = hitungFisik[item.id]
      if (raw === undefined || raw === '') {
        belum += 1
        continue
      }
      const fisikN = Number(raw)
      const beda = fisikN - item.stok
      if (beda !== 0) daftar.push({ item, fisik: fisikN, beda })
    }
    daftar.sort((a, b) => Math.abs(b.beda) - Math.abs(a.beda))
    return { daftar, belum }
  }, [items, hitungFisik])

  const terbaru = useMemo(
    () => [...jurnal].sort((a, b) => b.createdAt - a.createdAt).slice(0, BATAS_TERBARU),
    [jurnal],
  )

  const laris = useMemo(() => {
    const sejak = isoOffsetHari(hariIni, -(HARI_GRAFIK - 1))
    const map = new Map()
    for (const j of jurnal) {
      if (j.jenis !== 'keluar' || j.tanggal < sejak) continue
      const key = j.itemId || j.itemNama
      const row = map.get(key) || { id: key, nama: j.itemNama, satuan: j.satuan, qty: 0 }
      row.qty += Math.abs(j.kuantitas)
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, BATAS_LARIS)
  }, [jurnal, hariIni])

  const totalUnit = useMemo(() => items.reduce((n, i) => n + i.stok, 0), [items])
  const tunaiHariIni = useMemo(
    () =>
      jurnal.filter((j) => j.tanggal === hariIni && j.jenis === 'keluar' && j.pembayaran === 'Tunai')
        .length,
    [jurnal, hariIni],
  )
  const nonTunaiHariIni = hariIniHitung.keluar - tunaiHariIni

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Apa yang terjadi hari ini, dan apa yang perlu dicek."
      />

      <div className="stat-grid">
        <button type="button" className="stat-card" onClick={() => setPage('terjual')}>
          <span className="stat-label">Terjual hari ini</span>
          <span className="stat-value">{hariIniHitung.keluar}</span>
          <span className="stat-hint">
            {hariIniHitung.keluar
              ? `${tunaiHariIni} tunai · ${nonTunaiHariIni} non-tunai`
              : 'Belum ada stok keluar'}
          </span>
        </button>
        <button type="button" className="stat-card" onClick={() => setPage('masuk')}>
          <span className="stat-label">Masuk hari ini</span>
          <span className="stat-value">{hariIniHitung.masuk}</span>
          <span className="stat-hint">
            {hariIniHitung.penyesuaian
              ? `${hariIniHitung.penyesuaian} penyesuaian juga`
              : 'Penerimaan stok'}
          </span>
        </button>
        <button type="button" className="stat-card" onClick={() => setPage('katalog')}>
          <span className="stat-label">Stok rendah</span>
          <span className={`stat-value ${stokRendah.length ? 'is-warn' : ''}`}>
            {stokRendah.length}
          </span>
          <span className="stat-hint">
            {formatAngka(items.length)} jenis · {formatAngka(totalUnit)} satuan
          </span>
        </button>
        <button type="button" className="stat-card" onClick={() => setPage('selisih')}>
          <span className="stat-label">Hitungan fisik</span>
          <span className={`stat-value ${fisik.daftar.length ? 'is-danger' : ''}`}>
            {fisik.daftar.length}
          </span>
          <span className="stat-hint">
            {fisik.daftar.length ? 'selisih vs sistem' : 'tidak ada selisih'}
            {items.length ? ` · ${fisik.belum} belum diisi` : ''}
          </span>
        </button>
      </div>

      <section className="panel panel-spark">
        <div className="panel-head">
          <h2>Gerakan 7 hari</h2>
          <span className="spark-legend">
            <span className="spark-key is-out">Keluar</span>
            <span className="spark-key is-in">Masuk</span>
          </span>
        </div>
        <div className="spark" role="img" aria-label="Jumlah stok keluar dan masuk per hari, tujuh hari terakhir">
          {grafik.map((h) => (
            <div key={h.iso} className="spark-col">
              <div className="spark-bars">
                <span
                  className="spark-bar is-out"
                  style={{ height: `${Math.max(h.keluar ? 8 : 2, (h.keluar / grafikMax) * 100)}%` }}
                  title={`${labelHariPendek(h.iso)}: ${h.keluar} keluar`}
                />
                <span
                  className="spark-bar is-in"
                  style={{ height: `${Math.max(h.masuk ? 8 : 2, (h.masuk / grafikMax) * 100)}%` }}
                  title={`${labelHariPendek(h.iso)}: ${h.masuk} masuk`}
                />
              </div>
              <span className={`spark-label${h.iso === hariIni ? ' is-today' : ''}`}>
                {labelHariPendek(h.iso)}
              </span>
            </div>
          ))}
        </div>
        <p className="muted spark-note">
          Dari jurnal terbaru di sesi ini. Bukan omzet — hanya jumlah catatan masuk dan keluar.
        </p>
      </section>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Stok rendah</h2>
            <button type="button" className="link-btn" onClick={() => setPage('katalog')}>
              Katalog
            </button>
          </div>
          {stokRendah.length === 0 ? (
            <EmptyState text="Tidak ada barang di bawah stok minimum." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Stok</th>
                  <th>Min.</th>
                </tr>
              </thead>
              <tbody>
                {stokRendah.slice(0, BATAS_TABEL).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-title">{item.nama}</div>
                      <div className="muted">{item.kode}</div>
                      <StokBar stok={item.stok} min={item.stokMinimum} />
                    </td>
                    <td>
                      <Badge tone="warn">
                        {item.stok} {item.satuan}
                      </Badge>
                    </td>
                    <td>
                      {item.stokMinimum} {item.satuan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {stokRendah.length > BATAS_TABEL ? (
            <p className="muted table-more">
              +{stokRendah.length - BATAS_TABEL} lagi di katalog
            </p>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Hitungan fisik</h2>
            <button type="button" className="link-btn" onClick={() => setPage('selisih')}>
              Cari selisih
            </button>
          </div>
          <div className="dash-fisik-ringkas">
            <span>
              <strong>{fisik.daftar.length}</strong> selisih
            </span>
            <span>
              <strong>{fisik.belum}</strong> belum diisi
            </span>
            <span>
              <strong>{Math.max(0, items.length - fisik.daftar.length - fisik.belum)}</strong> sesuai
            </span>
          </div>
          {fisik.daftar.length === 0 ? (
            <EmptyState
              text={
                fisik.belum === items.length && items.length > 0
                  ? 'Belum ada hitungan fisik yang diisi.'
                  : 'Tidak ada selisih dari hitungan yang sudah diisi.'
              }
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Sistem</th>
                  <th>Fisik</th>
                  <th>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {fisik.daftar.slice(0, BATAS_TABEL).map(({ item, fisik: fisikN, beda }) => (
                  <tr key={item.id}>
                    <td>{item.nama}</td>
                    <td>
                      {item.stok} {item.satuan}
                    </td>
                    <td>
                      {fisikN} {item.satuan}
                    </td>
                    <td>
                      <span className={beda < 0 ? 'diff-neg' : 'diff-pos'}>
                        {beda > 0 ? '+' : ''}
                        {beda} {item.satuan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Aktivitas terbaru</h2>
            <button type="button" className="link-btn" onClick={() => setPage('jurnal')}>
              Jurnal
            </button>
          </div>
          {terbaru.length === 0 ? (
            <EmptyState text="Belum ada gerakan stok." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Barang</th>
                  <th>Gerakan</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((row) => (
                  <tr key={row.id}>
                    <td>{formatTanggal(row.tanggal)}</td>
                    <td>
                      <div className="cell-title">{row.itemNama}</div>
                      <div className="muted">
                        {row.pihak || row.alasan}
                        {row.pembayaran ? ` · ${row.pembayaran}` : ''}
                      </div>
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
                    <td>
                      {row.jenis === 'keluar' ? '−' : row.jenis === 'masuk' ? '+' : row.kuantitas > 0 ? '+' : ''}
                      {Math.abs(row.kuantitas)} {row.satuan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Paling sering keluar</h2>
            <span className="muted">7 hari</span>
          </div>
          {laris.length === 0 ? (
            <EmptyState text="Belum ada stok keluar di rentang ini." />
          ) : (
            <ol className="laris-list">
              {laris.map((row) => (
                <li key={row.id}>
                  <span className="cell-title">{row.nama}</span>
                  <span className="muted">
                    {formatAngka(row.qty)} {row.satuan}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="dash-actions">
            {hak.ubahInventori ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => setPage('terjual')}>
                  Catat terjual
                </button>
                <button type="button" className="btn" onClick={() => setPage('masuk')}>
                  Catat masuk
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={() => setPage('katalog')}>
                Buka katalog
              </button>
            )}
            <button type="button" className="btn" onClick={() => setPage('selisih')}>
              Cari selisih
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
