"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerPerfil(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function actualizarPerfil(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar perfil" }
    return { ok: true, perfil: json }
  } catch { return { error: "Error de conexion" } }
}

export async function cambiarPassword(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al cambiar contraseña" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}