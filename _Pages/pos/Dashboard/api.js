const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export async function getDashboardAdmin(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/dashboard/admin/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getDashboardVendedor(usuarioId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/dashboard/vendedor/${usuarioId}/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}