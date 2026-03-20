"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import s from "./nuevo.module.css"

const API            = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SUPER_ADMIN_ID = 1

async function obtenerTiposUsuario() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/tipos`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function obtenerModosSistema() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/modos`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function obtenerEmpresasActivas() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/empresas`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function obtenerEmpresa(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function crearUsuario(data) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al crear usuario" }
    return { ok: true, usuario: json }
  } catch { return { error: "Error de conexion" } }
}

export default function NuevoUsuarioPage() {
  const router         = useRouter()
  const searchParams   = useSearchParams()
  const empresaIdParam = searchParams.get("empresa_id")

  const [cargando, setCargando]             = useState(true)
  const [tipos, setTipos]                   = useState([])
  const [modos, setModos]                   = useState([])
  const [empresas, setEmpresas]             = useState([])
  const [empresaModulos, setEmpresaModulos] = useState([])
  const [guardando, setGuardando]           = useState(false)
  const [error, setError]                   = useState("")
  const [verPass, setVerPass]               = useState(false)

  const [form, setForm] = useState({
    nombre_completo: "", email: "", password: "", cedula: "",
    estado: "activo", tipo_usuario_id: "", empresa_id: empresaIdParam ?? "", modos_ids: [],
  })

  useEffect(() => {
    Promise.all([obtenerTiposUsuario(), obtenerModosSistema(), obtenerEmpresasActivas()])
      .then(([t, m, e]) => {
        setTipos(t); setModos(m); setEmpresas(e)
        setCargando(false)
      })
  }, [])

  useEffect(() => {
    if (!form.empresa_id) { setEmpresaModulos([]); return }
    obtenerEmpresa(Number(form.empresa_id)).then(emp => {
      const modulos = emp?.empresa_modulos?.map(em => em.modulo).filter(Boolean) ?? []
      setEmpresaModulos(modulos)
      setForm(f => ({ ...f, modos_ids: [] }))
    })
  }, [form.empresa_id])

  const modosDisponibles = useMemo(() => {
    if (!form.empresa_id) return []
    return modos.filter(m =>
      empresaModulos.some(mod => mod.modo_sistema_id === m.id)
    )
  }, [modos, empresaModulos, form.empresa_id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const next = { ...f, [name]: value }
      if (name === "tipo_usuario_id" && Number(value) === SUPER_ADMIN_ID) {
        next.empresa_id = ""
        next.modos_ids  = []
      }
      return next
    })
  }

  function toggleModo(modoId) {
    setForm(f => ({
      ...f,
      modos_ids: f.modos_ids.includes(modoId)
        ? f.modos_ids.filter(x => x !== modoId)
        : [...f.modos_ids, modoId],
    }))
  }

  const esSuperAdmin    = Number(form.tipo_usuario_id) === SUPER_ADMIN_ID
  const requiereEmpresa = form.tipo_usuario_id && !esSuperAdmin

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!form.nombre_completo.trim()) { setError("El nombre es obligatorio"); return }
    if (!form.email.trim())           { setError("El email es obligatorio"); return }
    if (!form.password.trim())        { setError("La contrasena es obligatoria"); return }
    if (!form.tipo_usuario_id)        { setError("Selecciona el tipo de usuario"); return }
    if (requiereEmpresa && !form.empresa_id) { setError("Este tipo de usuario requiere una empresa asignada"); return }

    setGuardando(true)
    const res = await crearUsuario({
      ...form,
      tipo_usuario_id: Number(form.tipo_usuario_id),
      empresa_id:      form.empresa_id ? Number(form.empresa_id) : null,
      modos_ids:       form.modos_ids.map(Number),
    })
    setGuardando(false)
    if (res?.error) { setError(res.error); return }
    router.push(`/superadmin/usuarios${form.empresa_id ? `?empresa_id=${form.empresa_id}` : ""}`)
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHeader} />
      <div className={s.skeletonGrid}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}</div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <button className={s.btnBack} onClick={() => router.push(`/superadmin/usuarios${empresaIdParam ? `?empresa_id=${empresaIdParam}` : ""}`)}>
          <ion-icon name="arrow-back-outline" /> Usuarios
        </button>
      </div>

      <form onSubmit={handleSubmit} className={s.formGrid}>
        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="person-outline" /> Datos personales</div>
          <div className={s.fieldGrid}>
            <div className={`${s.field} ${s.fieldFull}`}>
              <label className={s.label}>Nombre completo <span className={s.req}>*</span></label>
              <input className={s.input} name="nombre_completo" value={form.nombre_completo} onChange={handleChange} placeholder="Nombre y apellido" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Email <span className={s.req}>*</span></label>
              <input className={s.input} type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@empresa.com" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Cedula</label>
              <input className={s.input} name="cedula" value={form.cedula} onChange={handleChange} placeholder="000-0000000-0" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Contrasena <span className={s.req}>*</span></label>
              <div className={s.passWrap}>
                <input className={s.input} type={verPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Contrasena" />
                <button type="button" className={s.passToggle} onClick={() => setVerPass(v => !v)}>
                  <ion-icon name={verPass ? "eye-off-outline" : "eye-outline"} />
                </button>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Estado</label>
              <select className={s.select} name="estado" value={form.estado} onChange={handleChange}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="shield-outline" /> Rol y acceso</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.label}>Tipo de usuario <span className={s.req}>*</span></label>
              <select className={s.select} name="tipo_usuario_id" value={form.tipo_usuario_id} onChange={handleChange}>
                <option value="">Seleccionar tipo</option>
                {tipos.filter(t => t.id !== SUPER_ADMIN_ID).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Empresa {requiereEmpresa && <span className={s.req}>*</span>}</label>
              {empresaIdParam ? (
                <div className={s.empresaFija}>
                  <ion-icon name="business-outline" />
                  {empresas.find(e => String(e.id) === String(empresaIdParam))?.nombre ?? `Empresa #${empresaIdParam}`}
                  <span className={s.empresaFijaLock}><ion-icon name="lock-closed-outline" /></span>
                </div>
              ) : (
                <select className={s.select} name="empresa_id" value={form.empresa_id} onChange={handleChange} disabled={esSuperAdmin}>
                  <option value="">{esSuperAdmin ? "No aplica" : "Seleccionar empresa"}</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              )}
            </div>
            <div className={`${s.field} ${s.fieldFull}`}>
              <label className={s.label}>Modos del sistema</label>
              {!form.empresa_id ? (
                <div className={s.modoPlaceholder}>
                  <ion-icon name="information-circle-outline" />
                  Selecciona una empresa primero
                </div>
              ) : modosDisponibles.length === 0 ? (
                <div className={s.modoPlaceholder}>
                  <ion-icon name="warning-outline" />
                  Esta empresa no tiene modos habilitados
                </div>
              ) : (
                <div className={s.modosGrid}>
                  {modosDisponibles.map(m => {
                    const on = form.modos_ids.includes(m.id)
                    return (
                      <button key={m.id} type="button"
                        className={`${s.modoBtn} ${on ? s.modoBtnOn : ""}`}
                        onClick={() => toggleModo(m.id)}
                      >
                        <ion-icon name={on ? "checkmark-circle" : "ellipse-outline"} />
                        {m.nombre}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className={s.errorMsg}><ion-icon name="alert-circle-outline" /> {error}</div>}

        <div className={s.formFooter}>
          <button type="button" className={s.btnCancelar} onClick={() => router.push(`/superadmin/usuarios${empresaIdParam ? `?empresa_id=${empresaIdParam}` : ""}`)}>
            Cancelar
          </button>
          <button type="submit" className={s.btnGuardar} disabled={guardando}>
            {guardando ? <span className={s.spinner} /> : <><ion-icon name="add-circle-outline" /> Crear usuario</>}
          </button>
        </div>
      </form>
    </div>
  )
}