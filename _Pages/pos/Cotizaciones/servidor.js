"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getCotizaciones(empresaId, params = {}) {
  try {
    const q = new URLSearchParams(params)
    const res = await fetch(`${API}/api/pos/cotizaciones/${empresaId}?${q}`, { cache: "no-store" })
    if (!res.ok) return { cotizaciones: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { cotizaciones: [], total: 0, paginas: 1 } }
}

export async function cambiarEstado(id, empresaId, estado) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/estado/${id}/${empresaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo cambiar el estado" } }
}

export async function eliminarCotizacion(id, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/eliminar/${id}/${empresaId}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo eliminar" } }
}