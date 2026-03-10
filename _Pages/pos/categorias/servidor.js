"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getCategorias(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/categorias/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { categorias: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { categorias: [], total: 0, paginas: 1 } }
}

export async function crearCategoria(empresaId, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/categorias/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarCategoria(id, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function eliminarCategoria(id) {
  try {
    const res = await fetch(`${API}/api/pos/categorias/${id}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}