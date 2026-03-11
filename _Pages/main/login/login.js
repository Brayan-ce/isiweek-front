"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Flag from "react-world-flags"
import {
  Sun, Moon, Eye, EyeOff, Mail, Lock, KeyRound,
  RefreshCw, LogIn, Send, CheckCircle, MessageCircle,
  ChevronDown, ChevronUp, X
} from "lucide-react"
import s from "./login.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function obtenerConfigSistema() {
  try {
    const res = await fetch(`${API}/api/auth/config`)
    if (!res.ok) return {}
    return await res.json()
  } catch { return {} }
}

async function loginConEmail(email, password) {
  try {
    const res = await post("/api/auth/login", { email, password })
    if (res.error) return { error: res.error }
    localStorage.setItem("isiweek_token", res.token)
    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function loginConGoogle(idToken) {
  try {
    const res = await post("/api/auth/google", { idToken })
    if (res.error) return { error: res.error }
    localStorage.setItem("isiweek_token", res.token)
    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function enviarCodigoOTP(email) {
  try {
    const res = await post("/api/auth/otp/enviar", { email })
    if (res.error) return { error: res.error }
    return { ok: true }
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function verificarCodigoOTP(email, codigo) {
  try {
    const res = await post("/api/auth/otp/verificar", { email, codigo })
    if (res.error) return { error: res.error }
    localStorage.setItem("isiweek_token", res.token)
    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

const CURRENCY_MAP = {
  AD:"EUR",AE:"AED",AF:"AFN",AG:"XCD",AL:"ALL",AM:"AMD",AO:"AOA",AR:"ARS",
  AT:"EUR",AU:"AUD",AZ:"AZN",BA:"BAM",BB:"BBD",BD:"BDT",BE:"EUR",BF:"XOF",
  BG:"BGN",BH:"BHD",BI:"BIF",BJ:"XOF",BN:"BND",BO:"BOB",BR:"BRL",BS:"BSD",
  BT:"BTN",BW:"BWP",BY:"BYN",BZ:"BZD",CA:"CAD",CD:"CDF",CF:"XAF",CG:"XAF",
  CH:"CHF",CI:"XOF",CL:"CLP",CM:"XAF",CN:"CNY",CO:"COP",CR:"CRC",CU:"CUP",
  CV:"CVE",CY:"EUR",CZ:"CZK",DE:"EUR",DJ:"DJF",DK:"DKK",DO:"DOP",DZ:"DZD",
  EC:"USD",EE:"EUR",EG:"EGP",ER:"ERN",ES:"EUR",ET:"ETB",FI:"EUR",FJ:"FJD",
  FR:"EUR",GA:"XAF",GB:"GBP",GD:"XCD",GE:"GEL",GH:"GHS",GM:"GMD",GN:"GNF",
  GQ:"XAF",GR:"EUR",GT:"GTQ",GW:"XOF",GY:"GYD",HN:"HNL",HR:"EUR",HT:"HTG",
  HU:"HUF",ID:"IDR",IE:"EUR",IL:"ILS",IN:"INR",IQ:"IQD",IR:"IRR",IS:"ISK",
  IT:"EUR",JM:"JMD",JO:"JOD",JP:"JPY",KE:"KES",KG:"KGS",KH:"KHR",KI:"AUD",
  KM:"KMF",KN:"XCD",KP:"KPW",KR:"KRW",KW:"KWD",KZ:"KZT",LA:"LAK",LB:"LBP",
  LC:"XCD",LI:"CHF",LK:"LKR",LR:"LRD",LS:"LSL",LT:"EUR",LU:"EUR",LV:"EUR",
  LY:"LYD",MA:"MAD",MC:"EUR",MD:"MDL",ME:"EUR",MG:"MGA",MK:"MKD",ML:"XOF",
  MM:"MMK",MN:"MNT",MR:"MRU",MT:"EUR",MU:"MUR",MV:"MVR",MW:"MWK",MX:"MXN",
  MY:"MYR",MZ:"MZN",NA:"NAD",NE:"XOF",NG:"NGN",NI:"NIO",NL:"EUR",NO:"NOK",
  NP:"NPR",NR:"AUD",NZ:"NZD",OM:"OMR",PA:"PAB",PE:"PEN",PG:"PGK",PH:"PHP",
  PK:"PKR",PL:"PLN",PT:"EUR",PW:"USD",PY:"PYG",QA:"QAR",RO:"RON",RS:"RSD",
  RU:"RUB",RW:"RWF",SA:"SAR",SB:"SBD",SC:"SCR",SD:"SDG",SE:"SEK",SG:"SGD",
  SI:"EUR",SK:"EUR",SL:"SLL",SM:"EUR",SN:"XOF",SO:"SOS",SR:"SRD",SS:"SSP",
  ST:"STN",SV:"USD",SY:"SYP",SZ:"SZL",TD:"XAF",TG:"XOF",TH:"THB",TJ:"TJS",
  TL:"USD",TM:"TMT",TN:"TND",TO:"TOP",TR:"TRY",TT:"TTD",TV:"AUD",TZ:"TZS",
  UA:"UAH",UG:"UGX",US:"USD",UY:"UYU",UZ:"UZS",VA:"EUR",VC:"XCD",VE:"VES",
  VN:"VND",VU:"VUV",WS:"WST",YE:"YER",ZA:"ZAR",ZM:"ZMW",ZW:"ZWL",
}

const CURRENCY_SYMBOL = {
  USD:"$",EUR:"€",GBP:"£",JPY:"¥",CNY:"¥",BRL:"R$",MXN:"$",ARS:"$",
  COP:"$",CLP:"CLP$",PEN:"S/",DOP:"RD$",CRC:"₡",HNL:"L",GTQ:"Q",
  PYG:"₲",BOB:"Bs",UYU:"$U",VES:"Bs.S",NIO:"C$",CUP:"₱",PAB:"B/.",
  INR:"₹",PKR:"₨",BDT:"৳",LKR:"₨",NPR:"₨",MMK:"K",THB:"฿",VND:"₫",
  IDR:"Rp",PHP:"₱",MYR:"RM",SGD:"S$",KRW:"₩",TWD:"NT$",HKD:"HK$",
  AUD:"A$",NZD:"NZ$",CAD:"CA$",CHF:"Fr",NOK:"kr",SEK:"kr",DKK:"kr",
  PLN:"zł",CZK:"Kč",HUF:"Ft",RON:"lei",BGN:"лв",RUB:"₽",UAH:"₴",
  TRY:"₺",ILS:"₪",SAR:"﷼",AED:"د.إ",KWD:"د.ك",QAR:"﷼",BHD:".د.ب",
  EGP:"£",MAD:"د.م.",ZAR:"R",NGN:"₦",KES:"KSh",GHS:"₵",
}

function getCountryFromTz(tz) {
  try {
    const tzToCountry = {
      "America/Santo_Domingo":"DO","America/New_York":"US","America/Chicago":"US",
      "America/Denver":"US","America/Los_Angeles":"US","America/Bogota":"CO",
      "America/Santiago":"CL","America/Lima":"PE","America/Mexico_City":"MX",
      "America/Argentina/Buenos_Aires":"AR","America/Sao_Paulo":"BR",
      "America/Caracas":"VE","America/La_Paz":"BO","America/Guayaquil":"EC",
      "America/Asuncion":"PY","America/Montevideo":"UY","America/Havana":"CU",
      "America/Port-au-Prince":"HT","America/Guatemala":"GT","America/Tegucigalpa":"HN",
      "America/Managua":"NI","America/Costa_Rica":"CR","America/Panama":"PA",
      "America/El_Salvador":"SV","America/Toronto":"CA","America/Vancouver":"CA",
      "America/Halifax":"CA","America/Jamaica":"JM","America/Nassau":"BS",
      "Europe/Madrid":"ES","Europe/London":"GB","Europe/Paris":"FR",
      "Europe/Berlin":"DE","Europe/Rome":"IT","Europe/Lisbon":"PT",
      "Europe/Amsterdam":"NL","Europe/Brussels":"BE","Europe/Vienna":"AT",
      "Europe/Warsaw":"PL","Europe/Budapest":"HU","Europe/Prague":"CZ",
      "Europe/Bucharest":"RO","Europe/Sofia":"BG","Europe/Athens":"GR",
      "Europe/Stockholm":"SE","Europe/Oslo":"NO","Europe/Copenhagen":"DK",
      "Europe/Helsinki":"FI","Europe/Dublin":"IE","Europe/Zurich":"CH",
      "Europe/Moscow":"RU","Europe/Kiev":"UA","Europe/Istanbul":"TR",
      "Asia/Tokyo":"JP","Asia/Shanghai":"CN","Asia/Kolkata":"IN",
      "Asia/Dubai":"AE","Asia/Riyadh":"SA","Asia/Seoul":"KR",
      "Asia/Singapore":"SG","Asia/Bangkok":"TH","Asia/Jakarta":"ID",
      "Asia/Manila":"PH","Asia/Kuala_Lumpur":"MY","Asia/Karachi":"PK",
      "Asia/Dhaka":"BD","Asia/Colombo":"LK","Asia/Kathmandu":"NP",
      "Asia/Tehran":"IR","Asia/Baghdad":"IQ","Asia/Kuwait":"KW",
      "Asia/Qatar":"QA","Asia/Bahrain":"BH","Asia/Beirut":"LB",
      "Asia/Jerusalem":"IL","Asia/Taipei":"TW","Asia/Hong_Kong":"HK",
      "Africa/Cairo":"EG","Africa/Lagos":"NG","Africa/Johannesburg":"ZA",
      "Africa/Nairobi":"KE","Africa/Casablanca":"MA","Africa/Accra":"GH",
      "Pacific/Auckland":"NZ","Pacific/Sydney":"AU","Pacific/Honolulu":"US",
      "Australia/Sydney":"AU","Australia/Melbourne":"AU","Australia/Perth":"AU",
    }
    const cc       = tzToCountry[tz] ?? "DO"
    const currency = CURRENCY_MAP[cc] ?? "USD"
    const symbol   = CURRENCY_SYMBOL[currency] ?? currency
    const nameEs   = new Intl.DisplayNames(["es"], { type: "region" }).of(cc) ?? cc
    return { cc, nombre: nameEs, moneda: symbol, codigo: currency }
  } catch {
    return { cc: "DO", nombre: "Republica Dominicana", moneda: "RD$", codigo: "DOP" }
  }
}

export default function LoginPage() {
  const router = useRouter()

  const [dark, setDark]                     = useState(false)
  const [tab, setTab]                       = useState("email")
  const [cargando, setCargando]             = useState(false)
  const [googleCargando, setGoogleCargando] = useState(false)
  const [alerta, setAlerta]                 = useState(null)
  const [verPass, setVerPass]               = useState(false)
  const [modal, setModal]                   = useState(null)
  const [footerOn, setFooterOn]             = useState(true)
  const [hora, setHora]                     = useState("")
  const [countryInfo, setCountry]           = useState(null)
  const [otpEnviado, setOtpEnviado]         = useState(false)
  const [otpTimer, setOtpTimer]             = useState(0)
  const [config, setConfig]                 = useState({})

  const emailRef     = useRef()
  const passRef      = useRef()
  const otpEmailRef  = useRef()
  const otpCodigoRef = useRef()
  const recoveryRef  = useRef()
  const timerRef     = useRef(null)

  useEffect(() => {
    const saved       = localStorage.getItem("isiweek_theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark      = saved === "dark" || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
    setFooterOn(localStorage.getItem("isiweek_footer") !== "0")
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setCountry(getCountryFromTz(tz))
    const tick = () => setHora(new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    tick()
    const id = setInterval(tick, 1000)
    obtenerConfigSistema().then(setConfig)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (otpTimer <= 0) return
    timerRef.current = setInterval(() => {
      setOtpTimer(p => {
        if (p <= 1) { clearInterval(timerRef.current); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [otpTimer])

  const initGoogle = useCallback(() => {
    if (!window.google || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      ux_mode: "popup",
    })
  }, [])

  useEffect(() => {
    if (window.google) { initGoogle(); return }
    const script  = document.createElement("script")
    script.src    = "https://accounts.google.com/gsi/client"
    script.async  = true
    script.defer  = true
    script.onload = initGoogle
    document.head.appendChild(script)
  }, [initGoogle])

  async function handleGoogleCallback(response) {
    setGoogleCargando(true)
    setAlerta(null)
    const res = await loginConGoogle(response.credential)
    setGoogleCargando(false)
    if (res.error) return setAlerta({ tipo: "error", msg: res.error })
    setAlerta({ tipo: "ok", msg: "Bienvenido " + res.usuario.nombre })
    setTimeout(() => router.push(res.ruta), 800)
  }

  function triggerGoogle() {
    if (!window.google) return setAlerta({ tipo: "error", msg: "Google no disponible, recarga la pagina" })
    window.google.accounts.id.prompt()
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    const email    = emailRef.current.value.trim().toLowerCase()
    const password = passRef.current.value
    if (!email || !password) return setAlerta({ tipo: "error", msg: "Completa todos los campos" })
    setCargando(true)
    setAlerta(null)
    const res = await loginConEmail(email, password)
    setCargando(false)
    if (res.error) return setAlerta({ tipo: "error", msg: res.error })
    setAlerta({ tipo: "ok", msg: "Bienvenido " + res.usuario.nombre })
    setTimeout(() => router.push(res.ruta), 800)
  }

  async function handleEnviarOTP(e) {
    e?.preventDefault()
    const email = otpEmailRef.current?.value.trim().toLowerCase()
    if (!email) return setAlerta({ tipo: "error", msg: "Ingresa tu correo" })
    setCargando(true)
    setAlerta(null)
    const res = await enviarCodigoOTP(email)
    setCargando(false)
    if (res.error) return setAlerta({ tipo: "error", msg: res.error })
    setOtpEnviado(true)
    setOtpTimer(120)
    setAlerta({ tipo: "ok", msg: "Codigo enviado a tu correo" })
  }

  async function handleVerificarOTP(e) {
    e.preventDefault()
    const email  = otpEmailRef.current?.value.trim().toLowerCase()
    const codigo = otpCodigoRef.current?.value.trim()
    if (!codigo) return setAlerta({ tipo: "error", msg: "Ingresa el codigo" })
    setCargando(true)
    setAlerta(null)
    const res = await verificarCodigoOTP(email, codigo)
    setCargando(false)
    if (res.error) return setAlerta({ tipo: "error", msg: res.error })
    setAlerta({ tipo: "ok", msg: "Bienvenido " + res.usuario.nombre })
    setTimeout(() => router.push(res.ruta), 800)
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    const email = recoveryRef.current.value.trim().toLowerCase()
    await enviarCodigoOTP(email)
    setModal(null)
    setAlerta({ tipo: "ok", msg: "Si el correo existe, recibiras un codigo" })
  }

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem("isiweek_theme", next ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
  }

  function toggleFooter() {
    setFooterOn(p => {
      localStorage.setItem("isiweek_footer", p ? "0" : "1")
      return !p
    })
  }

  const waNumero  = config.whatsapp_numero ?? "18494324597"
  const waMensaje = encodeURIComponent(config.whatsapp_mensaje ?? "Hola, necesito soporte con IsiWeek")
  const waUrl     = `https://wa.me/${waNumero}?text=${waMensaje}`

  return (
    <div className={s.page}>
      <div className={s.pageBg} />
      <div className={s.shapes}>
        <div className={`${s.shape} ${s.shapeA}`} />
        <div className={`${s.shape} ${s.shapeB}`} />
        <div className={`${s.shape} ${s.shapeC}`} />
      </div>

      <button className={s.themeBtn} onClick={toggleDark} aria-label="Cambiar tema" title={dark ? "Modo claro" : "Modo oscuro"}>
        {dark
          ? <Sun size={16} strokeWidth={2} className={s.themeBtnIcon} />
          : <Moon size={16} strokeWidth={2} className={s.themeBtnIcon} />
        }
      </button>

      <div className={s.container}>
        <div className={s.card}>
          <div className={s.header}>
            <div className={s.brand}>{config.sistema_nombre ?? "IsiWeek"}</div>
            <div className={s.subtitle}>Sistema Multi Empresa</div>
            <div className={s.dividerAccent} />
          </div>

          <div className={s.tabs}>
            {[{ id: "email", label: "Correo", icon: <Mail size={13} /> }, { id: "otp", label: "Codigo OTP", icon: <KeyRound size={13} /> }].map(t => (
              <button
                key={t.id}
                className={`${s.tab}${tab === t.id ? " " + s.tabActive : ""}`}
                onClick={() => { setTab(t.id); setAlerta(null) }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {alerta && (
            <div className={`${s.alert} ${alerta.tipo === "error" ? s.alertError : s.alertSuccess}`}>
              {alerta.msg}
            </div>
          )}

          {tab === "email" && (
            <form className={s.form} onSubmit={handleEmailLogin} noValidate>
              <div className={s.field}>
                <label className={s.label}>Correo Electronico</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Mail size={15} /></span>
                  <input ref={emailRef} type="email" placeholder="tu@correo.com" className={s.input} required autoComplete="email" />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Contrasena</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Lock size={15} /></span>
                  <input ref={passRef} type={verPass ? "text" : "password"} placeholder="••••••••" className={s.input} required autoComplete="current-password" />
                  <button type="button" className={s.eyeBtn} onClick={() => setVerPass(p => !p)}>
                    {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className={s.rememberRow}>
                <label className={s.checkLabel}>
                  <input type="checkbox" className={s.checkbox} />
                  Recuerdame
                </label>
                <button type="button" className={s.forgotLink} onClick={() => setModal("forgot")}>
                  Olvide mi contrasena
                </button>
              </div>
              <button type="submit" className={s.submitBtn} disabled={cargando}>
                {cargando ? <span className={s.spinner} /> : <><LogIn size={16} />Ingresar</>}
              </button>
            </form>
          )}

          {tab === "otp" && (
            <form className={s.form} onSubmit={otpEnviado ? handleVerificarOTP : handleEnviarOTP} noValidate>
              <div className={s.field}>
                <label className={s.label}>Correo Electronico</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Mail size={15} /></span>
                  <input ref={otpEmailRef} type="email" placeholder="tu@correo.com" className={s.input} required autoComplete="email" disabled={otpEnviado} />
                </div>
              </div>
              {otpEnviado && (
                <div className={s.field}>
                  <label className={s.label}>Codigo de 6 digitos</label>
                  <div className={s.otpRow}>
                    <input ref={otpCodigoRef} type="text" maxLength={6} placeholder="000000" className={s.otpInput} inputMode="numeric" autoComplete="one-time-code" />
                    <button type="button" className={s.sendOtpBtn} disabled={otpTimer > 0 || cargando} onClick={handleEnviarOTP}>
                      {otpTimer > 0 ? `${otpTimer}s` : <><RefreshCw size={13} />Reenviar</>}
                    </button>
                  </div>
                </div>
              )}
              <button type="submit" className={s.submitBtn} disabled={cargando}>
                {cargando
                  ? <span className={s.spinner} />
                  : otpEnviado
                    ? <><CheckCircle size={16} />Verificar Codigo</>
                    : <><Send size={16} />Enviar Codigo</>
                }
              </button>
            </form>
          )}

          <div className={s.dividerText}>O continua con</div>

          <button className={s.googleBtnCustom} onClick={triggerGoogle} disabled={googleCargando} type="button">
            {googleCargando ? <span className={s.spinner} style={{ borderTopColor: "#4285F4" }} /> : (
              <>
                <svg className={s.googleLogo} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <div className={s.signupText}>
            No tienes cuenta?{" "}
            <button className={s.signupLink} onClick={() => setModal("signup")}>Registrate aqui</button>
          </div>
        </div>
      </div>

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal}>
            <button className={s.closeBtn} onClick={() => setModal(null)}><X size={18} /></button>
            {modal === "forgot" && (
              <>
                <div className={s.modalTitle}>Recuperar Contrasena</div>
                <form className={s.form} onSubmit={handleRecuperar}>
                  <div className={s.field}>
                    <label className={s.label}>Tu correo registrado</label>
                    <div className={s.inputWrap}>
                      <span className={s.inputIcon}><Mail size={15} /></span>
                      <input ref={recoveryRef} type="email" placeholder="tu@correo.com" className={s.input} required />
                    </div>
                  </div>
                  <button type="submit" className={s.submitBtn}><Send size={16} />Enviar Codigo</button>
                </form>
              </>
            )}
            {modal === "signup" && (
              <>
                <div className={s.modalTitle}>Crear Cuenta</div>
                <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                  Para registrar tu empresa contacta al administrador o escribenos por WhatsApp.
                </p>
                <Link href={waUrl} target="_blank" rel="noopener noreferrer" className={s.submitBtn} style={{ display: "flex", textDecoration: "none" }}>
                  <MessageCircle size={16} />Contactar por WhatsApp
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {countryInfo && (
        <footer className={`${s.footer}${!footerOn ? " " + s.footerHidden : ""}`}>
          <div className={s.footerInner}>
            <div className={s.footerChip}>
              <Flag code={countryInfo.cc} className={s.footerFlag} fallback={<span>{countryInfo.cc}</span>} />
              <div>
                <div className={s.footerChipLabel}>{countryInfo.nombre}</div>
                <div className={s.footerChipSub}>{countryInfo.codigo} · {countryInfo.moneda}</div>
              </div>
            </div>
            <div className={s.footerChip}>
              <span className={s.footerTime}>{hora}</span>
            </div>
          </div>
        </footer>
      )}

      <button className={s.toggleFooterBtn} onClick={toggleFooter} title={footerOn ? "Ocultar barra" : "Mostrar barra"}>
        {footerOn ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <Link href={waUrl} target="_blank" rel="noopener noreferrer" className={s.whatsappBtn}>
        <ion-icon name="logo-whatsapp" />
      </Link>
    </div>
  )
}