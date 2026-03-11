"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getConfigCatalogoPublico(slug) {
  try {
    const res = await fetch(`${API}/api/catalogo/${slug}/config`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getProductosCatalogoPublico(slug) {
  try {
    const res = await fetch(`${API}/api/catalogo/${slug}/productos`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function crearPedidoCatalogoPublico(body) {
  try {
    const res = await fetch(`${API}/api/catalogo/pedido`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}