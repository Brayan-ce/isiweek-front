"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerEstadoBD() {
  try {
    const res = await fetch(`${API}/api/superadmin/depuracion/bd`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function obtenerLogs() {
  try {
    const res = await fetch(`${API}/api/superadmin/depuracion/logs`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function limpiarLogs() {
  try {
    const res = await fetch(`${API}/api/superadmin/depuracion/logs`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al limpiar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}