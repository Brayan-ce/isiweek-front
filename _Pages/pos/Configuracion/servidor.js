"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getEmpresa(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getMonedas() {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/monedas`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function guardarEmpresa(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function subirLogoEmpresa(empresaId, formData) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}/logo`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo subir el logo" } }
}