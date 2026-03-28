"use client"

import { useEffect, useState } from "react"
import s from "./privacidad.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SITIO  = "https://pos.ambrysoft.com"
const CORREO = "ambrysoft@gmail.com"

export default function PrivacidadPage() {
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

  const SECCIONES = [
    {
      icono: "person-circle-outline",
      titulo: "1. Responsable del tratamiento",
      texto: `El responsable del tratamiento de sus datos personales es ${nombre}, operado por Brayan Jhoan Curasma Espinoza, con RUC N.° 10709019193, inscrito en la República del Perú, con correo de contacto ${CORREO} y domicilio digital en ${SITIO}. Esta Política de Privacidad cumple con lo establecido en la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su Reglamento aprobado por Decreto Supremo N.° 003-2013-JUS.`,
    },
    {
      icono: "server-outline",
      titulo: "2. Datos que recopilamos",
      texto: `Recopilamos únicamente los datos necesarios para prestar el servicio: (a) Datos de identificación: nombre completo, número de documento de identidad o RUC, correo electrónico y número de teléfono o WhatsApp. (b) Datos de acceso: correo electrónico y contraseña cifrada para el inicio de sesión. (c) Datos de uso: actividad dentro de la plataforma, módulos utilizados, fechas de acceso y acciones realizadas, con fines de mejora del servicio y soporte técnico. (d) Datos de pago: ${nombre} no almacena datos de tarjetas; estos son procesados íntegramente por Paddle.com bajo sus propios estándares de seguridad y cumplimiento normativo (PCI DSS).`,
    },
    {
      icono: "options-outline",
      titulo: "3. Finalidad del tratamiento",
      texto: `Sus datos personales son utilizados exclusivamente para: (a) Gestionar el registro y acceso a la plataforma. (b) Prestar el servicio contratado y brindar soporte técnico. (c) Procesar pagos a través de Paddle.com. (d) Enviar comunicaciones relacionadas con el servicio, actualizaciones y cambios en las condiciones. (e) Cumplir con obligaciones legales aplicables en la República del Perú. No utilizamos sus datos para publicidad de terceros ni los vendemos o cedemos a personas ajenas a ${nombre}.`,
    },
    {
      icono: "share-social-outline",
      titulo: "4. Transferencia de datos a terceros",
      texto: `${nombre} comparte datos personales únicamente con los siguientes proveedores indispensables para la prestación del servicio: Paddle.com (procesamiento de pagos como Merchant of Record) y Google LLC (autenticación mediante Google Sign-In, de forma opcional). Paddle.com actúa como responsable del tratamiento de los datos de pago bajo sus propias políticas de privacidad y estándares de seguridad. No realizamos transferencias de datos a terceros con fines distintos a los mencionados sin el consentimiento previo y expreso del titular.`,
    },
    {
      icono: "time-outline",
      titulo: "5. Conservación de los datos",
      texto: `Conservamos sus datos personales mientras mantenga una cuenta activa en ${nombre} y durante los plazos legalmente exigidos una vez finalizada la relación contractual. Los datos de facturación y transacciones se conservan durante un mínimo de cinco (5) años en cumplimiento de la normativa tributaria peruana. Una vez vencidos dichos plazos, los datos son eliminados de forma segura o anonimizados.`,
    },
    {
      icono: "lock-closed-outline",
      titulo: "6. Seguridad de la información",
      texto: `${nombre} aplica medidas técnicas y organizativas razonables para proteger sus datos personales frente a accesos no autorizados, pérdida, alteración o divulgación indebida. Entre estas medidas se incluyen: cifrado de contraseñas mediante algoritmos seguros, comunicaciones cifradas mediante HTTPS/TLS y control de acceso por roles dentro de la plataforma. No obstante, ningún sistema es infalible; en caso de detectar una brecha de seguridad que afecte sus datos, lo notificaremos en el menor tiempo posible.`,
    },
    {
      icono: "shield-checkmark-outline",
      titulo: "7. Derechos del titular",
      texto: `De conformidad con la Ley N.° 29733, usted tiene derecho a: (a) Acceder a sus datos personales almacenados por ${nombre}. (b) Rectificar datos inexactos o incompletos. (c) Cancelar o suprimir sus datos cuando ya no sean necesarios para el fin para el que fueron recopilados. (d) Oponerse al tratamiento de sus datos en determinados supuestos. Para ejercer cualquiera de estos derechos, puede escribirnos a ${CORREO} o contactarnos por WhatsApp (${waUrl}). Atenderemos su solicitud en un plazo máximo de 20 días hábiles.`,
    },
    {
      icono: "globe-outline",
      titulo: "8. Cookies y tecnologías similares",
      texto: `${nombre} utiliza cookies y tecnologías similares para garantizar el correcto funcionamiento de la plataforma, mantener la sesión iniciada y analizar el uso del servicio con fines de mejora. Para información detallada sobre el uso de cookies, consulte nuestra Política de Cookies disponible en ${SITIO}/cookies.`,
    },
    {
      icono: "create-outline",
      titulo: "9. Modificaciones a esta política",
      texto: `${nombre} puede actualizar la presente Política de Privacidad en cualquier momento. Los cambios significativos serán notificados mediante correo electrónico o aviso visible en la plataforma. La fecha de la última actualización aparece indicada al inicio de este documento. El uso continuado del servicio tras la notificación implica la aceptación de la política actualizada.`,
    },
    {
      icono: "mail-outline",
      titulo: "10. Contacto",
      texto: `Para consultas, solicitudes de ejercicio de derechos o cualquier asunto relacionado con el tratamiento de sus datos personales, puede contactarnos a través de: Correo electrónico: ${CORREO} | WhatsApp: ${waUrl} | Sitio web: ${SITIO}`,
    },
  ]

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="shield-half-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Política de Privacidad</h1>
            <p className={s.meta}>Última actualización: 28 de marzo de 2026 · {nombre}</p>
          </div>
        </div>

        <div className={s.intro}>
          En <strong>{nombre}</strong> respetamos su privacidad y nos comprometemos a proteger sus datos personales conforme a la{" "}
          <strong>Ley N.° 29733 de Protección de Datos Personales del Perú</strong>. A continuación le explicamos qué datos recopilamos, cómo los usamos y cuáles son sus derechos.
        </div>

        <div className={s.secciones}>
          {SECCIONES.map(sec => (
            <div key={sec.titulo} className={s.seccion}>
              <div className={s.secHead}>
                <div className={s.secIconWrap}>
                  <ion-icon name={sec.icono} />
                </div>
                <h2 className={s.secTitulo}>{sec.titulo}</h2>
              </div>
              <p className={s.secTexto}>{sec.texto}</p>
            </div>
          ))}
        </div>

        <div className={s.footerNote}>
          <ion-icon name="lock-closed-outline" />
          <span>
            Sus datos están protegidos. Consultas a{" "}
            <a href={`mailto:${CORREO}`} className={s.link}>{CORREO}</a>
          </span>
        </div>

      </div>
    </div>
  )
}