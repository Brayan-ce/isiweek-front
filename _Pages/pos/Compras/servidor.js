"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDatosCompra(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/compras/datos/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getCompras(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await fetch(`${API}/api/pos/compras/lista/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { compras: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { compras: [], total: 0, paginas: 1 } }
}

export async function getCompra(empresaId, compraId) {
  try {
    const res = await fetch(`${API}/api/pos/compras/ver/${empresaId}/${compraId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function crearCompra(empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/compras/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarCompra(empresaId, compraId, body) {
  try {
    const res = await fetch(`${API}/api/pos/compras/editar/${empresaId}/${compraId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function eliminarCompra(empresaId, compraId) {
  try {
    const res = await fetch(`${API}/api/pos/compras/eliminar/${empresaId}/${compraId}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}