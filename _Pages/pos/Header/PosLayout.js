"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import s from "./PosLayout.module.css"

const PRIMER_SLUG_POR_GRUPO = [
  "mis-ventas",
  "creditos/dashboard",
  "ventas-online/pedidos",
  "dashboard",
]

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

export default function PosLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    const saved       = localStorage.getItem("isiweek_theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark      = saved === "dark" || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")

    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }

    apiFetch(`/api/pos/header/${payload.id}`)
      .then(r => { if (r?.ok) return r.json(); return null })
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!data) return
    if (pathname !== "/pos" && pathname !== "/pos/") return

    const slugs = new Set(data.modulos.map(m => m.slug))

    if (slugs.has("vender")) {
      router.replace("/pos/vender")
      return
    }

    const primero = PRIMER_SLUG_POR_GRUPO.find(sl => slugs.has(sl))
    if (primero) router.replace(`/pos/${primero}`)
  }, [data, pathname, router])

  useEffect(() => { setOpen(false) }, [pathname])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
    localStorage.setItem("isiweek_theme", next ? "dark" : "light")
  }

  const slug = pathname.split("/")[2] ?? ""

  if (!data) return null

  return (
    <div className={s.layout}>
      <Sidebar
        data={data}
        open={open}
        onClose={() => setOpen(false)}
        onToggleDark={toggleDark}
        darkMode={dark}
      />
      <div className={s.main}>
        <Topbar onOpenSidebar={() => setOpen(true)} titulo={slug} />
        <div className={s.content}>{children}</div>
      </div>
    </div>
  )
}