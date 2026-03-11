"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getPlanes(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function crearPlan(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarPlan(id, data) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function eliminarPlan(id) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function toggleActivoPlan(id, activo) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}