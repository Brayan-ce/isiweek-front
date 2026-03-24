"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Flag from "react-world-flags"
import TourGuia from "./extras/pasos/pasos"
import AltchaWidget from "@/_EXTRAS/Recapchat/AltchaWidget"
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

async function loginConEmail(email, password, altcha) {
  try {
    const res = await post("/api/auth/login", { email, password, altcha })
    if (res.error) return { error: res.error }
    localStorage.setItem("ambrysoft_token", res.token)
    return { ok: true, ruta: res.ruta, usuario: res.usuario }
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function loginConGoogle(idToken) {
  try {
    const res = await post("/api/auth/google", { idToken })
    if (res.error) return { error: res.error }
    localStorage.setItem("ambrysoft_token", res.token)
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
    localStorage.setItem("ambrysoft_token", res.token)
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

const FEATURES = [
  { icon: "storefront-outline", label: "POS Avanzado",     desc: "Ventas rapidas con caja integrada"  },
  { icon: "construct-outline",  label: "Gestion de Obras", desc: "Control de proyectos y asistencia"  },
  { icon: "card-outline",       label: "Cartera Creditos", desc: "Contratos, cuotas y mora"           },
  { icon: "bag-handle-outline", label: "Ventas Online",    desc: "Catalogo publico con pedidos"       },
]

const GSI_URL = "https://accounts.google.com/gsi/client"

export default function LoginPage() {
  const router = useRouter()

  const [tab, setTab]                       = useState("email")
  const [cargando, setCargando]             = useState(false)
  const [googleCargando, setGoogleCargando] = useState(false)
  const [alerta, setAlerta]                 = useState(null)
  const [verPass, setVerPass]               = useState(false)
  const [modal, setModal]                   = useState(null)
  const [hora, setHora]                     = useState("")
  const [countryInfo, setCountry]           = useState(null)
  const [otpEnviado, setOtpEnviado]         = useState(false)
  const [otpTimer, setOtpTimer]             = useState(0)
  const [config, setConfig]                 = useState({})
  const [loginOk, setLoginOk]               = useState(false)
  const [tourActivo, setTourActivo]         = useState(false)
  const [cartelAbierto, setCartelAbierto]   = useState(false)
  const [featurePopup, setFeaturePopup]     = useState(null)
  const [altchaPayload, setAltchaPayload]   = useState(null)
  const [altchaVerified, setAltchaVerified] = useState(false)
  const [gsiListo, setGsiListo]             = useState(false)

  const emailRef      = useRef()
  const passRef       = useRef()
  const otpEmailRef   = useRef()
  const otpCodigoRef  = useRef()
  const recoveryRef   = useRef()
  const timerRef      = useRef(null)
  const canvasRef     = useRef()
  const googleInitRef = useRef(false)
  const altchaRef     = useRef(null)

  const tourRefs = {
    tabs:   useRef(),
    email:  useRef(),
    google: useRef(),
    signup: useRef(),
  }

  const handleGoogleCallback = useCallback(async (response) => {
    setGoogleCargando(true)
    setAlerta(null)
    const res = await loginConGoogle(response.credential)
    setGoogleCargando(false)
    if (res.error) return setAlerta({ tipo: "error", msg: res.error })
    setLoginOk(true)
    setTimeout(() => router.push(res.ruta), 900)
  }, [router])

  const initGoogle = useCallback(() => {
    if (!window.google?.accounts?.id) return
    if (googleInitRef.current) return
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
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setCountry(getCountryFromTz(tz))
    const tick = () => setHora(new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    tick()
    const id = setInterval(tick, 1000)
    obtenerConfigSistema().then(d => setConfig(d))
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setAltchaPayload(null)
    setAltchaVerified(false)
  }, [tab])

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGoogle()
      return
    }
    const existing = document.querySelector(`script[src="${GSI_URL}"]`)
    if (existing) {
      existing.addEventListener("load", initGoogle)
      return () => existing.removeEventListener("load", initGoogle)
    }
    const script    = document.createElement("script")
    script.src      = GSI_URL
    script.async    = true
    script.defer    = true
    script.onload   = () => initGoogle()
    script.onerror  = () => console.warn("No se pudo cargar Google GSI")
    document.head.appendChild(script)
    return () => {
      script.onload  = null
      script.onerror = null
    }
  }, [initGoogle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight
    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
      r: Math.random() * 2 + 1,
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const isDk      = document.documentElement.getAttribute("data-theme") === "dark"
      const dotColor  = isDk ? "rgba(96,165,250,0.55)"  : "rgba(29,111,206,0.35)"
      const lineColor = isDk ? "rgba(96,165,250,0.12)"  : "rgba(29,111,206,0.10)"
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      })
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = lineColor
            ctx.lineWidth   = 1
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

  function resetAltcha() {
    setAltchaPayload(null)
    setAltchaVerified(false)
    altchaRef.current?.reset()
  }

  function triggerGoogle() {
    if (!gsiListo || !window.google?.accounts?.id) {
      return setAlerta({ tipo: "error", msg: "Google no disponible, recarga la pagina" })
    }
    setAlerta(null)
    window.google.accounts.id.prompt((notification) => {
      try {
        if (typeof notification.isNotDisplayed === "function" && notification.isNotDisplayed()) {
          setAlerta({ tipo: "error", msg: "Activa las cookies de terceros para iniciar con Google" })
        }
      } catch {}
    })
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    const email    = emailRef.current.value.trim().toLowerCase()
    const password = passRef.current.value
    if (!email || !password) return setAlerta({ tipo: "error", msg: "Completa todos los campos" })
    if (!altchaVerified || !altchaPayload) return setAlerta({ tipo: "error", msg: "Completa la verificacion de seguridad" })
    setCargando(true)
    setAlerta(null)
    const res = await loginConEmail(email, password, altchaPayload)
    setCargando(false)
    if (res.error) {
      resetAltcha()
      return setAlerta({ tipo: "error", msg: res.error })
    }
    setLoginOk(true)
    setTimeout(() => router.push(res.ruta), 900)
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
    setLoginOk(true)
    setTimeout(() => router.push(res.ruta), 900)
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    const email = recoveryRef.current.value.trim().toLowerCase()
    await enviarCodigoOTP(email)
    setModal(null)
    setAlerta({ tipo: "ok", msg: "Si el correo existe, recibiras un codigo" })
  }

  const waNumero      = config.whatsapp_numero ?? "18494324597"
  const waMensaje     = encodeURIComponent(config.whatsapp_mensaje ?? "Hola, necesito soporte con IsiWeek")
  const waUrl         = `https://wa.me/${waNumero}?text=${waMensaje}`
  const sistemaNombre = config.sistema_nombre ?? "IsiWeek"

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.canvas} />

      <div className={s.layout}>

        <div className={s.hero}>
          <div className={s.heroInner}>
            <div className={s.heroCenterContent}>
              <h1 className={s.heroTitle}>
                Gestiona tu empresa<br />
                <span className={s.heroTitleAccent}>desde cualquier lugar</span>
              </h1>
              <p className={s.heroSub}>
                Multi empresa con POS, obras, creditos y ventas online. Todo en uno.
              </p>
              <div className={s.features}>
                {FEATURES.map(f => (
                  <div key={f.label} className={s.featureCard} onClick={() => setFeaturePopup(f)}>
                    <div className={s.featureCardIcon}><ion-icon name={f.icon} /></div>
                    <div className={s.featureCardBody}>
                      <span className={s.featureCardLabel}>{f.label}</span>
                      <span className={s.featureCardDesc}>{f.desc}</span>
                    </div>
                    <div className={s.featureCardArrow}><ion-icon name="chevron-forward-outline" /></div>
                  </div>
                ))}
              </div>
              {countryInfo && (
                <div className={s.countryBar}>
                  <Flag code={countryInfo.cc} className={s.flag} fallback={<span>{countryInfo.cc}</span>} />
                  <span className={s.countryName}>{countryInfo.nombre}</span>
                  <span className={s.countrySep}>·</span>
                  <span className={s.countryCurrency}>{countryInfo.codigo} {countryInfo.moneda}</span>
                  <span className={s.countrySep}>·</span>
                  <span className={s.clockVal}>{hora}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={s.formSide}>

          <div className={s.infoCartel}>
            <button className={s.infoCartelToggle} onClick={() => setCartelAbierto(p => !p)} type="button">
              <div className={s.infoCartelToggleLeft}>
                <div className={s.infoCartelToggleIconWrap}><ion-icon name="grid-outline" /></div>
                <div className={s.infoCartelToggleTexts}>
                  <span className={s.infoCartelToggleTitle}>{sistemaNombre}</span>
                  <span className={s.infoCartelToggleHint}>Ver que incluye el sistema</span>
                </div>
              </div>
              <ion-icon name={cartelAbierto ? "chevron-up-outline" : "chevron-down-outline"} class={s.infoCartelToggleArrow} />
            </button>
            <div className={`${s.infoCartelBody} ${cartelAbierto ? s.infoCartelBodyOpen : ""}`}>
              <div className={s.infoCartelInner}>
                <h2 className={s.infoCartelTitle}>
                  Gestiona tu empresa<br />
                  <span className={s.infoCartelTitleAccent}>desde cualquier lugar</span>
                </h2>
                <p className={s.infoCartelSub}>Multi empresa con POS, obras, creditos y ventas online. Todo en uno.</p>
                <div className={s.infoCartelFeatures}>
                  {FEATURES.map(f => (
                    <div key={f.label} className={s.infoCartelFeatureRow} onClick={() => setFeaturePopup(f)}>
                      <div className={s.infoCartelFeatureIcon}><ion-icon name={f.icon} /></div>
                      <div className={s.infoCartelFeatureTexts}>
                        <span className={s.infoCartelFeatureLabel}>{f.label}</span>
                        <span className={s.infoCartelFeatureDesc}>{f.desc}</span>
                      </div>
                      <button type="button" className={s.infoCartelFeatureArrow} onClick={() => setFeaturePopup(f)}>
                        <ion-icon name="chevron-forward-outline" />
                      </button>
                    </div>
                  ))}
                </div>
                {countryInfo && (
                  <div className={s.infoCartelCountry}>
                    <Flag code={countryInfo.cc} className={s.flag} fallback={<span>{countryInfo.cc}</span>} />
                    <span>{countryInfo.nombre}</span>
                    <span className={s.countrySep}>·</span>
                    <span>{countryInfo.codigo} {countryInfo.moneda}</span>
                    <span className={s.countrySep}>·</span>
                    <span>{hora}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`${s.card} ${loginOk ? s.cardOk : ""}`}>
            {loginOk ? (
              <div className={s.successState}>
                <div className={s.successCircle}><ion-icon name="checkmark-outline" /></div>
                <p className={s.successMsg}>Bienvenido</p>
              </div>
            ) : (
              <>
                <div ref={tourRefs.tabs} className={s.tabs}>
                  <button
                    className={`${s.tab}${tab === "email" ? " " + s.tabActive : ""}`}
                    onClick={() => { setTab("email"); setAlerta(null) }}
                  >
                    <ion-icon name="mail-outline" /> Correo
                  </button>
                  <button
                    className={`${s.tab}${tab === "otp" ? " " + s.tabActive : ""}`}
                    onClick={() => { setTab("otp"); setAlerta(null) }}
                  >
                    <ion-icon name="key-outline" /> Codigo OTP
                  </button>
                </div>

                {alerta && (
                  <div className={`${s.alert} ${alerta.tipo === "error" ? s.alertError : s.alertSuccess}`}>
                    <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
                    {alerta.msg}
                  </div>
                )}

                {tab === "email" && (
                  <form ref={tourRefs.email} className={s.form} onSubmit={handleEmailLogin} noValidate>
                    <div className={s.field}>
                      <label className={s.label}>Correo electronico</label>
                      <div className={s.inputWrap}>
                        <ion-icon name="mail-outline" class={s.inputIcon} />
                        <input ref={emailRef} type="email" placeholder="tu@correo.com" className={s.input} required autoComplete="email" />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Contrasena</label>
                      <div className={s.inputWrap}>
                        <ion-icon name="lock-closed-outline" class={s.inputIcon} />
                        <input ref={passRef} type={verPass ? "text" : "password"} placeholder="••••••••" className={s.input} required autoComplete="current-password" />
                        <button type="button" className={s.eyeBtn} onClick={() => setVerPass(p => !p)}>
                          <ion-icon name={verPass ? "eye-off-outline" : "eye-outline"} />
                        </button>
                      </div>
                    </div>
                    <div className={s.rememberRow}>
                      <label className={s.checkLabel}>
                        <input type="checkbox" className={s.checkbox} /> Recuerdame
                      </label>
                      <button type="button" className={s.forgotLink} onClick={() => setModal("forgot")}>
                        Olvide mi contrasena
                      </button>
                    </div>

                    <AltchaWidget
                      ref={altchaRef}
                      onVerified={(payload) => {
                        setAltchaPayload(payload)
                        setAltchaVerified(true)
                      }}
                      onReset={() => {
                        setAltchaPayload(null)
                        setAltchaVerified(false)
                      }}
                    />

                    <button type="submit" className={s.submitBtn} disabled={cargando || !altchaVerified}>
                      {cargando
                        ? <span className={s.spinner} />
                        : <><ion-icon name="log-in-outline" />Ingresar</>
                      }
                    </button>
                  </form>
                )}

                {tab === "otp" && (
                  <form className={s.form} onSubmit={otpEnviado ? handleVerificarOTP : handleEnviarOTP} noValidate>
                    <div className={s.field}>
                      <label className={s.label}>Correo electronico</label>
                      <div className={s.inputWrap}>
                        <ion-icon name="mail-outline" class={s.inputIcon} />
                        <input ref={otpEmailRef} type="email" placeholder="tu@correo.com" className={s.input} required autoComplete="email" disabled={otpEnviado} />
                      </div>
                    </div>
                    {otpEnviado && (
                      <div className={s.field}>
                        <label className={s.label}>Codigo de 6 digitos</label>
                        <div className={s.otpRow}>
                          <input ref={otpCodigoRef} type="text" maxLength={6} placeholder="000000" className={s.otpInput} inputMode="numeric" autoComplete="one-time-code" />
                          <button type="button" className={s.resendBtn} disabled={otpTimer > 0 || cargando} onClick={handleEnviarOTP}>
                            {otpTimer > 0 ? `${otpTimer}s` : <><ion-icon name="refresh-outline" />Reenviar</>}
                          </button>
                        </div>
                      </div>
                    )}
                    <button type="submit" className={s.submitBtn} disabled={cargando}>
                      {cargando
                        ? <span className={s.spinner} />
                        : otpEnviado
                          ? <><ion-icon name="checkmark-circle-outline" />Verificar Codigo</>
                          : <><ion-icon name="send-outline" />Enviar Codigo</>
                      }
                    </button>
                  </form>
                )}

                <div className={s.divider}><span>O continua con</span></div>

                <button
                  ref={tourRefs.google}
                  className={s.googleBtn}
                  onClick={triggerGoogle}
                  disabled={googleCargando || !gsiListo}
                  type="button"
                >
                  {googleCargando ? (
                    <span className={s.spinner} style={{ borderTopColor: "#4285F4" }} />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {!gsiListo ? "Cargando Google..." : "Continuar con Google"}
                    </>
                  )}
                </button>

                <p ref={tourRefs.signup} className={s.signupText}>
                  Sin cuenta?{" "}
                  <Link href="/registrar" className={s.signupLink}>Registrate aqui</Link>
                </p>

                <button className={s.tourBtn} onClick={() => setTourActivo(true)}>
                  <ion-icon name="help-circle-outline" /> Como funciona?
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal}>
            <button className={s.closeBtn} onClick={() => setModal(null)}><ion-icon name="close-outline" /></button>
            {modal === "forgot" && (
              <>
                <div className={s.modalTitle}>Recuperar contrasena</div>
                <form className={s.form} onSubmit={handleRecuperar}>
                  <div className={s.field}>
                    <label className={s.label}>Tu correo registrado</label>
                    <div className={s.inputWrap}>
                      <ion-icon name="mail-outline" class={s.inputIcon} />
                      <input ref={recoveryRef} type="email" placeholder="tu@correo.com" className={s.input} required />
                    </div>
                  </div>
                  <button type="submit" className={s.submitBtn}>
                    <ion-icon name="send-outline" />Enviar Codigo
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <Link href={waUrl} target="_blank" rel="noopener noreferrer" className={s.waBtn}>
        <ion-icon name="logo-whatsapp" />
      </Link>

      {tourActivo && (
        <TourGuia anchorRefs={tourRefs} onClose={() => setTourActivo(false)} />
      )}

      {featurePopup && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setFeaturePopup(null)}>
          <div className={s.featureModal}>
            <div className={s.featureModalHeader}>
              <div className={s.featureModalIconWrap}><ion-icon name={featurePopup.icon} /></div>
              <div className={s.featureModalTitles}>
                <span className={s.featureModalTitle}>{featurePopup.label}</span>
                <span className={s.featureModalDesc}>{featurePopup.desc}</span>
              </div>
              <button className={s.closeBtn} onClick={() => setFeaturePopup(null)} type="button">
                <ion-icon name="close-outline" />
              </button>
            </div>
            <div className={s.featureModalBody} />
          </div>
        </div>
      )}
    </div>
  )
}