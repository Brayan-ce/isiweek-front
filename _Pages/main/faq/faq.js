"use client"

import { useEffect, useState } from "react"
import s from "./faq.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const CORREO = "ambrysoft@gmail.com"

const CATEGORIAS = [
  {
    id: "general",
    icono: "help-circle-outline",
    label: "General",
    preguntas: [
      {
        p: "¿Qué es Ambrysoft?",
        r: "Ambrysoft es una plataforma de gestión empresarial en la nube (SaaS) que ofrece módulos para punto de venta (POS), cartera de créditos, ventas online y gestión de obras. Está diseñada para pequeñas y medianas empresas que necesitan administrar su operación desde cualquier lugar.",
      },
      {
        p: "¿Necesito instalar algo para usar Ambrysoft?",
        r: "No. Ambrysoft funciona 100% desde el navegador web, sin necesidad de instalar ningún programa ni aplicación. Solo necesitas un dispositivo con acceso a internet (computadora, tablet o celular) y una cuenta activa.",
      },
      {
        p: "¿Puedo gestionar más de una empresa desde la misma cuenta?",
        r: "Sí. Ambrysoft es un sistema multi-empresa. Con un mismo acceso de Super Administrador puedes gestionar múltiples empresas, cada una con sus propios módulos, usuarios y datos completamente separados.",
      },
      {
        p: "¿Ambrysoft funciona en dispositivos móviles?",
        r: "Sí. La plataforma está optimizada para funcionar en dispositivos móviles a través del navegador. No requiere aplicación nativa, aunque puede usarse como PWA en algunos navegadores.",
      },
    ],
  },
  {
    id: "planes",
    icono: "pricetag-outline",
    label: "Planes y precios",
    preguntas: [
      {
        p: "¿Cómo funcionan los planes de Ambrysoft?",
        r: "Ambrysoft ofrece módulos independientes que puedes contratar por separado o en combinación. Los módulos disponibles son: POS avanzado, Cartera de créditos, Ventas online y Gestión de obras. También existen bundles que combinan módulos comerciales con descuento.",
      },
      {
        p: "¿Cuál es la diferencia entre el plan mensual y anual?",
        r: "El plan anual tiene un descuento del 20% frente al precio mensual equivalente. Si pagas de forma anual, el sistema te muestra el ahorro total. Puedes cambiar entre ciclos al momento de contratar o renovar.",
      },
      {
        p: "¿Los precios incluyen impuestos?",
        r: "Los precios publicados en el sitio web son los precios finales en dólares estadounidenses (USD). No se agregan impuestos adicionales sobre el precio mostrado. Los impuestos o cargos locales, si los hubiera, dependen de la legislación del país del cliente y son responsabilidad del mismo.",
      },
      {
        p: "¿Puedo cambiar de plan después de contratar?",
        r: "Sí. Puedes agregar o quitar módulos en cualquier momento contactando a nuestro equipo por WhatsApp o correo electrónico. Los ajustes se aplican al inicio del siguiente período de facturación.",
      },
    ],
  },
  {
    id: "pagos",
    icono: "card-outline",
    label: "Pagos",
    preguntas: [
      {
        p: "¿Cómo puedo pagar mi suscripción?",
        r: "Los pagos se procesan a través de dLocal Go, pasarela de pagos certificada que opera en Perú y más de 35 países. Acepta tarjetas de crédito y débito (Visa, Mastercard), transferencias bancarias locales y otros métodos disponibles según tu país. También es posible coordinar el pago directamente por WhatsApp.",
      },
      {
        p: "¿Mis datos de pago están seguros?",
        r: "Sí. Ambrysoft no almacena ningún dato de tarjeta. Todo el procesamiento de pagos es realizado íntegramente por dLocal Go bajo sus propios estándares de seguridad y cumplimiento normativo (PCI DSS). Solo recibimos la confirmación del pago.",
      },
      {
        p: "¿Qué pasa si no renuevo a tiempo?",
        r: "Si el período contratado vence sin renovación, el acceso a la plataforma se suspende automáticamente. Tus datos no se eliminan de inmediato; se conservan durante un período de gracia para que puedas reactivar tu cuenta. Para reactivar, simplemente realiza el pago del nuevo período.",
      },
      {
        p: "¿Puedo pagar en mi moneda local?",
        r: "Los precios están publicados en dólares (USD). Sin embargo, dLocal Go permite procesar el pago en moneda local según los métodos disponibles en tu país, realizando la conversión automáticamente al tipo de cambio vigente.",
      },
    ],
  },
  {
    id: "reembolsos",
    icono: "return-down-back-outline",
    label: "Reembolsos",
    preguntas: [
      {
        p: "¿Puedo solicitar un reembolso?",
        r: "Dado que Ambrysoft es un servicio digital de acceso inmediato, los reembolsos son limitados. Solo proceden en casos de falla técnica grave comprobable por más de 72 horas consecutivas, o por cobro duplicado. Las solicitudes deben presentarse dentro de los 7 días naturales siguientes al cargo.",
      },
      {
        p: "¿Puedo cancelar en cualquier momento?",
        r: "Sí. No existe permanencia mínima. Puedes cancelar cuando quieras notificándonos por correo o WhatsApp. La cancelación entra en vigor al vencimiento del período ya pagado, sin cargo adicional. No se reembolsan los días o meses restantes del período en curso.",
      },
      {
        p: "¿Cuánto tarda procesarse un reembolso aprobado?",
        r: "Una vez aprobada la solicitud, el reembolso se gestiona a través de dLocal Go. Los plazos de acreditación dependen del método de pago original y del banco: para tarjetas, entre 5 y 15 días hábiles; para transferencias, entre 3 y 7 días hábiles. Estos plazos son responsabilidad de dLocal Go y del banco del cliente.",
      },
    ],
  },
  {
    id: "soporte",
    icono: "headset-outline",
    label: "Soporte técnico",
    preguntas: [
      {
        p: "¿Cómo obtengo soporte técnico?",
        r: "Puedes contactarnos por WhatsApp o correo electrónico. El soporte se atiende de lunes a viernes de 9:00 a 18:00 horas (hora de Perú, GMT-5). Para acceder rápido, usa el botón de WhatsApp disponible en el sitio web.",
      },
      {
        p: "¿El soporte técnico tiene costo adicional?",
        r: "No. El soporte técnico por consultas de uso y funcionamiento del sistema está incluido sin costo adicional en cualquier plan activo. Soporte especializado para implementaciones personalizadas puede tener costo según el alcance; en ese caso te lo informamos previamente.",
      },
      {
        p: "¿Qué hago si olvidé mi contraseña?",
        r: "En la pantalla de inicio de sesión, haz clic en 'Olvidé mi contraseña'. Ingresa tu correo registrado y recibirás un código OTP para restablecer el acceso. También puedes usar la opción 'Código OTP' para ingresar directamente sin contraseña.",
      },
      {
        p: "¿Con qué frecuencia se actualiza la plataforma?",
        r: "Ambrysoft se actualiza de forma continua con mejoras, correcciones y nuevas funcionalidades. Las actualizaciones se aplican automáticamente sin interrumpir el servicio. Los cambios relevantes son comunicados a través del correo electrónico o avisos dentro de la plataforma.",
      },
    ],
  },
]

