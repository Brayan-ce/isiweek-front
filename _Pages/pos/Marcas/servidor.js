"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getMarcas(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/marcas/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { marcas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { marcas: [], total: 0, paginas: 1 } }
}

export async function crearMarca(empresaId, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarMarca(id, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function eliminarMarca(id) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${id}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}