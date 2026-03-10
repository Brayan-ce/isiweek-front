"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"
const EMPRESA_ID = 1

export async function getCompra(compraId) {
  try {
    const res = await fetch(`${API}/api/pos/compras/ver/${EMPRESA_ID}/${compraId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}