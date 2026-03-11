"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getUsuarios(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function crearUsuario(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarUsuario(id, data) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function toggleUsuario(id, estado) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function resetPassword(id, nuevaPassword) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: nuevaPassword }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}