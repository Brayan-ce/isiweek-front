"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import LocationMoneda from "./extras/LocationMoneda"
import AltchaWidget from "@/_EXTRAS/Recapchat/AltchaWidget"
import s from "./registro.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const GSI_URL = "https://accounts.google.com/gsi/client"

const SISTEMAS = [
  { id:"pos",          icono:"storefront-outline",  label:"POS",            desc:"Punto de venta, caja e inventario",   grupo:"comercial" },
  { id:"creditos",     icono:"card-outline",         label:"Financiamiento", desc:"Cartera de créditos y cuotas",        grupo:"comercial" },
  { id:"ventas_online",icono:"bag-handle-outline",   label:"Ventas online",  desc:"Catálogo público y pedidos",          grupo:"comercial" },
  { id:"obras",        icono:"construct-outline",    label:"Obras",          desc:"Proyectos, asistencia y gastos",      grupo:"obras"     },
]

const PASOS = [
  { num:1, label:"Tus datos"  },
  { num:2, label:"Tu empresa" },
  { num:3, label:"Tu sistema" },
  { num:4, label:"¡Listo!"   },
]

function generarPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({length:10}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("")
}

async function obtenerConfigSistema() {
  try {
    const res = await fetch(`${API}/api/auth/config`)
    if (!res.ok) return {}
    return await res.json()
  } catch { return {} }
}

