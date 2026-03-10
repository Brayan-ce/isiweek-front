"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDashboardAdmin(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/dashboard/admin/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getDashboardVendedor(usuarioId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/dashboard/vendedor/${usuarioId}/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}