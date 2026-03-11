"use client"

import { useState, useEffect } from "react"
import s from "./perfil.module.css"

const API           = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SUPERADMIN_ID = 1

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
}

async function obtenerPerfil(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function actualizarPerfil(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar perfil" }
    return { ok: true, perfil: json }
  } catch { return { error: "Error de conexion" } }
}

async function cambiarPassword(id, data) {
  try {
    const res = await fetch(`${API}/api/superadmin/perfil/${id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al cambiar contrasena" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

export default function PerfilPage() {
  const [perfil, setPerfil]         = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [cambiando, setCambiando]   = useState(false)
  const [exitoInfo, setExitoInfo]   = useState(false)
  const [exitoPass, setExitoPass]   = useState(false)
  const [errorInfo, setErrorInfo]   = useState("")
  const [errorPass, setErrorPass]   = useState("")
  const [verActual, setVerActual]   = useState(false)
  const [verNueva, setVerNueva]     = useState(false)
  const [verConfirm, setVerConfirm] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: "", email: "", cedula: "",
  })

  const [passForm, setPassForm] = useState({
    password_actual: "", password_nuevo: "", password_confirm: "",
  })

  useEffect(() => {
    obtenerPerfil(SUPERADMIN_ID).then(data => {
      if (data) {
        setPerfil(data)
        setForm({
          nombre_completo: data.nombre_completo ?? "",
          email:           data.email           ?? "",
          cedula:          data.cedula           ?? "",
        })
      }
      setCargando(false)
    })
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handlePassChange(e) {
    const { name, value } = e.target
    setPassForm(f => ({ ...f, [name]: value }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setErrorInfo("")
    setExitoInfo(false)
    if (!form.nombre_completo.trim()) { setErrorInfo("El nombre es obligatorio"); return }
    if (!form.email.trim())           { setErrorInfo("El email es obligatorio"); return }
    setGuardando(true)
    const res = await actualizarPerfil(SUPERADMIN_ID, form)
    setGuardando(false)
    if (res.error) { setErrorInfo(res.error); return }
    setPerfil(p => ({ ...p, ...res.perfil }))
    setExitoInfo(true)
    setTimeout(() => setExitoInfo(false), 3000)
  }

  async function handlePassword(e) {
    e.preventDefault()
    setErrorPass("")
    setExitoPass(false)
    if (!passForm.password_actual.trim()) { setErrorPass("Ingresa tu contrasena actual"); return }
    if (!passForm.password_nuevo.trim())  { setErrorPass("Ingresa la nueva contrasena"); return }
    if (passForm.password_nuevo.length < 6) { setErrorPass("La contrasena debe tener al menos 6 caracteres"); return }
    if (passForm.password_nuevo !== passForm.password_confirm) { setErrorPass("Las contrasenas no coinciden"); return }
    setCambiando(true)
    const res = await cambiarPassword(SUPERADMIN_ID, {
      password_actual: passForm.password_actual,
      password_nuevo:  passForm.password_nuevo,
    })
    setCambiando(false)
    if (res.error) { setErrorPass(res.error); return }
    setPassForm({ password_actual: "", password_nuevo: "", password_confirm: "" })
    setExitoPass(true)
    setTimeout(() => setExitoPass(false), 3000)
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHero} />
      <div className={s.skeletonGrid}>
        {[...Array(2)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.heroCard}>
        <div className={s.heroAvatar}>
          {perfil?.nombre_completo?.charAt(0).toUpperCase()}
        </div>
        <div className={s.heroInfo}>
          <div className={s.heroNombre}>{perfil?.nombre_completo}</div>
          <div className={s.heroEmail}>{perfil?.email}</div>
          <div className={s.heroBadges}>
            <span className={s.tipoBadge}>{perfil?.tipo_usuario?.nombre}</span>
            <span className={s.fechaBadge}>
              <ion-icon name="calendar-outline" /> Desde {fmtFecha(perfil?.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className={s.grid}>
        <form onSubmit={handleGuardar} className={s.section}>
          <div className={s.sectionTitle}>
            <ion-icon name="person-outline" /> Informacion personal
          </div>
          <div className={s.fieldCol}>
            <div className={s.field}>
              <label className={s.label}>Nombre completo <span className={s.req}>*</span></label>
              <input className={s.input} name="nombre_completo" value={form.nombre_completo} onChange={handleChange} placeholder="Nombre y apellido" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Email <span className={s.req}>*</span></label>
              <input className={s.input} type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@dominio.com" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Cedula</label>
              <input className={s.input} name="cedula" value={form.cedula} onChange={handleChange} placeholder="000-0000000-0" />
            </div>
          </div>
          {errorInfo && <div className={s.errorMsg}><ion-icon name="alert-circle-outline" /> {errorInfo}</div>}
          {exitoInfo && <div className={s.exitoMsg}><ion-icon name="checkmark-circle-outline" /> Perfil actualizado</div>}
          <div className={s.sectionFooter}>
            <button type="submit" className={s.btnGuardar} disabled={guardando}>
              {guardando ? <span className={s.spinner} /> : <><ion-icon name="save-outline" /> Guardar</>}
            </button>
          </div>
        </form>

        <form onSubmit={handlePassword} className={s.section}>
          <div className={s.sectionTitle}>
            <ion-icon name="lock-closed-outline" /> Cambiar contrasena
          </div>
          <div className={s.fieldCol}>
            <div className={s.field}>
              <label className={s.label}>Contrasena actual <span className={s.req}>*</span></label>
              <div className={s.passWrap}>
                <input className={s.input} type={verActual ? "text" : "password"} name="password_actual" value={passForm.password_actual} onChange={handlePassChange} placeholder="Contrasena actual" />
                <button type="button" className={s.passToggle} onClick={() => setVerActual(v => !v)}>
                  <ion-icon name={verActual ? "eye-off-outline" : "eye-outline"} />
                </button>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Nueva contrasena <span className={s.req}>*</span></label>
              <div className={s.passWrap}>
                <input className={s.input} type={verNueva ? "text" : "password"} name="password_nuevo" value={passForm.password_nuevo} onChange={handlePassChange} placeholder="Minimo 6 caracteres" />
                <button type="button" className={s.passToggle} onClick={() => setVerNueva(v => !v)}>
                  <ion-icon name={verNueva ? "eye-off-outline" : "eye-outline"} />
                </button>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Confirmar contrasena <span className={s.req}>*</span></label>
              <div className={s.passWrap}>
                <input className={s.input} type={verConfirm ? "text" : "password"} name="password_confirm" value={passForm.password_confirm} onChange={handlePassChange} placeholder="Repite la nueva contrasena" />
                <button type="button" className={s.passToggle} onClick={() => setVerConfirm(v => !v)}>
                  <ion-icon name={verConfirm ? "eye-off-outline" : "eye-outline"} />
                </button>
              </div>
            </div>
          </div>
          {errorPass && <div className={s.errorMsg}><ion-icon name="alert-circle-outline" /> {errorPass}</div>}
          {exitoPass && <div className={s.exitoMsg}><ion-icon name="checkmark-circle-outline" /> Contrasena actualizada</div>}
          <div className={s.sectionFooter}>
            <button type="submit" className={s.btnGuardar} disabled={cambiando}>
              {cambiando ? <span className={s.spinner} /> : <><ion-icon name="key-outline" /> Cambiar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}