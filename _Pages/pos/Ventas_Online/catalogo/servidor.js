"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getConfigCatalogo(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/config/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function guardarConfigCatalogo(empresaId, body) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/config/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function getProductosCatalogo(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/productos/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function toggleProductoCatalogo(empresaId, productoId, campo, valor) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/productos/${empresaId}/${productoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function subirLogoCatalogo(empresaId, formData) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/logo/${empresaId}`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo subir el logo" } }
}

export async function generarQR(url) {
  try {
    const res = await fetch(`${API}/api/pos/ventas-online/catalogo/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo generar el QR" } }
}

export async function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}