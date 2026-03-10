"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerEmpresas({ busqueda = "", estado = "", pagina = 1 } = {}) {
  try {
    const params = new URLSearchParams({ busqueda, estado, pagina, limite: 12 })
    const res = await fetch(`${API}/api/superadmin/empresas?${params}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function obtenerEmpresa(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function obtenerMonedas() {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/monedas`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function obtenerModulos() {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/modulos`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function crearEmpresa(data) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al crear empresa" }
    return { ok: true, empresa: json }
  } catch { return { error: "Error de conexion" } }
}

export async function actualizarEmpresa(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar empresa" }
    return { ok: true, empresa: json }
  } catch { return { error: "Error de conexion" } }
}

export async function eliminarEmpresa(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al eliminar empresa" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}