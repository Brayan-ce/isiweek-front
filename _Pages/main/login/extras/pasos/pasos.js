"use client"

import { useState, useEffect, useRef } from "react"
import s from "./pasos.module.css"

const PASOS = [
  {
    id: "tabs",
    titulo: "Elige como ingresar",
    desc: "Puedes iniciar sesion con tu correo y contrasena, o recibir un codigo OTP directo a tu email sin necesidad de recordar contrasenas.",
    icono: "information-circle-outline",
    posicion: "bottom",
  },
  {
    id: "email",
    titulo: "Correo y contrasena",
    desc: "Ingresa el correo con el que te registraron y tu contrasena. Si la olvidaste usa el enlace de recuperacion.",
    icono: "mail-outline",
    posicion: "bottom",
  },
  {
    id: "google",
    titulo: "Ingreso con Google",
    desc: "Si tu cuenta esta vinculada a Google puedes ingresar con un solo click, sin escribir nada.",
    icono: "logo-google",
    posicion: "top",
  },
  {
    id: "signup",
    titulo: "Sin cuenta aun?",
    desc: "Las cuentas son creadas por el administrador. Si necesitas acceso contacta por WhatsApp y te registramos.",
    icono: "person-add-outline",
    posicion: "top",
  },
]

export default function TourGuia({ anchorRefs, onClose }) {
  const [paso, setPaso] = useState(0)
  const [pos, setPos]   = useState({ top: 0, left: 0 })
  const [lado, setLado] = useState("bottom")
  const tooltipRef      = useRef()

  const total  = PASOS.length
  const actual = PASOS[paso]

  function limpiarAnchor(id) {
    const el = anchorRefs?.[id]?.current
    if (!el) return
    el.style.position      = ""
    el.style.zIndex        = ""
    el.style.borderRadius  = ""
    el.style.outline       = ""
    el.style.outlineOffset = ""
  }

  function aplicarAnchor(id) {
    const el = anchorRefs?.[id]?.current
    if (!el) return
    el.style.position      = "relative"
    el.style.zIndex        = "401"
    el.style.borderRadius  = "12px"
    el.style.outline       = "2px solid #1d6fce"
    el.style.outlineOffset = "4px"
  }

  useEffect(() => {
    aplicarAnchor(actual?.id)
    return () => limpiarAnchor(actual?.id)
  }, [paso])

  useEffect(() => {
    const anchor  = anchorRefs?.[actual?.id]?.current
    const tooltip = tooltipRef.current
    if (!anchor || !tooltip) return

    const calcPos = () => {
      const r      = anchor.getBoundingClientRect()
      const tw     = tooltip.offsetWidth  || 280
      const th     = tooltip.offsetHeight || 120
      const margin = 16

      let top, left
      if (actual.posicion === "bottom") {
        top  = r.bottom + margin + window.scrollY
        left = r.left + r.width / 2 - tw / 2 + window.scrollX
      } else {
        top  = r.top - th - margin + window.scrollY
        left = r.left + r.width / 2 - tw / 2 + window.scrollX
      }

      left = Math.max(12, Math.min(left, window.innerWidth - tw - 12))
      setLado(actual.posicion)
      setPos({ top, left })
    }

    calcPos()
    window.addEventListener("resize", calcPos)
    return () => window.removeEventListener("resize", calcPos)
  }, [paso])

  function irAPaso(siguiente) {
    limpiarAnchor(actual?.id)
    setPaso(siguiente)
  }

  function cerrar() {
    limpiarAnchor(actual?.id)
    onClose()
  }

  if (!anchorRefs) return null

  return (
    <>
      <div className={s.backdrop} onClick={cerrar} />

      <div
        ref={tooltipRef}
        className={`${s.tooltip} ${lado === "top" ? s.tooltipTop : s.tooltipBottom}`}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className={s.tooltipHeader}>
          <div className={s.tooltipIcono}>
            <ion-icon name={actual.icono} />
          </div>
          <div className={s.tooltipTitulo}>{actual.titulo}</div>
          <button className={s.cerrarBtn} onClick={cerrar}>
            <ion-icon name="close-outline" />
          </button>
        </div>

        <p className={s.tooltipDesc}>{actual.desc}</p>

        <div className={s.tooltipFooter}>
          <div className={s.dots}>
            {PASOS.map((_, i) => (
              <div key={i} className={`${s.dot} ${i === paso ? s.dotActivo : ""}`} />
            ))}
          </div>
          <div className={s.btns}>
            {paso > 0 && (
              <button className={s.btnSec} onClick={() => irAPaso(paso - 1)}>
                <ion-icon name="chevron-back-outline" />
                Anterior
              </button>
            )}
            {paso < total - 1 ? (
              <button className={s.btnPrim} onClick={() => irAPaso(paso + 1)}>
                Siguiente
                <ion-icon name="chevron-forward-outline" />
              </button>
            ) : (
              <button className={s.btnPrim} onClick={cerrar}>
                <ion-icon name="checkmark-outline" />
                Entendido
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}