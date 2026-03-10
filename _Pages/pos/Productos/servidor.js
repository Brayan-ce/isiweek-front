"use server"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function getEmpresa(empresaId) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function getProductos(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/productos/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { productos: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { productos: [], total: 0, paginas: 1 } }
}

export async function getDatosFormulario(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/productos/formulario/${empresaId}`, { cache: "no-store" })
    if (!res.ok) return { categorias: [], marcas: [] }
    return await res.json()
  } catch { return { categorias: [], marcas: [] } }
}

export async function crearProducto(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/productos/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function editarProducto(id, data) {
  try {
    const res = await fetch(`${API}/api/pos/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export async function generarBarcode(id) {
  try {
    const res = await fetch(`${API}/api/pos/productos/${id}/barcode`, {
      method: "POST",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo generar el código de barras" } }
}

export async function subirImagenProducto(id, formData) {
  try {
    const res = await fetch(`${API}/api/pos/productos/${id}/imagen`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo subir la imagen" } }
}

export async function getSiguienteCodigo(empresaId, nombre = "") {
  try {
    const params = new URLSearchParams({ nombre })
    const res = await fetch(`${API}/api/pos/productos/siguiente-codigo/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { codigo: null }
    return await res.json()
  } catch { return { codigo: null } }
}

export async function verificarCodigo(empresaId, codigo, excluirId = null) {
  try {
    const params = new URLSearchParams({ codigo, ...(excluirId ? { excluirId } : {}) })
    const res = await fetch(`${API}/api/pos/productos/verificar-codigo/${empresaId}?${params}`, { cache: "no-store" })
    if (!res.ok) return { disponible: true }
    return await res.json()
  } catch { return { disponible: true } }
}

export async function eliminarProducto(id) {
  try {
    const res = await fetch(`${API}/api/pos/productos/${id}`, {
      method: "DELETE",
      cache: "no-store",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}