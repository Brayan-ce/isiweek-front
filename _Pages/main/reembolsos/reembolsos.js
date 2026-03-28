"use client"

import { useEffect, useState } from "react"
import s from "./reembolsos.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SITIO  = "https://pos.ambrysoft.com"
const CORREO = "ambrysoft@gmail.com"

const CASOS = [
  {
    icono: "timer-outline",
    color: "verde",
    titulo: "Desistimiento dentro de los 14 días",
    desc: "El cliente puede solicitar la cancelación y reembolso completo dentro de los 14 días naturales siguientes a la primera contratación, siempre que no haya hecho uso activo de la plataforma durante ese período.",
  },
  {
    icono: "alert-circle-outline",
    color: "verde",
    titulo: "Falla técnica grave",
    desc: "Imposibilidad de usar la plataforma por más de 72 horas consecutivas por causas imputables a Ambrysoft, debidamente comprobada.",
  },
  {
    icono: "card-outline",
    color: "verde",
    titulo: "Cobro duplicado",
    desc: "Si se registra un cobro duplicado por error del sistema de pago, se reembolsará el importe adicional en su totalidad.",
  },
  {
    icono: "close-circle-outline",
    color: "rojo",
    titulo: "Arrepentimiento tras uso activo",
    desc: "No se realizan reembolsos por desistimiento si el cliente ha hecho uso activo de la plataforma durante el período de desistimiento.",
  },
  {
    icono: "close-circle-outline",
    color: "rojo",
    titulo: "Período ya consumido",
    desc: "No se reembolsa por días o meses ya transcurridos del período contratado, aunque se cancele antes del vencimiento.",
  },
  {
    icono: "close-circle-outline",
    color: "rojo",
    titulo: "Incumplimiento de uso aceptable",
    desc: "Si la cuenta es suspendida por violación de los Términos y Condiciones, no procede ningún reembolso.",
  },
]

const PASOS = [
  { num: "01", titulo: "Envía tu solicitud",       desc: `Escribe a ${CORREO} o contacta por WhatsApp con el asunto: "Solicitud de reembolso".` },
  { num: "02", titulo: "Describe el motivo",       desc: "Indica el motivo de la solicitud, la fecha del cargo y adjunta el comprobante de pago si lo tienes disponible." },
  { num: "03", titulo: "Evaluación en 3 días",     desc: "Ambrysoft evaluará la solicitud en un plazo máximo de 3 días hábiles y te notificará el resultado por correo." },
  { num: "04", titulo: "Procesamiento del reembolso", desc: "Si procede, el reembolso se gestiona a través de Paddle.com como Merchant of Record. Los tiempos de acreditación dependen del método de pago original y del banco del cliente." },
]

export default function ReembolsosPage() {
  const [config, setConfig] = useState({})

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  const nombre   = config.sistema_nombre  ?? "Ambrysoft"
  const waNumero = config.whatsapp_numero ?? "51935790269"
  const waUrl    = `https://wa.me/${waNumero}`

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="return-down-back-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Política de Reembolsos</h1>
            <p className={s.meta}>Última actualización: 28 de marzo de 2026 · {nombre}</p>
          </div>
        </div>

        <div className={s.intro}>
          <strong>{nombre}</strong> es un servicio digital de acceso inmediato. Los reembolsos son limitados y se evalúan caso por caso según los criterios establecidos en esta política, en cumplimiento de los requisitos de Paddle.com como Merchant of Record.
        </div>

        <div className={s.seccion}>
          <h2 className={s.secTitulo}>
            <ion-icon name="help-circle-outline" />
            ¿Cuándo procede un reembolso?
          </h2>
          <div className={s.casosGrid}>
            {CASOS.map(c => (
              <div key={c.titulo} className={`${s.casoCard} ${s[`caso_${c.color}`]}`}>
                <div className={s.casoIcon}>
                  <ion-icon name={c.icono} />
                </div>
                <div>
                  <div className={s.casoTitulo}>{c.titulo}</div>
                  <div className={s.casoDesc}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.seccion}>
          <h2 className={s.secTitulo}>
            <ion-icon name="list-outline" />
            Proceso para solicitar un reembolso
          </h2>
          <div className={s.pasos}>
            {PASOS.map(p => (
              <div key={p.num} className={s.paso}>
                <div className={s.pasoNum}>{p.num}</div>
                <div>
                  <div className={s.pasoTitulo}>{p.titulo}</div>
                  <div className={s.pasoDesc}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.seccion}>
          <h2 className={s.secTitulo}>
            <ion-icon name="time-outline" />
            Plazos y tiempos de acreditación
          </h2>
          <p className={s.secTexto}>
            Las solicitudes de reembolso por falla técnica o cobro duplicado deben presentarse dentro de los <strong>7 días naturales</strong> siguientes a la fecha del cargo. El derecho de desistimiento puede ejercerse dentro de los <strong>14 días naturales</strong> desde la primera contratación. Una vez aprobado el reembolso, el importe se procesa a través de <strong>Paddle.com</strong>. Los tiempos de acreditación varían según el método de pago original: para tarjetas de crédito o débito, el reembolso puede demorar entre 5 y 15 días hábiles dependiendo del banco emisor; para transferencias bancarias, el plazo habitual es de 3 a 7 días hábiles. Estos plazos son responsabilidad de Paddle.com y del banco del cliente, y están fuera del control directo de {nombre}.
          </p>
        </div>

        <div className={s.seccion}>
          <h2 className={s.secTitulo}>
            <ion-icon name="ban-outline" />
            Cancelación sin reembolso
          </h2>
          <p className={s.secTexto}>
            El cliente puede cancelar el servicio en cualquier momento. La cancelación entra en vigor al vencimiento del período ya pagado, sin cargo adicional. No se reembolsan los días o meses restantes del período vigente en curso. Para cancelar, basta con notificarlo a {nombre} por correo electrónico a <a href={`mailto:${CORREO}`} className={s.link}>{CORREO}</a> o por WhatsApp antes del próximo ciclo de facturación.
          </p>
        </div>

        <div className={s.seccion}>
          <h2 className={s.secTitulo}>
            <ion-icon name="card-outline" />
            Chargebacks y disputas con Paddle
          </h2>
          <p className={s.secTexto}>
            Si el cliente inicia una disputa o contracargo (chargeback) directamente con su banco o con Paddle.com sin antes contactar a {nombre}, el caso será tratado conforme a los procedimientos de Paddle como Merchant of Record. {nombre} colaborará con la evidencia necesaria para demostrar la prestación del servicio. Se recomienda siempre contactar primero a {nombre} antes de iniciar cualquier disputa, ya que la mayoría de los casos se resuelven de forma directa y más rápida.
          </p>
        </div>

        <div className={s.footerNote}>
          <ion-icon name="chatbubble-ellipses-outline" />
          <span>
            Para solicitar un reembolso o resolver cualquier duda, contáctanos a{" "}
            <a href={`mailto:${CORREO}`} className={s.link}>{CORREO}</a>
            {" "}o por{" "}
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className={s.link}>WhatsApp</a>
          </span>
        </div>

      </div>
    </div>
  )
}