export default function FaqPage() {
  const [config, setConfig]   = useState({})
  const [abiertos, setAbiertos] = useState({})
  const [catActiva, setCatActiva] = useState("general")

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  const nombre   = config.sistema_nombre  ?? "Ambrysoft"
  const waNumero = config.whatsapp_numero ?? "18494324597"
  const waUrl    = `https://wa.me/${waNumero}?text=${encodeURIComponent("Hola, tengo una pregunta sobre " + nombre)}`

  function toggle(key) {
    setAbiertos(p => ({ ...p, [key]: !p[key] }))
  }

  const catActual = CATEGORIAS.find(c => c.id === catActiva)

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="chatbox-ellipses-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Preguntas frecuentes</h1>
            <p className={s.meta}>Todo lo que necesitas saber sobre {nombre}</p>
          </div>
        </div>

        <div className={s.cats}>
          {CATEGORIAS.map(c => (
            <button
              key={c.id}
              type="button"
              className={`${s.catBtn} ${catActiva === c.id ? s.catBtnOn : ""}`}
              onClick={() => setCatActiva(c.id)}
            >
              <ion-icon name={c.icono} />
              {c.label}
            </button>
          ))}
        </div>

        <div className={s.lista}>
          {catActual?.preguntas.map((item, i) => {
            const key  = `${catActiva}-${i}`
            const open = !!abiertos[key]
            return (
              <div key={key} className={`${s.item} ${open ? s.itemOpen : ""}`}>
                <button
                  type="button"
                  className={s.pregunta}
                  onClick={() => toggle(key)}
                >
                  <span>{item.p}</span>
                  <div className={`${s.chevron} ${open ? s.chevronOpen : ""}`}>
                    <ion-icon name="chevron-down-outline" />
                  </div>
                </button>
                {open && (
                  <div className={s.respuesta}>
                    <p>{item.r}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={s.noEncontro}>
          <div className={s.noEncontroIcon}>
            <ion-icon name="help-buoy-outline" />
          </div>
          <div className={s.noEncontroTexts}>
            <div className={s.noEncontroTitulo}>¿No encontraste lo que buscas?</div>
            <div className={s.noEncontroDesc}>Nuestro equipo está listo para ayudarte directamente.</div>
          </div>
          <div className={s.noEncontroBtns}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className={s.waBtnSmall}>
              <ion-icon name="logo-whatsapp" />WhatsApp
            </a>
            <a href={`mailto:${CORREO}`} className={s.mailBtnSmall}>
              <ion-icon name="mail-outline" />Correo
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}