"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getReporteVentas(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await fetch(`${API}/api/pos/reportes/ventas/${empresaId}?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getReporteProductos(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await fetch(`${API}/api/pos/reportes/productos/${empresaId}?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getReporteClientes(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await fetch(`${API}/api/pos/reportes/clientes/${empresaId}?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getReporteGastos(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await fetch(`${API}/api/pos/reportes/gastos/${empresaId}?${p}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}