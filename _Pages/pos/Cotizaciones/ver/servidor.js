"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getCotizacion(id) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/ver/${id}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getDatosConvertir(empresaId, usuarioId) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/datos/${empresaId}/${usuarioId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
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

export async function convertirAVenta(id, empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/convertir/${id}/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo convertir a venta" } }
}