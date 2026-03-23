"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Flag from "react-world-flags"
import { Country } from "country-state-city"
import s from "./LangSelector.module.css"

const CHUNK = 30

const PAIS_IDIOMA = {
  DO:"es",MX:"es",ES:"es",AR:"es",CO:"es",CL:"es",PE:"es",VE:"es",
  EC:"es",GT:"es",CU:"es",BO:"es",HN:"es",PY:"es",SV:"es",NI:"es",
  CR:"es",PA:"es",UY:"es",GQ:"es",
  BR:"pt",PT:"pt",AO:"pt",MZ:"pt",CV:"pt",
  FR:"fr",BE:"fr",CH:"fr",SN:"fr",CI:"fr",ML:"fr",BF:"fr",NE:"fr",
  TG:"fr",BJ:"fr",GN:"fr",CD:"fr",CG:"fr",CM:"fr",GA:"fr",HT:"fr",
  SA:"ar",AE:"ar",EG:"ar",IQ:"ar",SY:"ar",JO:"ar",LB:"ar",KW:"ar",
  QA:"ar",BH:"ar",OM:"ar",YE:"ar",LY:"ar",TN:"ar",DZ:"ar",MA:"ar",
  CN:"zh",TW:"zh",HK:"zh",
  RU:"ru",BY:"ru",KZ:"ru",
  DE:"de",AT:"de",
  JP:"ja",KR:"ko",IN:"hi",IT:"it",NL:"nl",PL:"pl",TR:"tr",
  VN:"vi",TH:"th",ID:"id",MY:"ms",SE:"sv",NO:"no",DK:"da",
  FI:"fi",GR:"el",IL:"he",IR:"fa",UA:"uk",RO:"ro",
  HU:"hu",CZ:"cs",PH:"fil",KE:"sw",TZ:"sw",BD:"bn",PK:"ur",
}

const TZ_PAIS = {
  "America/Santo_Domingo":"DO","America/New_York":"US","America/Chicago":"US",
  "America/Denver":"US","America/Los_Angeles":"US","America/Bogota":"CO",
  "America/Santiago":"CL","America/Lima":"PE","America/Mexico_City":"MX",
  "America/Argentina/Buenos_Aires":"AR","America/Sao_Paulo":"BR",
  "America/Caracas":"VE","America/La_Paz":"BO","America/Guayaquil":"EC",
  "America/Asuncion":"PY","America/Montevideo":"UY","America/Havana":"CU",
  "America/Port-au-Prince":"HT","America/Guatemala":"GT","America/Tegucigalpa":"HN",
  "America/Managua":"NI","America/Costa_Rica":"CR","America/Panama":"PA",
  "America/El_Salvador":"SV","America/Toronto":"CA","America/Vancouver":"CA",
  "America/Jamaica":"JM",
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
  "Asia/Dhaka":"BD","Asia/Tehran":"IR","Asia/Baghdad":"IQ",
  "Asia/Kuwait":"KW","Asia/Beirut":"LB","Asia/Jerusalem":"IL",
  "Asia/Taipei":"TW","Asia/Hong_Kong":"HK",
  "Africa/Cairo":"EG","Africa/Lagos":"NG","Africa/Johannesburg":"ZA",
  "Africa/Nairobi":"KE","Africa/Casablanca":"MA","Africa/Dakar":"SN",
  "Pacific/Auckland":"NZ","Australia/Sydney":"AU",
}

function detectarPais() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_PAIS[tz] ?? "US"
  } catch { return "US" }
}

export default function LangSelector() {
  const [pais, setPaisState]    = useState(null)
  const paises                  = useMemo(() => Country.getAllCountries(), [])
  const [abierto, setAbierto]   = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [visible, setVisible]   = useState(CHUNK)
  const ref      = useRef()
  const inputRef = useRef()
  const listRef  = useRef()

  useEffect(() => {
    const saved = localStorage.getItem("isiweek_pais")
    if (saved) {
      setPaisState(saved)
    } else {
      const detectado = detectarPais()
      setPaisState(detectado)
      localStorage.setItem("isiweek_pais", detectado)
    }
  }, [])

  function setPais(codigo) {
    setPaisState(codigo)
    localStorage.setItem("isiweek_pais", codigo)
  }

  const actual = useMemo(
    () => paises.find(p => p.isoCode === pais) ?? null,
    [paises, pais]
  )

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return paises
    return paises.filter(p =>
      p.name.toLowerCase().includes(q) || p.isoCode.toLowerCase().includes(q)
    )
  }, [paises, busqueda])

  const mostrados = filtrados.slice(0, visible)

  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40)
      setVisible(v => Math.min(v + CHUNK, filtrados.length))
  }, [filtrados.length])

  useEffect(() => {
    function onClickOut(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false)
        setBusqueda("")
        setVisible(CHUNK)
      }
    }
    document.addEventListener("mousedown", onClickOut)
    return () => document.removeEventListener("mousedown", onClickOut)
  }, [])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 60)
    setVisible(CHUNK)
  }, [abierto])

  useEffect(() => {
    setVisible(CHUNK)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [busqueda])

  function seleccionar(codigo) {
    setPais(codigo)
    setAbierto(false)
    setBusqueda("")
    setVisible(CHUNK)
  }

  if (!pais) return null

  return (
    <div className={s.wrap} ref={ref}>
      <button
        type="button"
        className={`${s.trigger} ${abierto ? s.triggerOpen : ""}`}
        onClick={() => setAbierto(p => !p)}
        title="Cambiar país"
      >
        {actual
          ? <Flag code={actual.isoCode} className={s.flag} fallback={<ion-icon name="globe-outline" class={s.globeIcon} />} />
          : <ion-icon name="globe-outline" class={s.globeIcon} />
        }
        <span className={s.codigo}>{actual?.isoCode ?? "..."}</span>
        <ion-icon name="chevron-down-outline" class={s.chevron} style={{ transform: abierto ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {abierto && (
        <div className={s.dropdown}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" class={s.searchIcon} />
            <input
              ref={inputRef}
              className={s.searchInput}
              placeholder="Buscar país..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button type="button" className={s.clearBtn} onClick={() => setBusqueda("")}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>

          <div className={s.list} ref={listRef} onScroll={onScroll}>
            {mostrados.length === 0 && <div className={s.vacio}>Sin resultados</div>}
            {mostrados.map(p => (
              <button
                key={p.isoCode}
                type="button"
                className={`${s.item} ${p.isoCode === pais ? s.itemActive : ""}`}
                onClick={() => seleccionar(p.isoCode)}
              >
                <Flag code={p.isoCode} className={s.flagItem} fallback={<span className={s.flagFallback}>{p.isoCode}</span>} />
                <span className={s.nombre}>{p.flag} {p.name}</span>
                {p.isoCode === pais && <ion-icon name="checkmark-outline" class={s.check} />}
              </button>
            ))}
            {visible < filtrados.length && (
              <div className={s.loadingMore}>
                <span className={s.loadingDot} />
                <span className={s.loadingDot} />
                <span className={s.loadingDot} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}