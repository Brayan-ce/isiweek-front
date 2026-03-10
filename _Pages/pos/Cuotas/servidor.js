"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDatosCuota(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/datos/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getVentasCuotas(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`${API}/api/pos/cuotas/lista/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

export async function getUsuariosEmpresa(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/usuarios/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function editarEstadoCuota(empresaId, cuotaId, estado) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/editar-cuota/${empresaId}/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function getVentaCuota(empresaId, ventaId) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/imprimir/${empresaId}/${ventaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function pagarCuota(empresaId, cuotaId, body) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/pagar/${empresaId}/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}