import { lazy, Suspense, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Katalog = lazy(() => import('./pages/Katalog'))
const BarangMasuk = lazy(() => import('./pages/BarangMasuk'))
const BarangTerjual = lazy(() => import('./pages/BarangTerjual'))
const Jurnal = lazy(() => import('./pages/Jurnal'))
const CariSelisih = lazy(() => import('./pages/CariSelisih'))
const Users = lazy(() => import('./pages/Users'))
const Toko = lazy(() => import('./pages/Toko'))

const PAGES = {
  dashboard: Dashboard,
  katalog: Katalog,
  masuk: BarangMasuk,
  terjual: BarangTerjual,
  jurnal: Jurnal,
  selisih: CariSelisih,
  pengguna: Users,
  toko: Toko,
}

function PageFallback() {
  return (
    <div className="boot-screen boot-screen-inline">
      <p>Memuat halaman…</p>
    </div>
  )
}

function Screen() {
  const { page, hak, setPage } = useApp()

  useEffect(() => {
    if (page === 'pengguna' && !hak.lihatPengguna) {
      setPage('dashboard')
    }
  }, [page, hak.lihatPengguna, setPage])

  const id = page === 'pengguna' && !hak.lihatPengguna ? 'dashboard' : page
  const Page = PAGES[id] ?? Dashboard

  return (
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  )
}

function Shell() {
  const { status, error, retry, masukDenganState, toko } = useApp()

  if (status === 'loading') {
    return (
      <div className="boot-screen">
        <p>Memuat data dari server…</p>
      </div>
    )
  }

  if (status === 'login') {
    return <Login onMasuk={masukDenganState} merk={toko.merk} />
  }

  if (status === 'error') {
    return (
      <div className="boot-screen">
        <p>{error}</p>
        <button className="btn btn-primary" type="button" onClick={() => retry()}>
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <Layout>
      <Screen />
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
