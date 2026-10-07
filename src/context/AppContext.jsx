import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { HAK_AKSES, SCENE_FADE_MS } from '../lib/constants'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function afterPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

const AppContext = createContext(null)

function applyState(data, setters) {
  setters.setItems(data.items)
  setters.setJurnal(data.jurnal)
  setters.setPengguna(data.pengguna)
  setters.setToko(data.toko)
  setters.setHitungFisik(data.hitungFisik ?? {})
  setters.setCurrentUser(data.saya)
  if (data.sesiBerakhir != null) setters.setSesiBerakhir(data.sesiBerakhir)
}

async function readJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok && data.ok === undefined) {
    return { ok: false, pesan: data.pesan || `Server error (${res.status})` }
  }
  return data
}

export function AppProvider({ children }) {
  const [page, setPage] = useState('dashboard')
  const [items, setItems] = useState([])
  const [jurnal, setJurnal] = useState([])
  const [pengguna, setPengguna] = useState([])
  const [toko, setToko] = useState({
    nama: '',
    namaPendek: '',
    merk: '',
    tagline: '',
    alamat: '',
    telepon: '',
    catatan: '',
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [sesiBerakhir, setSesiBerakhir] = useState(null)
  const [hitungFisik, setHitungFisik] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(max-width: 980px)').matches,
  )
  const [layar, setLayar] = useState(1)
  const sedangFade = useRef(false)

  const setters = useMemo(
    () => ({
      setItems,
      setJurnal,
      setPengguna,
      setToko,
      setHitungFisik,
      setCurrentUser,
      setSesiBerakhir,
    }),
    [],
  )

  const gantiLayar = useCallback(async (ganti) => {
    if (sedangFade.current) return
    sedangFade.current = true
    setLayar(0)
    await sleep(SCENE_FADE_MS)
    ganti()
    await afterPaint()
    setLayar(1)
    await sleep(SCENE_FADE_MS)
    sedangFade.current = false
  }, [])

  const masukDenganState = useCallback(
    (data) =>
      gantiLayar(() => {
        applyState(data, setters)
        setPage('dashboard')
        setStatus('ready')
        setError('')
      }),
    [gantiLayar, setters],
  )

  const loadState = useCallback(async () => {
    const res = await fetch('/api/state')
    if (res.status === 401) {
      const brand = await fetch('/api/brand')
        .then((r) => r.json())
        .catch(() => null)
      if (brand && typeof brand.merk === 'string') {
        setToko((prev) => ({
          ...prev,
          merk: brand.merk,
          namaPendek: brand.namaPendek || prev.namaPendek,
        }))
      }
      setStatus('login')
      setCurrentUser(null)
      setSesiBerakhir(null)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    applyState(data, setters)
    setStatus('ready')
  }, [setters])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setStatus('loading')
      setError('')
      try {
        await loadState()
      } catch {
        if (!cancelled) {
          setStatus('error')
          setError('Tidak bisa terhubung ke server. Jalankan npm run dev (API + web).')
        }
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [loadState])

  const hak = useMemo(
    () => HAK_AKSES[currentUser?.peran] ?? HAK_AKSES.Operator,
    [currentUser?.peran],
  )

  const api = useCallback(
    async (url, opts) => {
      const res = await fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...opts?.headers },
      })
      if (res.status === 401) {
        setStatus('login')
        setCurrentUser(null)
        setSesiBerakhir(null)
        return { ok: false, pesan: 'Sesi berakhir. Silakan masuk lagi.' }
      }
      const data = await readJson(res)
      if (data.ok && data.items) applyState(data, setters)
      return data
    },
    [setters],
  )

  const catatMasuk = useCallback(
    (payload) => api('/api/masuk', { method: 'POST', body: JSON.stringify(payload) }),
    [api],
  )

  const catatTerjual = useCallback(
    (payload) => api('/api/terjual', { method: 'POST', body: JSON.stringify(payload) }),
    [api],
  )

  const catatPenyesuaian = useCallback(
    (perubahan, catatan) =>
      api('/api/penyesuaian', {
        method: 'POST',
        body: JSON.stringify({ perubahan, catatan }),
      }),
    [api],
  )

  const simpanToko = useCallback(
    (form) => api('/api/toko', { method: 'PUT', body: JSON.stringify(form) }),
    [api],
  )

  const simpanPengguna = useCallback(
    (form, id) => {
      if (id) return api(`/api/pengguna/${id}`, { method: 'PUT', body: JSON.stringify(form) })
      return api('/api/pengguna', { method: 'POST', body: JSON.stringify(form) })
    },
    [api],
  )

  const simpanItem = useCallback(
    (form, id) => {
      if (id) return api(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(form) })
      return api('/api/items', { method: 'POST', body: JSON.stringify(form) })
    },
    [api],
  )

  const keluar = useCallback(async () => {
    const logout = fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    await gantiLayar(() => {
      setCurrentUser(null)
      setSesiBerakhir(null)
      setItems([])
      setJurnal([])
      setPengguna([])
      setHitungFisik({})
      setPage('dashboard')
      setStatus('login')
    })
    await logout
  }, [gantiLayar])

  const retry = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      await loadState()
    } catch {
      setStatus('error')
      setError('Tidak bisa terhubung ke server. Jalankan npm run dev (API + web).')
    }
  }, [loadState])

  const value = useMemo(
    () => ({
      page,
      setPage,
      items,
      jurnal,
      pengguna,
      toko,
      simpanToko,
      simpanPengguna,
      simpanItem,
      currentUser,
      sesiBerakhir,
      hak,
      hitungFisik,
      setHitungFisik,
      sidebarOpen,
      setSidebarOpen,
      catatMasuk,
      catatTerjual,
      catatPenyesuaian,
      status,
      error,
      masukDenganState,
      keluar,
      retry,
    }),
    [
      page,
      items,
      jurnal,
      pengguna,
      toko,
      simpanToko,
      simpanPengguna,
      simpanItem,
      currentUser,
      sesiBerakhir,
      hak,
      hitungFisik,
      sidebarOpen,
      catatMasuk,
      catatTerjual,
      catatPenyesuaian,
      status,
      error,
      masukDenganState,
      keluar,
      retry,
    ],
  )

  return (
    <AppContext.Provider value={value}>
      <div
        className="scene"
        style={{
          opacity: layar,
          transition: `opacity ${SCENE_FADE_MS}ms ease`,
          pointerEvents: layar === 0 ? 'none' : undefined,
        }}
      >
        {children}
      </div>
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider')
  return ctx
}
