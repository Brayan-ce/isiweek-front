"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { Country } from "country-state-city"

const I18nContext = createContext({ pais: "DO", setPais: () => {} })

const PAIS_IDIOMA = {
  // Español — Latinoamérica + España
  DO:"es", MX:"es", ES:"es", AR:"es", CO:"es", CL:"es", PE:"es", VE:"es",
  EC:"es", GT:"es", CU:"es", BO:"es", DO:"es", HN:"es", PY:"es", SV:"es",
  NI:"es", CR:"es", PA:"es", UY:"es", GQ:"es",

  // Portugués
  BR:"pt", PT:"pt", AO:"pt", MZ:"pt", CV:"pt", ST:"pt", GW:"pt", TL:"pt",

  // Francés
  FR:"fr", BE:"fr", CH:"fr", LU:"fr", MC:"fr", SN:"fr", CI:"fr", ML:"fr",
  BF:"fr", NE:"fr", TG:"fr", BJ:"fr", GN:"fr", CD:"fr", CG:"fr", CM:"fr",
  GA:"fr", CF:"fr", TD:"fr", DJ:"fr", KM:"fr", MG:"fr", RW:"fr", BI:"fr",
  MU:"fr", SC:"fr", HT:"fr",

  // Árabe
  SA:"ar", AE:"ar", EG:"ar", IQ:"ar", SY:"ar", JO:"ar", LB:"ar", KW:"ar",
  QA:"ar", BH:"ar", OM:"ar", YE:"ar", LY:"ar", TN:"ar", DZ:"ar", MA:"ar",
  SD:"ar", SO:"ar", MR:"ar",

  // Chino
  CN:"zh", TW:"zh", HK:"zh", SG:"zh",

  // Ruso
  RU:"ru", BY:"ru", KZ:"ru", KG:"ru", TJ:"ru", TM:"ru", UZ:"ru",

  // Alemán
  DE:"de", AT:"de", LI:"de",

  // Japonés
  JP:"ja",

  // Coreano
  KR:"ko",

  // Hindi
  IN:"hi",

  // Italiano
  IT:"it", SM:"it", VA:"it",

  // Neerlandés
  NL:"nl", SR:"nl",

  // Polaco
  PL:"pl",

  // Turco
  TR:"tr",

  // Vietnamita
  VN:"vi",

  // Tailandés
  TH:"th",

  // Indonesio / Malayo
  ID:"id", MY:"ms",

  // Sueco
  SE:"sv",

  // Noruego
  NO:"no",

  // Danés
  DK:"da",

  // Finlandés
  FI:"fi",

  // Griego
  GR:"el",

  // Hebreo
  IL:"he",

  // Persa
  IR:"fa",

  // Ucraniano
  UA:"uk",

  // Rumano
  RO:"ro",

  // Húngaro
  HU:"hu",

  // Checo
  CZ:"cs",

  // Eslovaco
  SK:"sk",

  // Búlgaro
  BG:"bg",

  // Croata / Serbio
  HR:"hr", RS:"sr", BA:"bs",

  // Filipino
  PH:"fil",

  // Swahili
  KE:"sw", TZ:"sw", UG:"sw",

  // Bengali
  BD:"bn",

  // Paquistaní / Urdu
  PK:"ur",
}

function detectarPaisDesdeZona() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tzMap = {
      "America/Santo_Domingo":"DO","America/New_York":"US","America/Chicago":"US",
      "America/Denver":"US","America/Los_Angeles":"US","America/Bogota":"CO",
      "America/Santiago":"CL","America/Lima":"PE","America/Mexico_City":"MX",
      "America/Argentina/Buenos_Aires":"AR","America/Sao_Paulo":"BR",
      "America/Caracas":"VE","America/La_Paz":"BO","America/Guayaquil":"EC",
      "America/Asuncion":"PY","America/Montevideo":"UY","America/Havana":"CU",
      "America/Port-au-Prince":"HT","America/Guatemala":"GT","America/Tegucigalpa":"HN",
      "America/Managua":"NI","America/Costa_Rica":"CR","America/Panama":"PA",
      "America/El_Salvador":"SV","America/Toronto":"CA","America/Vancouver":"CA",
      "America/Jamaica":"JM","America/Nassau":"BS",
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
      "Asia/Taipei":"TW","Asia/Hong_Kong":"HK","Africa/Cairo":"EG",
      "Africa/Lagos":"NG","Africa/Johannesburg":"ZA","Africa/Nairobi":"KE",
      "Africa/Casablanca":"MA","Africa/Accra":"GH","Africa/Dakar":"SN",
      "Pacific/Auckland":"NZ","Australia/Sydney":"AU","Pacific/Honolulu":"US",
    }
    return tzMap[tz] ?? "US"
  } catch {
    return "US"
  }
}

export function I18nProvider({ children }) {
  const [pais, setPaisSt] = useState("DO")

  useEffect(() => {
    const saved = localStorage.getItem("isiweek_pais")
    if (saved) {
      setPaisSt(saved)
    } else {
      const detectado = detectarPaisDesdeZona()
      setPaisSt(detectado)
      localStorage.setItem("isiweek_pais", detectado)
    }
  }, [])

  function setPais(codigo) {
    setPaisSt(codigo)
    localStorage.setItem("isiweek_pais", codigo)
  }

  const idioma = PAIS_IDIOMA[pais] ?? "en"

  return (
    <I18nContext.Provider value={{ pais, setPais, idioma }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function usePaises() {
  return useMemo(() => Country.getAllCountries(), [])
}