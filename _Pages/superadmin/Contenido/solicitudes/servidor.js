"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerSolicitudes({ busqueda = "", estado = "", pagina = 1 } = {}) {
  try {
    const p = new URLSearchParams({ busqueda, estado, pagina, limite: 12 })
    const res = await fetch(`${API}/api/superadmin/solicitudes?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function aprobarSolicitud(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/solicitudes/${id}/aprobar`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al aprobar" }
    return { ok: true, ...json }
  } catch { return { error: "Error de conexion" } }
}

export async function rechazarSolicitud(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/solicitudes/${id}/rechazar`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al rechazar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

export async function ponerPendiente(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/solicitudes/${id}/pendiente`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}