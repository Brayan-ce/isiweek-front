"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDatos(empresaId, usuarioId) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/datos/${empresaId}/${usuarioId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function crearCotizacion(empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}