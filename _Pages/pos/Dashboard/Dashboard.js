"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import DashboardAdmin from "./admin/DashboardAdmin"
import DashboardVendedor from "./vendedor/DashboardVendedor"

const API              = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const TIPO_SUPER_ADMIN = 1
const TIPO_ADMIN       = 2
const TIPO_VENDEDOR    = 3

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function obtenerDatosHeader(usuarioId) {
  try {
    const res = await apiFetch(`/api/pos/header/${usuarioId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function DashboardPOS() {
  const [tipo, setTipo]         = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { setCargando(false); return }

    obtenerDatosHeader(payload.id).then(data => {
      setTipo(data?.usuario?.tipo_usuario_id ?? null)
      setCargando(false)
    })
  }, [])

  if (cargando) return null

  if (tipo === TIPO_ADMIN || tipo === TIPO_SUPER_ADMIN) return <DashboardAdmin />
  if (tipo === TIPO_VENDEDOR) return <DashboardVendedor />
  return <DashboardAdmin />
}