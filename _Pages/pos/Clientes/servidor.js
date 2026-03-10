"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getClientes(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(
      `${API}/api/pos/clientes/lista/${empresaId}?${params}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { clientes: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch {
    return { clientes: [], total: 0, paginas: 1, pagina: 1 }
  }
}

export async function crearCliente(empresaId, body) {
  try {
    const res = await fetch(`${API}/api/pos/clientes/crear/${empresaId}`, {
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

export async function editarCliente(empresaId, clienteId, body) {
  try {
    const res = await fetch(
      `${API}/api/pos/clientes/editar/${empresaId}/${clienteId}`,
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

export async function eliminarCliente(empresaId, clienteId) {
  try {
    const res = await fetch(
      `${API}/api/pos/clientes/eliminar/${empresaId}/${clienteId}`,
      { method: "DELETE", cache: "no-store" }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}