export default function RegistroPage() {
  const [paso, setPaso]           = useState(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState("")
  const [resultado, setResultado] = useState(null)
  const [config, setConfig]       = useState({})
  const canvasRef                 = useRef()
  const altchaRef                 = useRef(null)

  const [personal, setPersonal] = useState({ nombre:"", apellido:"", email:"" })
  const [empresa,  setEmpresa]  = useState({ nombre:"", rnc:"", pais:"DO", telefono:"", prefijo:"", moneda:"" })
  const [sistemas, setSistemas] = useState([])

  const [altchaPayload,  setAltchaPayload]  = useState(null)
  const [altchaVerified, setAltchaVerified] = useState(false)

  const tieneComercial = sistemas.some(id => ["pos","creditos","ventas_online"].includes(id))
  const tieneObras     = sistemas.includes("obras")

  useEffect(() => {
    obtenerConfigSistema().then(d => setConfig(d))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight

    const dots = Array.from({ length: 70 }, () => ({
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - .5) * .5,
      vy:      (Math.random() - .5) * .5,
      r:       Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      pulse:   Math.random() * Math.PI * 2,
    }))

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const isDk = document.documentElement.getAttribute("data-theme") === "dark"

      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0
        d.pulse += 0.02

        const pulsedR = d.r + Math.sin(d.pulse) * 0.6
        const pulsedA = d.opacity + Math.sin(d.pulse) * 0.15

        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, pulsedR * 2.5)
        if (isDk) {
          grad.addColorStop(0, `rgba(96,165,250,${pulsedA})`)
          grad.addColorStop(1, `rgba(96,165,250,0)`)
        } else {
          grad.addColorStop(0, `rgba(29,111,206,${pulsedA})`)
          grad.addColorStop(1, `rgba(29,111,206,0)`)
        }

        ctx.beginPath()
        ctx.arc(d.x, d.y, pulsedR * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        ctx.beginPath()
        ctx.arc(d.x, d.y, pulsedR, 0, Math.PI * 2)
        ctx.fillStyle = isDk ? `rgba(147,197,253,${pulsedA + 0.1})` : `rgba(29,111,206,${pulsedA + 0.1})`
        ctx.fill()
      })

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx   = dots[i].x - dots[j].x
          const dy   = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            const alpha = (1 - dist / 130) * (isDk ? 0.18 : 0.13)
            const grad  = ctx.createLinearGradient(dots[i].x, dots[i].y, dots[j].x, dots[j].y)
            if (isDk) {
              grad.addColorStop(0,   `rgba(96,165,250,${alpha})`)
              grad.addColorStop(0.5, `rgba(147,197,253,${alpha * 1.4})`)
              grad.addColorStop(1,   `rgba(96,165,250,${alpha})`)
            } else {
              grad.addColorStop(0,   `rgba(29,111,206,${alpha})`)
              grad.addColorStop(0.5, `rgba(14,165,233,${alpha * 1.4})`)
              grad.addColorStop(1,   `rgba(29,111,206,${alpha})`)
            }
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = grad
            ctx.lineWidth   = (1 - dist / 130) * 1.2
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    window.addEventListener("resize", onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize) }
  }, [])

  function toggleSistema(id) {
    const esObras     = id === "obras"
    const esComercial = ["pos","creditos","ventas_online"].includes(id)
    setSistemas(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (esObras && tieneComercial) return ["obras"]
      if (esComercial && tieneObras) return [...prev.filter(x => x !== "obras"), id]
      return [...prev, id]
    })
  }

  function resetAltcha() {
    setAltchaPayload(null)
    setAltchaVerified(false)
    altchaRef.current?.reset()
  }

  function validarPaso1() {
    if (!personal.nombre.trim())   return "El nombre es obligatorio"
    if (!personal.apellido.trim()) return "El apellido es obligatorio"
    if (!personal.email.trim())    return "El correo es obligatorio"
    if (!/\S+@\S+\.\S+/.test(personal.email)) return "El correo no es válido"
    return ""
  }

  function validarPaso2() {
    if (!empresa.nombre.trim())   return "El nombre de la empresa es obligatorio"
    if (!empresa.telefono.trim()) return "El teléfono es obligatorio"
    return ""
  }

  function validarPaso3() {
    if (sistemas.length === 0) return "Selecciona al menos un sistema"
    if (!altchaVerified)       return "Completa la verificación de seguridad"
    return ""
  }

  async function handleSiguiente() {
    setError("")
    if (paso === 1) {
      const e = validarPaso1(); if (e) { setError(e); return }
      setPaso(2)
    } else if (paso === 2) {
      const e = validarPaso2(); if (e) { setError(e); return }
      setPaso(3)
    } else if (paso === 3) {
      const e = validarPaso3(); if (e) { setError(e); return }
      await handleRegistrar()
    }
  }

  async function handleRegistrar() {
    setGuardando(true)
    setError("")
    const password = generarPassword()
    try {
      const res = await fetch(`${API}/api/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:   personal.nombre,
          apellido: personal.apellido,
          email:    personal.email,
          telefono: empresa.telefono,
          prefijo:  empresa.prefijo,
          empresa:  empresa.nombre,
          rnc:      empresa.rnc,
          pais:     empresa.pais,
          moneda:   empresa.moneda,
          sistemas,
          password,
          altcha:   altchaPayload,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        resetAltcha()
        setError(json.error ?? "Error al registrar")
        setGuardando(false)
        return
      }
      setResultado({ ...json, password })
      setPaso(4)
    } catch {
      resetAltcha()
      setError("Error de conexión, intenta de nuevo")
    }
    setGuardando(false)
  }

  const sistemaNombre = config.sistema_nombre ?? "Ambrysoft"
  const logoPath      = config.sistema_logo   ?? null
  const sistemaLogo   = logoPath ? `${API}${logoPath}` : null

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.canvas} />

      <div className={s.card}>

        <div className={s.logoWrap}>
          {sistemaLogo
            ? <img src={sistemaLogo} alt={sistemaNombre} className={s.logoImg} />
            : <div className={s.logo}>{sistemaNombre.charAt(0)}</div>
          }
          <span className={s.logoText}>{sistemaNombre}</span>
        </div>

        <StepBar paso={paso} />

        <div className={s.body}>
          {paso === 1 && <Paso1 data={personal} onChange={setPersonal} />}
          {paso === 2 && <Paso2 data={empresa}  onChange={setEmpresa}  />}
          {paso === 3 && (
            <Paso3
              sistemas={sistemas} toggle={toggleSistema}
              tieneComercial={tieneComercial} tieneObras={tieneObras}
              altchaVerified={altchaVerified}
              altchaRef={altchaRef}
              onAltchaVerified={(p) => { setAltchaPayload(p); setAltchaVerified(true) }}
              onAltchaReset={() => { setAltchaPayload(null); setAltchaVerified(false) }}
            />
          )}
          {paso === 4 && (
            <Paso4
              resultado={resultado}
              personal={personal}
              empresa={empresa}
              sistemas={sistemas}
              sistemaNombre={sistemaNombre}
            />
          )}

          {error && (
            <div className={s.errorMsg}>
              <ion-icon name="alert-circle-outline" />{error}
            </div>
          )}
        </div>

        {paso < 4 && (
          <div className={s.footer}>
            {paso > 1 && (
              <button
                type="button"
                className={s.btnAtras}
                onClick={() => {
                  setError("")
                  if (paso === 3) resetAltcha()
                  setPaso(p => p - 1)
                }}
              >
                <ion-icon name="arrow-back-outline" />Atrás
              </button>
            )}
            <button
              type="button"
              className={`${s.btnSig} ${paso === 3 ? s.btnSigFinal : ""}`}
              onClick={handleSiguiente}
              disabled={guardando || (paso === 3 && !altchaVerified)}
            >
              {guardando
                ? <span className={s.spinner} />
                : paso === 3
                  ? <><ion-icon name="checkmark-circle-outline" />Crear mi cuenta</>
                  : <><span>Siguiente</span><ion-icon name="arrow-forward-outline" /></>
              }
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function StepBar({ paso }) {
  return (
    <div className={s.stepBar}>
      {PASOS.map((p, i) => (
        <div key={p.num} className={s.stepItem}>
          <div className={`${s.stepCircle} ${paso===p.num?s.stepActive:paso>p.num?s.stepDone:""}`}>
            {paso > p.num ? <ion-icon name="checkmark-outline" /> : p.num}
          </div>
          <span className={`${s.stepLabel} ${paso===p.num?s.stepLabelActive:""}`}>{p.label}</span>
          {i < PASOS.length - 1 && <div className={`${s.stepLine} ${paso>p.num?s.stepLineDone:""}`} />}
        </div>
      ))}
    </div>
  )
}

const DOMINIOS_RAPIDOS = ["@gmail.com", "@hotmail.com", "@outlook.com"]

function Paso1({ data, onChange }) {
  const set = (k, v) => onChange(p => ({ ...p, [k]: v }))
  const [dominioIdx, setDominioIdx]       = useState(0)
  const [personalizado, setPersonalizado] = useState(false)
  const [emailCheck, setEmailCheck]       = useState({ estado: null, msg: "" })
  const [checkTimer, setCheckTimer]       = useState(null)

  const dominio = DOMINIOS_RAPIDOS[dominioIdx]
  const usuario = personalizado ? "" : (data.email.includes("@") ? data.email.split("@")[0] : data.email)

  function handleDominio(idx) {
    setDominioIdx(idx)
    setPersonalizado(false)
    const user = data.email.includes("@") ? data.email.split("@")[0] : data.email
    const nuevoEmail = user ? `${user}${DOMINIOS_RAPIDOS[idx]}` : ""
    set("email", nuevoEmail)
    setEmailCheck({ estado: null, msg: "" })
    if (nuevoEmail) verificarEmailDebounce(nuevoEmail)
  }

  function handlePersonalizado() {
    setPersonalizado(true)
    set("email", "")
    setEmailCheck({ estado: null, msg: "" })
  }

  function handleUsuario(e) {
    const user  = e.target.value.replace(/@.*/, "")
    const email = user ? `${user}${dominio}` : ""
    set("email", email)
    setEmailCheck({ estado: null, msg: "" })
    if (email && /\S+@\S+\.\S+/.test(email)) verificarEmailDebounce(email)
  }

  function handleEmailPersonalizado(e) {
    const email = e.target.value
    set("email", email)
    setEmailCheck({ estado: null, msg: "" })
    if (email && /\S+@\S+\.\S+/.test(email)) verificarEmailDebounce(email)
  }

  function verificarEmailDebounce(email) {
    clearTimeout(checkTimer)
    const t = setTimeout(() => verificarEmail(email), 600)
    setCheckTimer(t)
  }

  async function verificarEmail(email) {
    setEmailCheck({ estado: "cargando", msg: "" })
    try {
      const res  = await fetch(`${API}/api/registro/verificar-email?email=${encodeURIComponent(email)}`)
      const json = await res.json()
      if (json.existe) {
        setEmailCheck({ estado: "ocupado", msg: "Este correo ya tiene una cuenta registrada" })
      } else {
        setEmailCheck({ estado: "libre", msg: "Correo disponible" })
      }
    } catch {
      setEmailCheck({ estado: null, msg: "" })
    }
  }

  return (
    <div className={s.campos}>
      <div className={s.pasoHead}>
        <ion-icon name="person-outline" />
        <div>
          <div className={s.pasoTitle}>Tus datos personales</div>
          <div className={s.pasoSub}>Cuéntanos quién eres</div>
        </div>
      </div>
      <div className={s.grid2}>
        <Field label="Nombre" icon="person-outline">
          <input className={s.input} placeholder="Juan" value={data.nombre} onChange={e=>set("nombre",e.target.value)} />
        </Field>
        <Field label="Apellido" icon="person-outline">
          <input className={s.input} placeholder="Pérez" value={data.apellido} onChange={e=>set("apellido",e.target.value)} />
        </Field>
      </div>

      <div className={s.field}>
        <label className={s.label}><ion-icon name="mail-outline" />Correo electrónico</label>
        <div className={s.dominiosTabs}>
          {DOMINIOS_RAPIDOS.map((d, i) => (
            <button key={d} type="button"
              className={`${s.dominioTab} ${!personalizado && dominioIdx === i ? s.dominioTabOn : ""}`}
              onClick={() => handleDominio(i)}
            >
              {d}
            </button>
          ))}
          <button type="button"
            className={`${s.dominioTab} ${personalizado ? s.dominioTabOn : ""}`}
            onClick={handlePersonalizado}
          >
            <ion-icon name="create-outline" /> Personalizado
          </button>
        </div>

        {!personalizado ? (
          <div className={`${s.emailSplitWrap} ${emailCheck.estado === "ocupado" ? s.emailSplitError : emailCheck.estado === "libre" ? s.emailSplitOk : ""}`}>
            <input
              className={s.emailUserInput}
              placeholder="tunombre"
              value={usuario}
              onChange={handleUsuario}
              autoComplete="off"
            />
            <div className={s.emailDominioTag}>{dominio}</div>
            {emailCheck.estado === "cargando" && <span className={s.emailSpinner} />}
            {emailCheck.estado === "libre"    && <ion-icon name="checkmark-circle-outline" class={s.emailIconOk} />}
          </div>
        ) : (
          <div className={`${s.emailSplitWrap} ${emailCheck.estado === "ocupado" ? s.emailSplitError : emailCheck.estado === "libre" ? s.emailSplitOk : ""}`}>
            <input
              className={s.emailFullInput}
              type="email"
              placeholder="correo@miempresa.com"
              value={data.email}
              onChange={handleEmailPersonalizado}
              autoComplete="email"
            />
            {emailCheck.estado === "cargando" && <span className={s.emailSpinner} />}
            {emailCheck.estado === "libre"    && <ion-icon name="checkmark-circle-outline" class={s.emailIconOk} />}
          </div>
        )}

        {emailCheck.msg && (
          <span className={`${s.emailFeedback} ${emailCheck.estado === "ocupado" ? s.emailFeedbackError : s.emailFeedbackOk}`}>
            {emailCheck.msg}
          </span>
        )}
      </div>
    </div>
  )
}

function Paso2({ data, onChange }) {
  const [empresaCheck, setEmpresaCheck] = useState({ estado: null, msg: "" })
  const [checkTimer, setCheckTimer]     = useState(null)

  const handleChange = e => {
    const { name, value } = e.target
    onChange(p => ({ ...p, [name]: value }))
    if (name === "nombre") {
      setEmpresaCheck({ estado: null, msg: "" })
      clearTimeout(checkTimer)
      if (value.trim().length >= 2) {
        const t = setTimeout(() => verificarEmpresa(value.trim()), 600)
        setCheckTimer(t)
      }
    }
  }

  async function verificarEmpresa(nombre) {
    setEmpresaCheck({ estado: "cargando", msg: "" })
    try {
      const res  = await fetch(`${API}/api/registro/verificar-empresa?nombre=${encodeURIComponent(nombre)}`)
      const json = await res.json()
      if (json.existe) {
        setEmpresaCheck({ estado: "ocupado", msg: "Ya existe una empresa con ese nombre" })
      } else {
        setEmpresaCheck({ estado: "libre", msg: "Nombre disponible" })
      }
    } catch {
      setEmpresaCheck({ estado: null, msg: "" })
    }
  }

  return (
    <div className={s.campos}>
      <div className={s.pasoHead}>
        <ion-icon name="business-outline" />
        <div>
          <div className={s.pasoTitle}>Datos de tu empresa</div>
          <div className={s.pasoSub}>Información de tu negocio</div>
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}><ion-icon name="storefront-outline" />Nombre de la empresa</label>
        <div className={`${s.checkInputWrap} ${empresaCheck.estado === "ocupado" ? s.checkInputError : empresaCheck.estado === "libre" ? s.checkInputOk : ""}`}>
          <input
            className={s.checkInput}
            name="nombre"
            placeholder="Mi Empresa SRL"
            value={data.nombre}
            onChange={handleChange}
            autoComplete="off"
          />
          {empresaCheck.estado === "cargando" && <span className={s.emailSpinner} />}
          {empresaCheck.estado === "ocupado"  && <ion-icon name="close-circle-outline" class={s.emailIconError} />}
          {empresaCheck.estado === "libre"    && <ion-icon name="checkmark-circle-outline" class={s.emailIconOk} />}
        </div>
        {empresaCheck.msg && (
          <span className={`${s.emailFeedback} ${empresaCheck.estado === "ocupado" ? s.emailFeedbackError : s.emailFeedbackOk}`}>
            {empresaCheck.msg}
          </span>
        )}
      </div>

      <Field label="RNC (opcional)" icon="document-outline">
        <input className={s.input} name="rnc" placeholder="000-00000-0" value={data.rnc} onChange={handleChange} />
      </Field>
      <LocationMoneda form={data} onChange={handleChange} />
    </div>
  )
}

function Paso3({ sistemas, toggle, tieneComercial, tieneObras, altchaVerified, altchaRef, onAltchaVerified, onAltchaReset }) {
  return (
    <div className={s.campos}>
      <div className={s.pasoHead}>
        <ion-icon name="apps-outline" />
        <div>
          <div className={s.pasoTitle}>¿Qué sistema necesitas?</div>
          <div className={s.pasoSub}>Combina POS, Financiamiento y Ventas online. Obras es independiente.</div>
        </div>
      </div>

      <div className={s.sistemasGrupo}>
        <div className={s.grupoLabel}>
          <ion-icon name="storefront-outline" />
          Sistema comercial — combinables
        </div>
        <div className={s.sistemasGrid}>
          {SISTEMAS.filter(sis => sis.grupo === "comercial").map(sis => {
            const on = sistemas.includes(sis.id)
            return (
              <button key={sis.id} type="button"
                className={`${s.sisCard} ${on ? s.sisCardOn : ""}`}
                onClick={() => toggle(sis.id)}
              >
                <div className={`${s.sisIcono} ${on ? s.sisIconoOn : ""}`}>
                  <ion-icon name={sis.icono} />
                </div>
                <div className={s.sisInfo}>
                  <span className={s.sisLabel}>{sis.label}</span>
                  <span className={s.sisDesc}>{sis.desc}</span>
                </div>
                <div className={`${s.sisCheck} ${on ? s.sisCheckOn : ""}`}>
                  <ion-icon name={on ? "checkmark-outline" : "add-outline"} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className={s.separador}><span>o</span></div>

      <div className={s.sistemasGrupo}>
        <div className={`${s.grupoLabel} ${s.grupoLabelObras}`}>
          <ion-icon name="construct-outline" />
          Sistema de obras — independiente
        </div>
        {tieneComercial && (
          <div className={s.avisoObras}>
            <ion-icon name="information-circle-outline" />
            Seleccionar Obras quitará los módulos comerciales seleccionados
          </div>
        )}
        <div className={s.sistemasGrid}>
          {SISTEMAS.filter(sis => sis.grupo === "obras").map(sis => {
            const on = sistemas.includes(sis.id)
            return (
              <button key={sis.id} type="button"
                className={`${s.sisCard} ${s.sisCardObras} ${on ? s.sisCardObrasOn : ""}`}
                onClick={() => toggle(sis.id)}
              >
                <div className={`${s.sisIcono} ${s.sisIconoObras} ${on ? s.sisIconoObrasOn : ""}`}>
                  <ion-icon name={sis.icono} />
                </div>
                <div className={s.sisInfo}>
                  <span className={s.sisLabel}>{sis.label}</span>
                  <span className={s.sisDesc}>{sis.desc}</span>
                </div>
                <div className={`${s.sisCheck} ${on ? s.sisCheckObrasOn : ""}`}>
                  <ion-icon name={on ? "checkmark-outline" : "add-outline"} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AltchaWidget
        ref={altchaRef}
        onVerified={onAltchaVerified}
        onReset={onAltchaReset}
      />
    </div>
  )
}

function Paso4({ resultado, personal, empresa, sistemas, sistemaNombre }) {
  const [googleEstado, setGoogleEstado] = useState("idle")
  const [gsiListo, setGsiListo]         = useState(false)
  const googleInitRef                   = useRef(false)

  const handleGoogleCallback = useCallback(async (response) => {
    setGoogleEstado("cargando")
    try {
      const res  = await fetch(`${API}/api/registro/vincular-google`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: personal.email, idToken: response.credential }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 400) {
          setGoogleEstado("correoDistinto")
        } else {
          setGoogleEstado("error")
          setTimeout(() => setGoogleEstado("idle"), 3000)
        }
        return
      }
      setGoogleEstado("vinculado")
    } catch {
      setGoogleEstado("error")
      setTimeout(() => setGoogleEstado("idle"), 3000)
    }
  }, [personal.email])

  const initGoogle = useCallback(() => {
    if (!window.google?.accounts?.id || googleInitRef.current) return
    googleInitRef.current = true
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback:  handleGoogleCallback,
      ux_mode:   "popup",
      cancel_on_tap_outside: true,
    })
    setGsiListo(true)
  }, [handleGoogleCallback])

  useEffect(() => {
    if (window.google?.accounts?.id) { initGoogle(); return }
    const existing = document.querySelector(`script[src="${GSI_URL}"]`)
    if (existing) {
      existing.addEventListener("load", initGoogle)
      return () => existing.removeEventListener("load", initGoogle)
    }
    const script   = document.createElement("script")
    script.src     = GSI_URL
    script.async   = true
    script.defer   = true
    script.onload  = initGoogle
    document.head.appendChild(script)
    return () => { script.onload = null }
  }, [initGoogle])

  function triggerGoogle() {
    if (!gsiListo || !window.google?.accounts?.id) return
    setGoogleEstado("idle")
    window.google.accounts.id.prompt()
  }

  const waNum = resultado?.whatsapp ?? "51935790269"
  const sistemasLabel = sistemas.map(id => {
    const m = { pos:"POS", creditos:"Financiamiento", ventas_online:"Ventas online", obras:"Obras" }
    return m[id] ?? id
  }).join(", ")

  const msg = encodeURIComponent(
    `Hola, me acabo de registrar en ${sistemaNombre} y quiero activar mi cuenta.\n\n` +
    `Empresa: ${empresa.nombre}\n` +
    `Correo: ${personal.email}\n` +
    `Módulos: ${sistemasLabel}`
  )

  return (
    <div className={s.exitoWrap}>
      <div className={s.exitoIcono}><ion-icon name="checkmark-circle-outline" /></div>
      <div className={s.exitoTextos}>
        <h2 className={s.exitoTitle}>¡Registro completado!</h2>
        <p className={s.exitoSub}>Tu cuenta fue creada. Un asesor la activará manualmente en breve.</p>
      </div>

      <div className={s.credencialesCard}>
        <div className={s.credRow}>
          <ion-icon name="mail-outline" />
          <div className={s.credInfo}>
            <div className={s.credLabel}>Usuario</div>
            <div className={s.credVal}>{personal.email}</div>
          </div>
        </div>
        <div className={s.credDivider} />
        <div className={s.credRow}>
          <ion-icon name="key-outline" />
          <div className={s.credInfo}>
            <div className={s.credLabel}>Contraseña temporal</div>
            <div className={s.credVal}>{resultado?.password}</div>
          </div>
        </div>
      </div>

      <div className={s.googleVincularCard}>
        <div className={s.googleVincularHeader}>
          <div className={s.googleVincularIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div className={s.googleVincularTextos}>
            <span className={s.googleVincularTitle}>Vincular con Google</span>
            <span className={s.googleVincularSub}>Inicia sesión más rápido sin contraseña</span>
          </div>
          {googleEstado === "vinculado" && (
            <div className={s.googleVincularBadge}>
              <ion-icon name="checkmark-outline" />Vinculado
            </div>
          )}
        </div>

        {googleEstado === "correoDistinto" ? (
          <div className={s.avisoCorreoDistinto}>
            <ion-icon name="information-circle-outline" />
            <div>
              <strong>El correo de Google no coincide con tu correo creado en paso 1.</strong> Podrás vincularlo desde tu perfil una vez que un asesor active tu cuenta. También puedes actualizar tu correo desde el perfil y luego vincular Google.
            </div>
          </div>
        ) : googleEstado === "vinculado" ? (
          <div className={s.googleVincularExito}>
            <ion-icon name="checkmark-circle-outline" />
            Cuenta vinculada. Podrás iniciar sesión con Google o con tu contraseña.
          </div>
        ) : (
          <button
            type="button"
            className={`${s.btnGoogle} ${googleEstado === "error" ? s.btnGoogleError : ""}`}
            onClick={triggerGoogle}
            disabled={googleEstado === "cargando" || !gsiListo}
          >
            {googleEstado === "cargando" ? (
              <span className={s.spinnerDark} />
            ) : googleEstado === "error" ? (
              <><ion-icon name="alert-circle-outline" />Error al vincular, intenta de nuevo</>
            ) : (
              <><ion-icon name="link-outline" />Vincular mi cuenta de Google</>
            )}
          </button>
        )}

        <p className={s.googleVincularSkip}>Opcional — puedes hacerlo después desde tu perfil</p>
      </div>

      <div className={s.avisoActivacion}>
        <ion-icon name="time-outline" />
        <span>Tu cuenta está pendiente de activación. Te avisaremos por WhatsApp cuando esté lista.</span>
      </div>

      <a
        href={`https://wa.me/${waNum}?text=${msg}`}
        target="_blank" rel="noopener noreferrer"
        className={s.btnWa}
      >
        <ion-icon name="logo-whatsapp" />
        Solicitar activación por WhatsApp
      </a>
    </div>
  )
}

function Field({ label, icon, children }) {
  return (
    <div className={s.field}>
      <label className={s.label}>
        <ion-icon name={icon} />{label}
      </label>
      {children}
    </div>
  )
}