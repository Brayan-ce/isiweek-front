"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDatosCaja(usuarioId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/datos/${usuarioId}/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function abrirCaja(usuarioId, empresaId, montoInicial) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, empresaId, montoInicial }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function cerrarCaja(sesionId, usuarioId, montoFinalManual = null, notas = "") {
  try {
    const res = await fetch(`${API}/api/pos/cajas/cerrar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sesionId, usuarioId, montoFinalManual, notas }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function registrarGasto(usuarioId, empresaId, concepto, monto, tipo) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/gasto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, empresaId, concepto, monto, tipo }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function getHistorialCajas(usuarioId, empresaId, pagina = 1, limite = 10) {
  try {
    const params = new URLSearchParams({ pagina, limite })
    const res = await fetch(`${API}/api/pos/cajas/historial/${usuarioId}/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { sesiones: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { sesiones: [], total: 0, paginas: 1 } }
}