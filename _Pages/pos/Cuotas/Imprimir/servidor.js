"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"
const EMPRESA_ID = 1

export async function getVentaCuota(ventaId) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/imprimir/${EMPRESA_ID}/${ventaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}