"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import s from "./header.module.css"
import LangSelector from "./extras/lenguaje/LangSelector"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export default function LoginHeader() {
  const [dark, setDark]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [config, setConfig]     = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => { setMenuOpen(false) }, [pathname])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem("isiweek_theme", next ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
  }

  const nombre   = config.sistema_nombre ?? "IsiWeek"
  const logoPath = config.sistema_logo   ?? null
  const logoUrl  = logoPath ? `${API}${logoPath}` : null

  const navSecundario = enPlanes || enRegistrar ? (
    <Link href="/" className={s.navLink}>
      <ion-icon name="home-outline" />
      Inicio
    </Link>
  ) : (
    <Link href="/planes" className={s.navLink}>
      <ion-icon name="pricetags-outline" />
      Planes
    </Link>
  )

  const navCTA = enRegistrar ? (
    <Link href="/login" className={s.navLinkBtn}>
      <ion-icon name="log-in-outline" />
      Iniciar sesión
    </Link>
  ) : (
    <Link href="/registrar" className={s.navLinkBtn}>
      <ion-icon name="person-add-outline" />
      Crear cuenta
    </Link>
  )

  const mobileSecundario = enPlanes || enRegistrar ? (
    <Link href="/" className={s.mobileLink} onClick={() => setMenuOpen(false)}>
      <ion-icon name="home-outline" />
      Inicio
    </Link>
  ) : (
    <Link href="/planes" className={s.mobileLink} onClick={() => setMenuOpen(false)}>
      <ion-icon name="pricetags-outline" />
      Planes
    </Link>
  )

  const mobileCTA = enRegistrar ? (
    <Link href="/login" className={s.mobileLinkBtn} onClick={() => setMenuOpen(false)}>
      <ion-icon name="log-in-outline" />
      Iniciar sesión
    </Link>
  ) : (
    <Link href="/registrar" className={s.mobileLinkBtn} onClick={() => setMenuOpen(false)}>
      <ion-icon name="person-add-outline" />
      Crear cuenta
    </Link>
  )

  return (
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
          {navSecundario}
          {navCTA}
        </nav>

        <div className={s.actions}>
          <LangSelector />
          <button className={s.themeBtn} onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>
            <ion-icon name={dark ? "sunny-outline" : "moon-outline"} />
          </button>
          <button
            className={`${s.menuBtn} ${menuOpen ? s.menuBtnOpen : ""}`}
            onClick={() => setMenuOpen(p => !p)}
            title="Menú"
          >
            <ion-icon name={menuOpen ? "close-outline" : "menu-outline"} />
          </button>
        </div>

      </div>

      {menuOpen && (
        <div className={s.mobileMenu}>
          {mobileSecundario}
          {mobileCTA}
        </div>
      )}
    </header>
  )
}