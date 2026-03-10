"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { obtenerDatosHeader, cerrarSesion } from "./servidor"
import s from "./header.module.css"

const NAV = [
  { label: "Dashboard",     href: "/superadmin/dashboard",     icon: "grid-outline" },
  { label: "Empresas",      href: "/superadmin/empresas",      icon: "business-outline" },
  { label: "Usuarios",      href: "/superadmin/usuarios",      icon: "people-outline" },
  { label: "Solicitudes",   href: "/superadmin/solicitudes",   icon: "mail-outline", badge: true },
  { label: "Configuracion", href: "/superadmin/configuracion", icon: "settings-outline" },
  { label: "Depuracion",    href: "/superadmin/depuracion",    icon: "bug-outline" },
]

const CACHE_KEY = "isiweek_header_datos"

export default function HeaderSuperAdmin({ sesion }) {
  const pathname = usePathname()
  const [dark, setDark]       = useState(false)
  const [open, setOpen]       = useState(false)
  const [sidebar, setSidebar] = useState(false)
  const [datos, setDatos]     = useState(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const dropRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem("isiweek_theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = saved === "dark" || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
  }, [])

  useEffect(() => {
    obtenerDatosHeader().then(d => {
      if (!d) return
      setDatos(d)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)) } catch {}
    })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = sidebar ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [sidebar])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem("isiweek_theme", next ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
  }

  const iniciales  = sesion?.nombre?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() ?? "SA"
  const logo       = datos?.config?.sistema_logo   ?? null
  const nombre     = datos?.config?.sistema_nombre ?? "IsiWeek"
  const pendientes = datos?.stats?.solicitudesPendientes ?? 0

  return (
    <>
      <header className={s.header}>
        <div className={s.left}>
          <button className={s.hamburger} onClick={() => setSidebar(true)} aria-label="Abrir menu">
            <ion-icon name="menu-outline" />
          </button>
          <Link href="/superadmin/dashboard" className={s.logoWrap}>
            {logo && <img src={logo} alt={nombre} className={s.logoImg} onError={e => { e.target.style.display = "none" }} />}
            <span className={s.logoName}>{nombre}</span>
          </Link>
        </div>

        <div className={s.center}>
          <nav className={s.nav}>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.navItem}${pathname.startsWith(item.href) ? " " + s.navItemActive : ""}`}
              >
                <ion-icon name={item.icon} />
                {item.label}
                {item.badge && pendientes > 0 && (
                  <span className={s.navBadge}>{pendientes > 9 ? "9+" : pendientes}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className={s.right}>
          <button className={s.iconBtn} onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>
            <ion-icon name={dark ? "sunny-outline" : "moon-outline"} />
          </button>

          <div style={{ position: "relative" }} ref={dropRef}>
            <button className={s.userBtn} onClick={() => setOpen(p => !p)}>
              <div className={s.avatar}>{iniciales}</div>
              <div className={s.userInfo}>
                <span className={s.userName}>{sesion?.nombre?.split(" ")[0] ?? "Admin"}</span>
                <span className={s.userRole}>Super Admin</span>
              </div>
              <ion-icon name="chevron-down-outline" class={`${s.chevron}${open ? " " + s.chevronOpen : ""}`} />
            </button>

            {open && (
              <div className={s.dropdown}>
                <div className={s.dropHeader}>
                  <div className={s.dropName}>{sesion?.nombre ?? "Super Admin"}</div>
                  <div className={s.dropEmail}>{sesion?.email ?? ""}</div>
                </div>
                <div className={s.dropItems}>
                  <Link href="/superadmin/perfil" style={{ textDecoration: "none" }} onClick={() => setOpen(false)}>
                    <button className={s.dropItem}>
                      <span className={s.dropItemIcon}><ion-icon name="person-outline" /></span>
                      Mi perfil
                    </button>
                  </Link>
                  <Link href="/superadmin/configuracion" style={{ textDecoration: "none" }} onClick={() => setOpen(false)}>
                    <button className={s.dropItem}>
                      <span className={s.dropItemIcon}><ion-icon name="settings-outline" /></span>
                      Configuracion
                    </button>
                  </Link>
                  <div className={s.dropDivider} />
                  <form action={cerrarSesion}>
                    <button type="submit" className={`${s.dropItem} ${s.dropItemDanger}`}>
                      <span className={s.dropItemIcon}><ion-icon name="log-out-outline" /></span>
                      Cerrar sesion
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {sidebar && (
        <div className={s.overlay} onClick={() => setSidebar(false)}>
          <aside className={s.sidebar} onClick={e => e.stopPropagation()}>
            <div className={s.sidebarHead}>
              <div className={s.sidebarLogo}>
                {logo && <img src={logo} alt={nombre} className={s.logoImg} onError={e => { e.target.style.display = "none" }} />}
                <span className={s.logoName}>{nombre}</span>
              </div>
              <button className={s.closeBtn} onClick={() => setSidebar(false)}>
                <ion-icon name="close-outline" />
              </button>
            </div>

            <div className={s.sidebarUser}>
              <div className={s.avatar}>{iniciales}</div>
              <div>
                <div className={s.userName}>{sesion?.nombre ?? "Super Admin"}</div>
                <div className={s.userRole}>Super Admin</div>
              </div>
            </div>

            <nav className={s.sidebarNav}>
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${s.sidebarItem}${pathname.startsWith(item.href) ? " " + s.sidebarItemActive : ""}`}
                  onClick={() => setSidebar(false)}
                >
                  <ion-icon name={item.icon} />
                  {item.label}
                  {item.badge && pendientes > 0 && (
                    <span className={s.navBadge} style={{ marginLeft: "auto" }}>{pendientes > 9 ? "9+" : pendientes}</span>
                  )}
                </Link>
              ))}
            </nav>

            <div className={s.sidebarFooter}>
              <button className={s.darkToggleFull} onClick={toggleDark}>
                <ion-icon name={dark ? "sunny-outline" : "moon-outline"} />
                {dark ? "Modo claro" : "Modo oscuro"}
              </button>
              <form action={cerrarSesion} style={{ width: "100%" }}>
                <button type="submit" className={s.logoutFull}>
                  <ion-icon name="log-out-outline" />
                  Cerrar sesion
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}