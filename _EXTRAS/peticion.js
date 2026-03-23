const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("ambrysoft_token")
}

export function removeToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem("ambrysoft_token")
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const isFormData = options.body instanceof FormData

  const headers = {
    ...(!isFormData && options.body !== undefined && options.body !== null
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? options.headers ?? {} : {}),
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    removeToken()
    window.location.href = "/login"
    return
  }

  return res
}