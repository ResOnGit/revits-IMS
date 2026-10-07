import { useMemo, useState } from 'react'
import { Icon } from './Icons'
import { Modal } from './ui'
import { bangunStruk, namaBerkasStruk, strukKePngBlob, strukKeSvg, strukKeTeks } from '../lib/struk'

export function StrukModal({ open, onClose, toko, row, items = [] }) {
  const [held, setHeld] = useState(row)
  if (row && row !== held) setHeld(row)
  const sumber = row || held
  const struk = useMemo(
    () => (sumber ? bangunStruk(toko, sumber, items) : null),
    [toko, sumber, items],
  )
  const svg = useMemo(() => (struk ? strukKeSvg(struk) : ''), [struk])
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState(null)

  function tutup() {
    setBusy('')
    setStatus(null)
    onClose()
  }

  async function unduh() {
    if (!struk) return
    setBusy('unduh')
    setStatus(null)
    try {
      const blob = await strukKePngBlob(struk)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = namaBerkasStruk(struk)
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ ok: true, pesan: 'Struk diunduh.' })
    } catch (err) {
      setStatus({ ok: false, pesan: err.message || 'Gagal mengunduh struk.' })
    } finally {
      setBusy('')
    }
  }

  async function bagikan() {
    if (!struk) return
    setBusy('bagikan')
    setStatus(null)
    try {
      const teks = strukKeTeks(struk)
      const blob = await strukKePngBlob(struk)
      const file = new File([blob], namaBerkasStruk(struk), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Struk ${struk.nama}`, text: teks })
        setStatus({ ok: true, pesan: 'Struk dibagikan.' })
        return
      }
      if (navigator.share) {
        await navigator.share({ title: `Struk ${struk.nama}`, text: teks })
        setStatus({ ok: true, pesan: 'Struk dibagikan.' })
        return
      }
      await navigator.clipboard.writeText(teks)
      setStatus({ ok: true, pesan: 'Bagikan tidak tersedia. Teks struk disalin.' })
    } catch (err) {
      if (err?.name === 'AbortError') return
      setStatus({ ok: false, pesan: err.message || 'Gagal membagikan struk.' })
    } finally {
      setBusy('')
    }
  }

  async function salin() {
    if (!struk) return
    setBusy('salin')
    setStatus(null)
    try {
      await navigator.clipboard.writeText(strukKeTeks(struk))
      setStatus({ ok: true, pesan: 'Teks struk disalin.' })
    } catch {
      setStatus({ ok: false, pesan: 'Gagal menyalin teks struk.' })
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal open={open} onClose={tutup} className="struk-modal">
      <div className="panel struk-sheet">
        <div className="panel-head">
          <h2>Struk penjualan</h2>
          <button type="button" className="btn btn-ghost" onClick={tutup}>
            Tutup
          </button>
        </div>
        <div className="struk-preview">
          {svg ? (
            <div
              className="struk-paper"
              role="img"
              aria-label={struk ? `Struk ${struk.nama}` : 'Struk'}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="empty">Tidak ada data struk.</p>
          )}
        </div>
        {status && (
          <p className={`struk-status ${status.ok ? 'is-ok' : 'is-danger'}`}>{status.pesan}</p>
        )}
        <div className="struk-actions">
          <button className="btn" type="button" onClick={unduh} disabled={Boolean(busy) || !struk}>
            <Icon name="unduh" size={16} />
            {busy === 'unduh' ? 'Mengunduh…' : 'Unduh'}
          </button>
          <button className="btn" type="button" onClick={bagikan} disabled={Boolean(busy) || !struk}>
            <Icon name="bagikan" size={16} />
            {busy === 'bagikan' ? 'Membagikan…' : 'Bagikan'}
          </button>
          <button className="btn" type="button" onClick={salin} disabled={Boolean(busy) || !struk}>
            <Icon name="salin" size={16} />
            {busy === 'salin' ? 'Menyalin…' : 'Salin teks'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
