"use server"

const API = (process.env.BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "")

function urlCompleta(ruta) {
  if (!ruta) return ""
  if (ruta.startsWith("http")) return ruta
  return `${API}${ruta.startsWith("/") ? "" : "/"}${ruta}`
}

export async function obtenerConfiguracion() {
  try {
    const res = await fetch(`${API}/api/superadmin/configuracion`, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.sistema_logo) data.sistema_logo = urlCompleta(data.sistema_logo)
    return data
  } catch { return null }
}

export async function guardarConfiguracion(data) {
  try {
    const payload = { ...data }
    if (payload.sistema_logo?.startsWith("http")) {
      try { payload.sistema_logo = new URL(payload.sistema_logo).pathname } catch { }
    }
    const res = await fetch(`${API}/api/superadmin/configuracion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al guardar" }
    return { ok: true, config: json }
  } catch { return { error: "Error de conexion" } }
}

export async function subirLogo(formData) {
  try {
    const res = await fetch(`${API}/api/superadmin/configuracion/logo`, {
      method: "POST",
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al subir logo" }
    return { ok: true, url: urlCompleta(json.url) }
  } catch { return { error: "Error de conexion" } }
}