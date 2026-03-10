"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getGastos(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(
      `${API}/api/pos/gastos/lista/${empresaId}?${params}`,
      { cache: "no-store" }
    )
    if (!res.ok) return { gastos: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch {
    return { gastos: [], total: 0, paginas: 1, pagina: 1 }
  }
}

export async function getTiposGasto(empresaId) {
  try {
    const res = await fetch(
      `${API}/api/pos/gastos/tipos/${empresaId}`,
      { cache: "no-store" }
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function getResumenGastos(empresaId) {
  try {
    const res = await fetch(
      `${API}/api/pos/gastos/resumen/${empresaId}`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function crearGasto(empresaId, usuarioId, body) {
  try {
    const res = await fetch(
      `${API}/api/pos/gastos/crear/${empresaId}/${usuarioId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function editarGasto(empresaId, gastoId, body) {
  try {
    const res = await fetch(
      `${API}/api/pos/gastos/editar/${empresaId}/${gastoId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function eliminarGasto(empresaId, gastoId) {
  try {
    const res = await fetch(
      `${API}/api/pos/gastos/eliminar/${empresaId}/${gastoId}`,
      { method: "DELETE", cache: "no-store" }
    )
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}