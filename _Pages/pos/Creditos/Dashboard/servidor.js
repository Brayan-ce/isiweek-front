"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDashboardCreditos(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/dashboard/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}