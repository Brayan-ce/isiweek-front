"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function obtenerDatosHeader(usuarioId) {
  try {
    const res = await fetch(`${API}/api/pos/header/${usuarioId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}