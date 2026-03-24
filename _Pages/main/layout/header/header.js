"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import s from "./header.module.css"
import LangSelector from "../extras/lenguaje/LangSelector"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export default function LoginHeader() {
  const [dark, setDark]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [config, setConfig]     = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname                = usePathname()

  const enRegistrar = pathname === "/registrar"
  const enPlanes    = pathname === "/planes"

  useEffect(() => {
    const saved       = localStorage.getItem("isiweek_theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark      = saved === "dark" || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")

    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll)

    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem("isiweek_theme", next ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
  }

  const nombre   = config.sistema_nombre ?? "Ambrysoft"
  const logoPath = config.sistema_logo   ?? null
  const logoUrl  = logoPath ? `${API}${logoPath}` : null

  const navSecundario = enPlanes || enRegistrar
    ? { href: "/",       icon: "home-outline",       label: "Inicio" }
    : { href: "/planes", icon: "pricetags-outline",  label: "Planes" }

  const navCTA = enRegistrar
    ? { href: "/login",     icon: "log-in-outline",     label: "Iniciar sesión" }
    : { href: "/registrar", icon: "person-add-outline", label: "Crear cuenta"   }

  return (
    <>
      <header className={`${s.header} ${scrolled ? s.scrolled : ""}`}>
        <div className={s.inner}>

          <Link href="/" className={s.brand}>
            {logoUrl
              ? <img src={logoUrl} alt={nombre} className={s.logoImg} />
              : <div className={s.logoIcon}>{nombre.charAt(0)}</div>
            }
            <span className={s.logoText}>{nombre}</span>
          </Link>

          <nav className={s.nav}>
            <Link href={navSecundario.href} className={s.navLink}>
              <ion-icon name={navSecundario.icon} />
              {navSecundario.label}
            </Link>
            <Link href={navCTA.href} className={s.navLinkBtn}>
              <ion-icon name={navCTA.icon} />
              {navCTA.label}
            </Link>
          </nav>

          <div className={s.actions}>
            <LangSelector />
            <button className={s.themeBtn} onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>
              <ion-icon name={dark ? "sunny-outline" : "moon-outline"} />
            </button>
            <button
              className={`${s.menuBtn} ${drawerOpen ? s.menuBtnOpen : ""}`}
              onClick={() => setDrawerOpen(p => !p)}
              title="Menú"
            >
              <ion-icon name={drawerOpen ? "close-outline" : "menu-outline"} />
            </button>
          </div>

        </div>
      </header>

      {drawerOpen && (
        <div className={s.overlay} onClick={() => setDrawerOpen(false)} />
      )}

      <aside className={`${s.drawer} ${drawerOpen ? s.drawerOpen : ""}`}>
        <div className={s.drawerHeader}>
          <div className={s.drawerBrand}>
            {logoUrl
              ? <img src={logoUrl} alt={nombre} className={s.drawerLogoImg} />
              : <div className={s.drawerLogoIcon}>{nombre.charAt(0)}</div>
            }
            <span className={s.drawerNombre}>{nombre}</span>
          </div>
          <button className={s.drawerClose} onClick={() => setDrawerOpen(false)}>
            <ion-icon name="close-outline" />
          </button>
        </div>

        <nav className={s.drawerNav}>
          <Link href={navSecundario.href} className={s.drawerLink} onClick={() => setDrawerOpen(false)}>
            <div className={s.drawerLinkIcon}>
              <ion-icon name={navSecundario.icon} />
            </div>
            {navSecundario.label}
          </Link>

          <Link href={navCTA.href} className={s.drawerLinkBtn} onClick={() => setDrawerOpen(false)}>
            <div className={s.drawerLinkIcon}>
              <ion-icon name={navCTA.icon} />
            </div>
            {navCTA.label}
          </Link>
        </nav>

        <div className={s.drawerFooter}>
          <div className={s.drawerFooterRow}>
            <LangSelector />
            <button className={s.themeBtn} onClick={toggleDark}>
              <ion-icon name={dark ? "sunny-outline" : "moon-outline"} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}