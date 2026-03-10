"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerDatosDashboard() {
  try {
    const res = await fetch(`${API}/api/superadmin/dashboard/datos`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}