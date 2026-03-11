"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getPedidos(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(`${API}/api/pos/ventas-online/pedidos/lista/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { pedidos: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { pedidos: [], total: 0, paginas: 1 } }
}

export async function getPedido(empresaId, pedidoId) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/pedidos/${empresaId}/${pedidoId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function cambiarEstadoPedido(empresaId, pedidoId, estado) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/pedidos/${empresaId}/${pedidoId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function getResumenPedidos(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/pedidos/resumen/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}