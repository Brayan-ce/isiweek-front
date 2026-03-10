"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getVentasCuotas(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/conduces/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

export async function pagarCuota(cuotaId, ventaId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/conduces/pagar-cuota/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventaId, empresaId }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}
