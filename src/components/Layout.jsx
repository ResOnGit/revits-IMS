import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { sisaSesi } from '../lib/format'
import { Icon } from './Icons'
import { BrandMark } from './ui'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  {
    id: 'inventori',
    label: 'Inventori',
    icon: 'box',
    children: [
      { id: 'jurnal', label: 'Jurnal' },
      { id: 'katalog', label: 'Katalog' },
      { id: 'masuk', label: 'Barang Masuk' },
      { id: 'terjual', label: 'Barang Terjual' },
      { id: 'selisih', label: 'Cari Selisih' },
    ],
  },
  { id: 'pengguna', label: 'Pengguna', icon: 'users' },
  { id: 'toko', label: 'Toko', icon: 'toko' },
]

export default function Layout({ children }) {
  const {
    page,
    setPage,
    toko,
    currentUser,
    hak,
    sidebarOpen,
    setSidebarOpen,
    keluar,
    sesiBerakhir,
  } = useApp()

  const [sesi, setSesi] = useState(() => sisaSesi(sesiBerakhir))
  const navRef = useRef(null)
  const linkRefs = useRef({})
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false })

  const halamanAktif = page === 'pengguna' && !hak.lihatPengguna ? 'dashboard' : page

  const syncIndicator = useCallback(() => {
    const nav = navRef.current
    const el = linkRefs.current[halamanAktif]
    if (!nav || !el) {
      setIndicator((prev) => ({ ...prev, ready: false }))
      return
    }
    const navRect = nav.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicator({
      top: elRect.top - navRect.top + nav.scrollTop,
      height: elRect.height,
      ready: true,
    })
  }, [halamanAktif])

  useEffect(() => {
    function tick() {
      setSesi(sisaSesi(sesiBerakhir))
    }
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [sesiBerakhir])

  const inventoriIds = NAV.find((n) => n.id === 'inventori').children.map((c) => c.id)
  const inventoriAktif = inventoriIds.includes(page)

  function isMobile() {
    return window.matchMedia('(max-width: 980px)').matches
  }

  function tutupSidebar() {
    setSidebarOpen(false)
  }

  function toggleSidebar() {
    setSidebarOpen((open) => !open)
  }

  function go(id) {
    setPage(id)
    if (isMobile()) tutupSidebar()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSidebarOpen])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useLayoutEffect(() => {
    syncIndicator()
  }, [syncIndicator, sidebarOpen])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    const ro = new ResizeObserver(() => syncIndicator())
    ro.observe(nav)
    window.addEventListener('resize', syncIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncIndicator)
    }
  }, [syncIndicator])

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={tutupSidebar}
        />
      )}

      <aside id="app-sidebar" className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <BrandMark text={toko.merk} />
          <div className="brand-text">
            <div className="brand-name">{toko.namaPendek}</div>
            <div className="brand-sub">{toko.tagline}</div>
          </div>
        </div>

        <nav className="nav" ref={navRef}>
          <div
            className="nav-indicator"
            aria-hidden
            style={{
              height: indicator.height,
              transform: `translateY(${indicator.top}px)`,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
          {NAV.map((item) => {
            if (item.id === 'pengguna' && !hak.lihatPengguna) return null

            if (item.children) {
              return (
                <div key={item.id} className="nav-group">
                  <div className={`nav-label ${inventoriAktif ? 'is-on' : ''}`}>
                    <Icon name={item.icon} size={16} />
                    {item.label}
                  </div>
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      ref={(el) => {
                        linkRefs.current[child.id] = el
                      }}
                      className={`nav-link nested ${halamanAktif === child.id ? 'active' : ''}`}
                      onClick={() => go(child.id)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  linkRefs.current[item.id] = el
                }}
                className={`nav-link ${halamanAktif === item.id ? 'active' : ''}`}
                onClick={() => go(item.id)}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{currentUser?.nama}</div>
            <div className="muted">{currentUser?.email}</div>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => keluar()}>
            Keluar
          </button>
          <div className="sesi-row">
            <span className="sesi-label">Session</span>
            <span className={`sesi-pill ${sesi.hampirHabis ? 'is-warn' : 'is-ok'}`}>
              {sesi.teks}
            </span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <Icon name={sidebarOpen ? 'close' : 'menu'} />
          </button>
          <div className="topbar-title">{toko.nama}</div>
          <div className="topbar-user">
            <span className="topbar-name">{currentUser.nama}</span>
            <span className="role-pill">{currentUser.peran}</span>
          </div>
        </header>
        <div className="content">
          <div key={page} className="page-enter">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
