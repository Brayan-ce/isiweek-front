"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getProveedores(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(
      `${API}/api/pos/proveedores/lista/${empresaId}?${params}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { proveedores: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch {
    return { proveedores: [], total: 0, paginas: 1, pagina: 1 }
  }
}

export async function crearProveedor(empresaId, body) {
  try {
    const res = await fetch(`${API}/api/pos/proveedores/crear/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function editarProveedor(empresaId, proveedorId, body) {
  try {
    const res = await fetch(
      `${API}/api/pos/proveedores/editar/${empresaId}/${proveedorId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function eliminarProveedor(empresaId, proveedorId) {
  try {
    const res = await fetch(
      `${API}/api/pos/proveedores/eliminar/${empresaId}/${proveedorId}`,
      { method: "DELETE", cache: "no-store" }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}