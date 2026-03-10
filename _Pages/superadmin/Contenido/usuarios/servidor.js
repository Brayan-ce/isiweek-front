"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerUsuarios({ busqueda = "", estado = "", tipo = "", empresaId = "", pagina = 1 } = {}) {
  try {
    const p = new URLSearchParams({ busqueda, estado, tipo, empresaId, pagina, limite: 12 })
    const res = await fetch(`${API}/api/superadmin/usuarios?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function obtenerUsuario(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/${id}`, { cache: "no-store" })
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

export async function obtenerTiposUsuario() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/tipos`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function obtenerModosSistema() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/modos`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function obtenerEmpresasActivas() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/empresas`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function crearUsuario(data) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al crear usuario" }
    return { ok: true, usuario: json }
  } catch { return { error: "Error de conexion" } }
}

export async function actualizarUsuario(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar usuario" }
    return { ok: true, usuario: json }
  } catch { return { error: "Error de conexion" } }
}

export async function eliminarUsuario(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/${id}`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al eliminar usuario" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}