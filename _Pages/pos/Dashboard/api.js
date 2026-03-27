import { apiFetch } from "@/_EXTRAS/peticion"

export async function getDashboardAdmin(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/dashboard/admin/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getDashboardVendedor(usuarioId, empresaId) {
  try {
    const res = await apiFetch(`/api/pos/dashboard/vendedor/${usuarioId}/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}