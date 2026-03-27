"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import LocationSelect from "./extras/paises/LocationSelect"
import s from "./ConfiguracionEmpresa.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const POR_PAG = 9

const FORM_VACIO = {
  nombre: "", rnc: "", razon_social: "", telefono: "", email: "",
  direccion: "", pais: "DO", estado_geo: "", ciudad: "", moneda_id: "",
}

const PERFIL_VACIO = {
  nombre_completo: "", email: "", cedula: "",
  pass_actual: "", pass_nueva: "", pass_confirm: "",
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGEX_TEL   = /^[\d\s\-+().]{7,20}$/

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getEmpresa(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/configuracion/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getMonedas() {
  try {
    const res = await apiFetch(`/api/pos/configuracion/monedas`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function guardarEmpresa(empresaId, data) {
  try {
    const res = await apiFetch(`/api/pos/configuracion/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function subirLogoEmpresa(empresaId, formData) {
  try {
    const res = await apiFetch(`/api/pos/configuracion/${empresaId}/logo`, {
      method: "POST",
      body: formData,
    })
    return await res.json()
  } catch { return { error: "No se pudo subir el logo" } }
}

async function getPerfil(usuarioId) {
  try {
    const res = await apiFetch(`/api/pos/perfil/${usuarioId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function guardarPerfil(usuarioId, data) {
  try {
    const res = await apiFetch(`/api/pos/perfil/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function ConfiguracionEmpresa() {
  const router = useRouter()

  const [tab,         setTab]         = useState("empresa")
  const [empresaId,   setEmpresaId]   = useState(null)
  const [usuarioId,   setUsuarioId]   = useState(null)
  const [form,        setForm]        = useState(FORM_VACIO)
  const [perfil,      setPerfil]      = useState(PERFIL_VACIO)
  const [monedas,     setMonedas]     = useState([])
  const [monedaPag,   setMonedaPag]   = useState(0)
  const [buscarMoneda, setBuscarMoneda] = useState("")
  const [cargando,    setCargando]    = useState(true)
  const [guardando,   setGuardando]   = useState(false)
  const [alerta,      setAlerta]      = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile,    setLogoFile]    = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [errores,     setErrores]     = useState({})
  const [erroresPerfil, setErroresPerfil] = useState({})
  const fileRef = useRef(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    const [emp, mons] = await Promise.all([getEmpresa(empresaId), getMonedas()])
    if (emp) {
      const monedaId = String(emp.moneda_id ?? "")
      setForm({
        nombre:       emp.nombre       ?? "",
        rnc:          emp.rnc          ?? "",
        razon_social: emp.razon_social ?? "",
        telefono:     emp.telefono     ?? "",
        email:        emp.email        ?? "",
        direccion:    emp.direccion    ?? "",
        pais:         emp.pais         ?? "DO",
        estado_geo:   emp.estado_geo   ?? "",
        ciudad:       emp.ciudad       ?? "",
        moneda_id:    monedaId,
      })
      const logo = emp.configuracion?.find(c => c.clave === "logo")?.valor
      if (logo) setLogoPreview(`${API}${logo}`)
      if (mons.length && monedaId) {
        const idx = mons.findIndex(m => String(m.id) === monedaId)
        if (idx >= 0) setMonedaPag(Math.floor(idx / POR_PAG))
      }
    }
    setMonedas(mons)
    setCargando(false)
  }, [empresaId])

  const cargarPerfil = useCallback(async () => {
    if (!usuarioId) return
    const data = await getPerfil(usuarioId)
    if (data) {
      setPerfil({
        nombre_completo: data.nombre_completo ?? "",
        email:           data.email           ?? "",
        cedula:          data.cedula          ?? "",
        pass_actual: "", pass_nueva: "", pass_confirm: "",
      })
    }
  }, [usuarioId])

  useEffect(() => { cargar() },       [cargar])
  useEffect(() => { cargarPerfil() }, [cargarPerfil])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errores[name]) setErrores(er => { const n = { ...er }; delete n[name]; return n })
  }

  function handlePerfilChange(e) {
    const { name, value } = e.target
    setPerfil(p => ({ ...p, [name]: value }))
    if (erroresPerfil[name]) setErroresPerfil(er => { const n = { ...er }; delete n[name]; return n })
  }

  function handleLogoChange(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return mostrarAlerta("error", "El logo no puede superar 2MB")
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = e => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  function validarEmpresa() {
    const er = {}
    if (!form.nombre.trim())                               er.nombre   = "El nombre es obligatorio"
    if (form.email    && !REGEX_EMAIL.test(form.email))    er.email    = "Correo invalido"
    if (form.telefono && !REGEX_TEL.test(form.telefono))   er.telefono = "Telefono invalido"
    if (!form.moneda_id)                                   er.moneda_id = "Selecciona una moneda"
    setErrores(er)
    return Object.keys(er).length === 0
  }

  function validarPerfil() {
    const er = {}
    if (!perfil.nombre_completo.trim())              er.nombre_completo = "El nombre es obligatorio"
    if (!perfil.email.trim())                        er.email = "El correo es obligatorio"
    else if (!REGEX_EMAIL.test(perfil.email))        er.email = "Correo invalido"
    if (perfil.pass_nueva) {
      if (!perfil.pass_actual)                       er.pass_actual  = "Ingresa tu contrasena actual"
      if (perfil.pass_nueva.length < 6)              er.pass_nueva   = "Minimo 6 caracteres"
      if (perfil.pass_nueva !== perfil.pass_confirm) er.pass_confirm = "Las contrasenas no coinciden"
    }
    setErroresPerfil(er)
    return Object.keys(er).length === 0
  }

  async function handleGuardar() {
    if (!empresaId) return
    if (!validarEmpresa()) return
    setGuardando(true)
    if (logoFile) {
      const fd = new FormData()
      fd.append("file", logoFile)
      const r = await subirLogoEmpresa(empresaId, fd)
      if (r?.error) { setGuardando(false); return mostrarAlerta("error", r.error) }
    }
    const res = await guardarEmpresa(empresaId, form)
    setGuardando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Configuracion guardada correctamente")
    cargar()
  }

  async function handleGuardarPerfil() {
    if (!usuarioId) return
    if (!validarPerfil()) return
    setGuardando(true)
    const payload = {
      nombre_completo: perfil.nombre_completo,
      email:           perfil.email,
      cedula:          perfil.cedula,
    }
    if (perfil.pass_nueva) {
      payload.pass_actual  = perfil.pass_actual
      payload.pass_nueva   = perfil.pass_nueva
    }
    const res = await guardarPerfil(usuarioId, payload)
    setGuardando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Perfil actualizado correctamente")
    setPerfil(p => ({ ...p, pass_actual: "", pass_nueva: "", pass_confirm: "" }))
  }

  const monedasFiltradas = buscarMoneda.trim()
    ? monedas.filter(m =>
        m.nombre.toLowerCase().includes(buscarMoneda.toLowerCase()) ||
        m.codigo.toLowerCase().includes(buscarMoneda.toLowerCase()) ||
        m.simbolo.toLowerCase().includes(buscarMoneda.toLowerCase())
      )
    : monedas
  const monedasPag  = monedasFiltradas.slice(monedaPag * POR_PAG, (monedaPag + 1) * POR_PAG)
  const totalPags   = Math.ceil(monedasFiltradas.length / POR_PAG)

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === "empresa" ? s.tabActivo : ""}`} onClick={() => setTab("empresa")}>
          <ion-icon name="business-outline" />Empresa
        </button>
        <button className={`${s.tab} ${tab === "perfil" ? s.tabActivo : ""}`} onClick={() => setTab("perfil")}>
          <ion-icon name="person-outline" />Mi perfil
        </button>
      </div>

      {tab === "empresa" && (
        <>
          <div className={s.grid}>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="business-outline" />Datos basicos</div>
              <div className={s.formGrid}>
                <div className={`${s.field} ${s.spanFull}`}>
                  <label>Nombre de la empresa *</label>
                  <input
                    className={`${s.input} ${errores.nombre ? s.inputError : ""}`}
                    name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Mi Empresa S.R.L."
                  />
                  {errores.nombre && <span className={s.errorMsg}>{errores.nombre}</span>}
                </div>
                <div className={s.field}>
                  <label>RNC / Cedula</label>
                  <input className={s.input} name="rnc" value={form.rnc} onChange={handleChange} placeholder="101-12345-6" />
                </div>
                <div className={s.field}>
                  <label>Razon social</label>
                  <input className={s.input} name="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Razon social opcional" />
                </div>
                <div className={s.field}>
                  <label>Telefono</label>
                  <input
                    className={`${s.input} ${errores.telefono ? s.inputError : ""}`}
                    name="telefono" value={form.telefono} onChange={handleChange}
                    placeholder="809-000-0000"
                  />
                  {errores.telefono && <span className={s.errorMsg}>{errores.telefono}</span>}
                </div>
                <div className={s.field}>
                  <label>Email</label>
                  <input
                    className={`${s.input} ${errores.email ? s.inputError : ""}`}
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="empresa@correo.com"
                  />
                  {errores.email && <span className={s.errorMsg}>{errores.email}</span>}
                </div>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="location-outline" />Direccion y ubicacion</div>
              <div className={s.formGrid}>
                <div className={`${s.field} ${s.spanFull}`}>
                  <label>Direccion</label>
                  <input className={s.input} name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle Principal #1" />
                </div>
                <LocationSelect form={form} onChange={handleChange} />
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="cash-outline" />Moneda</div>
              {errores.moneda_id && <span className={s.errorMsg}>{errores.moneda_id}</span>}
              <div className={s.monedaBuscador}>
                <ion-icon name="search-outline" />
                <input
                  className={s.monedaBuscadorInput}
                  placeholder="Buscar moneda..."
                  value={buscarMoneda}
                  onChange={e => { setBuscarMoneda(e.target.value); setMonedaPag(0) }}
                />
                {buscarMoneda && (
                  <button className={s.monedaBuscadorClear} onClick={() => { setBuscarMoneda(""); setMonedaPag(0) }}>
                    <ion-icon name="close-outline" />
                  </button>
                )}
              </div>
              <div className={s.monedasGrid}>
                {monedasPag.map(m => (
                  <button
                    key={m.id}
                    className={`${s.monedaBtn} ${String(form.moneda_id) === String(m.id) ? s.monedaActiva : ""}`}
                    onClick={() => { handleChange({ target: { name: "moneda_id", value: String(m.id) } }); setErrores(er => { const n={...er}; delete n.moneda_id; return n }) }}
                  >
                    <span className={s.monedaSimbolo}>{m.simbolo}</span>
                    <span className={s.monedaNombre}>{m.nombre}</span>
                    <span className={s.monedaCodigo}>{m.codigo}</span>
                  </button>
                ))}
              </div>
              {totalPags > 1 && (
                <div className={s.monedaPaginacion}>
                  <button className={s.monedaPagBtn} disabled={monedaPag === 0} onClick={() => setMonedaPag(p => p - 1)}>
                    <ion-icon name="chevron-back-outline" />
                  </button>
                  <span className={s.monedaPagInfo}>{monedaPag + 1} / {totalPags}</span>
                  <button className={s.monedaPagBtn} disabled={monedaPag >= totalPags - 1} onClick={() => setMonedaPag(p => p + 1)}>
                    <ion-icon name="chevron-forward-outline" />
                  </button>
                </div>
              )}
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="image-outline" />Logo de la empresa</div>
              <div
                className={`${s.dropZone} ${dragOver ? s.dropZoneOver : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleLogoChange(e.dataTransfer.files[0]) }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" className={s.logoPreview} />
                ) : (
                  <>
                    <ion-icon name="cloud-upload-outline" />
                    <span>Arrastra el logo aqui o haz clic</span>
                    <span className={s.dropHint}>PNG, JPG, WEBP o SVG - max 2MB</span>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoChange(e.target.files[0])} />
              </div>
              {logoPreview && (
                <button className={s.btnQuitarLogo} onClick={() => { setLogoPreview(null); setLogoFile(null) }}>
                  <ion-icon name="trash-outline" />Quitar logo
                </button>
              )}
            </div>

          </div>

          <div className={s.barraGuardar}>
            <button className={s.btnGuardar} onClick={handleGuardar} disabled={guardando}>
              {guardando ? <span className={s.spinner} /> : <><ion-icon name="save-outline" />Guardar cambios</>}
            </button>
          </div>
        </>
      )}

      {tab === "perfil" && (
        <>
          <div className={s.grid}>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="person-outline" />Informacion personal</div>
              <div className={s.gridPerfil}>
                <div className={s.field}>
                  <label>Nombre completo *</label>
                  <input
                    className={`${s.input} ${erroresPerfil.nombre_completo ? s.inputError : ""}`}
                    name="nombre_completo" value={perfil.nombre_completo} onChange={handlePerfilChange}
                    placeholder="Juan Perez"
                  />
                  {erroresPerfil.nombre_completo && <span className={s.errorMsg}>{erroresPerfil.nombre_completo}</span>}
                </div>
                <div className={s.field}>
                  <label>Correo electronico *</label>
                  <input
                    className={`${s.input} ${erroresPerfil.email ? s.inputError : ""}`}
                    type="email" name="email" value={perfil.email} onChange={handlePerfilChange}
                    placeholder="usuario@correo.com"
                  />
                  {erroresPerfil.email && <span className={s.errorMsg}>{erroresPerfil.email}</span>}
                </div>
                <div className={s.field}>
                  <label>Cedula</label>
                  <input
                    className={s.input}
                    name="cedula" value={perfil.cedula} onChange={handlePerfilChange}
                    placeholder="001-0000000-0"
                  />
                </div>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="lock-closed-outline" />Cambiar contrasena</div>
              <div className={s.formCol}>
                <div className={s.field}>
                  <label>Contrasena actual</label>
                  <input
                    className={`${s.input} ${erroresPerfil.pass_actual ? s.inputError : ""}`}
                    type="password" name="pass_actual" value={perfil.pass_actual} onChange={handlePerfilChange}
                    placeholder="••••••••"
                  />
                  {erroresPerfil.pass_actual && <span className={s.errorMsg}>{erroresPerfil.pass_actual}</span>}
                </div>
                <div className={s.field}>
                  <label>Nueva contrasena</label>
                  <input
                    className={`${s.input} ${erroresPerfil.pass_nueva ? s.inputError : ""}`}
                    type="password" name="pass_nueva" value={perfil.pass_nueva} onChange={handlePerfilChange}
                    placeholder="Minimo 6 caracteres"
                  />
                  {erroresPerfil.pass_nueva && <span className={s.errorMsg}>{erroresPerfil.pass_nueva}</span>}
                </div>
                <div className={s.field}>
                  <label>Confirmar nueva contrasena</label>
                  <input
                    className={`${s.input} ${erroresPerfil.pass_confirm ? s.inputError : ""}`}
                    type="password" name="pass_confirm" value={perfil.pass_confirm} onChange={handlePerfilChange}
                    placeholder="Repite la contrasena"
                  />
                  {erroresPerfil.pass_confirm && <span className={s.errorMsg}>{erroresPerfil.pass_confirm}</span>}
                </div>
              </div>
            </div>

          </div>

          <div className={s.barraGuardar}>
            <button className={s.btnGuardar} onClick={handleGuardarPerfil} disabled={guardando}>
              {guardando ? <span className={s.spinner} /> : <><ion-icon name="save-outline" />Guardar perfil</>}
            </button>
          </div>
        </>
      )}

    </div>
  )
}