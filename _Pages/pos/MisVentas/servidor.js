"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getMisVentas({ empresaId, usuarioId, tipoUsuarioId, fechaDesde, fechaHasta, estado, pagina = 1, limite = 20 }) {
  try {
    const params = new URLSearchParams()
    if (fechaDesde)  params.set("fechaDesde", fechaDesde)
    if (fechaHasta)  params.set("fechaHasta", fechaHasta)
    if (estado)      params.set("estado", estado)
    params.set("pagina", pagina)
    params.set("limite", limite)

    const res = await fetch(
      `${API}/api/pos/mis-ventas/${empresaId}/${usuarioId}/${tipoUsuarioId}?${params}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

export async function cancelarVenta(ventaId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/mis-ventas/cancelar/${ventaId}/${empresaId}`, {
      method: "PATCH",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}