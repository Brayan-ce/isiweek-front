"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getInventario(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(
      `${API}/api/pos/inventario/lista/${empresaId}?${params}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { productos: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch {
    return { productos: [], total: 0, paginas: 1, pagina: 1 }
  }
}

export async function getCategoriasMarcas(empresaId) {
  try {
    const res = await fetch(
      `${API}/api/pos/inventario/filtros/${empresaId}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { categorias: [], marcas: [] }
    return await res.json()
  } catch {
    return { categorias: [], marcas: [] }
  }
}

export async function ajustarStock(empresaId, productoId, body) {
  try {
    const res = await fetch(
      `${API}/api/pos/inventario/ajustar/${empresaId}/${productoId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: body.cantidad }),
        cache: "no-store",
      }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}