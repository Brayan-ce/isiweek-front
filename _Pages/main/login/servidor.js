"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API = process.env.BACKEND_URL ?? "http://localhost:3001"

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  return res.json()
}

async function get(path) {
  const res = await fetch(`${API}${path}`, { cache: "no-store" })
  return res.json()
}

function guardarToken(cookieStore, token) {
  cookieStore.set("isiweek_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
}

export async function obtenerConfigSistema() {
  try {
    return await get("/api/auth/config")
  } catch {
    return {}
  }
}

export async function loginConEmail(formData) {
  const email    = formData.get("email")?.toString().trim().toLowerCase()
  const password = formData.get("password")?.toString()

  if (!email || !password) return { error: "Completa todos los campos" }

  try {
    const res = await post("/api/auth/login", { email, password })
    if (res.error) return { error: res.error }

    const cookieStore = await cookies()
    guardarToken(cookieStore, res.token)

    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function loginConGoogle(idToken) {
  if (!idToken) return { error: "Token de Google invalido" }

  try {
    const res = await post("/api/auth/google", { idToken })
    if (res.error) return { error: res.error }

    const cookieStore = await cookies()
    guardarToken(cookieStore, res.token)

    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function enviarCodigoOTP(formData) {
  const email = formData.get("email")?.toString().trim().toLowerCase()
  if (!email) return { error: "Ingresa tu correo" }

  try {
    const res = await post("/api/auth/otp/enviar", { email })
    if (res.error) return { error: res.error }
    return { ok: true }
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function verificarCodigoOTP(formData) {
  const email  = formData.get("email")?.toString().trim().toLowerCase()
  const codigo = formData.get("codigo")?.toString().trim()

  if (!email || !codigo) return { error: "Completa todos los campos" }

  try {
    const res = await post("/api/auth/otp/verificar", { email, codigo })
    if (res.error) return { error: res.error }

    const cookieStore = await cookies()
    guardarToken(cookieStore, res.token)

    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies()
  cookieStore.delete("isiweek_token")
  redirect("/login")
}