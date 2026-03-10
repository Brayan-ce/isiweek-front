"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getDatosCuota(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/datos/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getProductos(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/vender/productos/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { productos: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { productos: [], total: 0, paginas: 1 } }
}

export async function getProductoPorCodigo(empresaId, codigo) {
  try {
    const res = await fetch(`${API}/api/pos/vender/codigo/${empresaId}/${encodeURIComponent(codigo)}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function crearClienteRapido(empresaId, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/vender/cliente-rapido/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function crearVentaCuotas(empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/cuotas/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}