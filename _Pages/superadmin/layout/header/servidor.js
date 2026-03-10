"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { jwtVerify } from "jose"

const API    = (process.env.BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "")
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

function urlCompleta(ruta) {
  if (!ruta) return ""
  if (ruta.startsWith("http")) return ruta
  return `${API}${ruta.startsWith("/") ? "" : "/"}${ruta}`
}

export async function obtenerSesion() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("isiweek_token")?.value
    if (!token) redirect("/login")

    const { payload } = await jwtVerify(token, SECRET)
    if (payload.tipo !== "Super Admin") redirect("/login")
    return payload
  } catch {
    redirect("/login")
  }
}

export async function obtenerDatosHeader() {
  try {
    const res = await fetch(`${API}/api/superadmin/header/datos`, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.config?.sistema_logo) {
      data.config.sistema_logo = urlCompleta(data.config.sistema_logo)
    }
    return data
  } catch {
    return null
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies()
  cookieStore.delete("isiweek_token")
  redirect("/login")
}