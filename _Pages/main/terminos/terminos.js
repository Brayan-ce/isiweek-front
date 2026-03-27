"use client"

import { useEffect, useState } from "react"
import s from "./terminos.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SITIO  = "https://pos.ambrysoft.com"
const CORREO = "ambrysoft@gmail.com"

export default function TerminosPage() {
  const [config, setConfig] = useState({})

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  const nombre    = config.sistema_nombre  ?? "Ambrysoft"
  const waNumero  = config.whatsapp_numero ?? "51935790269"
  const waUrl     = `https://wa.me/${waNumero}`

  const SECCIONES = [
    {
      titulo: "1. Identificación del prestador",
      texto: `${nombre} es una plataforma de gestión empresarial en modalidad Software como Servicio (SaaS), operada y administrada por Brayan Jhoan Curasma Espinoza, con RUC N.° 10709019193, inscrito en la República del Perú, con correo de contacto ${CORREO} y accesible en ${SITIO}. El presente documento regula la relación contractual entre ${nombre} y cualquier persona natural o jurídica que contrate o utilice sus servicios.`,
    },
    {
      titulo: "2. Descripción del servicio",
      texto: `${nombre} ofrece módulos de software en la nube accesibles mediante suscripción, que incluyen: Sistema POS avanzado (punto de venta, caja, inventario y reportes), Cartera de créditos (contratos, cuotas y control de mora), Ventas online (catálogo público, pedidos y WhatsApp integrado) y Gestión de obras (proyectos, asistencia, gastos y reportes). El servicio es de naturaleza digital e intangible y se presta de forma continua durante el período contratado y pagado.`,
    },
    {
      titulo: "3. Proceso de contratación",
      texto: `La contratación se realiza de forma online a través de ${SITIO}, o directamente por WhatsApp (${waUrl}) o correo electrónico (${CORREO}). El cliente elige el plan o los módulos que desea activar, revisa el precio correspondiente y procede al pago. Una vez acreditado el pago a través de la pasarela dLocal Go, ${nombre} habilita el acceso al servicio contratado en un plazo máximo de 24 horas hábiles. La relación contractual queda formalizada desde la confirmación del pago.`,
    },
    {
      titulo: "4. Planes, precios y facturación",
      texto: `Los precios están expresados en dólares estadounidenses (USD) y corresponden a los planes y módulos publicados en https://pos.ambrysoft.com/planes. Se ofrecen ciclos de facturación mensual y anual. El plan anual incluye un descuento del 20% sobre el precio mensual equivalente. El cliente puede personalizar su suscripción seleccionando únicamente los módulos que necesite. Los precios vigentes pueden actualizarse; ${nombre} notificará al cliente con al menos 30 días de anticipación antes de que cualquier cambio de precio entre en vigor para los contratos activos.`,
    },
    {
      titulo: "5. Métodos de pago",
      texto: `Los pagos se procesan a través de dLocal Go, pasarela de pagos certificada que opera en Perú y más de 35 mercados emergentes. dLocal Go permite el pago mediante tarjetas de crédito y débito (Visa, Mastercard, entre otras), transferencias bancarias locales y otros métodos de pago disponibles según el país del cliente. Adicionalmente, se acepta pago coordinado directamente por WhatsApp para acuerdos puntuales. ${nombre} no almacena datos de tarjetas; dicho procesamiento es realizado íntegramente por dLocal Go bajo sus propios estándares de seguridad y cumplimiento normativo.`,
    },
    {
      titulo: "6. Cancelación y vigencia",
      texto: `El servicio no exige permanencia mínima y puede cancelarse en cualquier momento. Para cancelar, el cliente debe notificarlo a ${nombre} por correo electrónico a ${CORREO} o por WhatsApp. La cancelación surte efecto al vencimiento del período ya pagado, sin cargos adicionales. No se procesan cancelaciones automáticas; el cliente debe solicitarlas de forma expresa. Una vez vencido el período contratado sin renovación, el acceso a la plataforma quedará suspendido automáticamente.`,
    },
    {
      titulo: "7. Política de reembolsos",
      texto: `Dado que ${nombre} es un servicio digital de acceso inmediato, no se realizan reembolsos una vez habilitado el acceso a la plataforma. Excepcionalmente, se evaluarán solicitudes de reembolso en los siguientes casos: (a) falla técnica grave comprobable imputable a ${nombre} que impida el uso del servicio por más de 72 horas consecutivas; (b) cobro duplicado por error del sistema. Las solicitudes deben presentarse dentro de los 7 días naturales siguientes al cargo, mediante correo a ${CORREO}. En caso de proceder, el reembolso se gestionará a través de dLocal Go dentro de los plazos que dicha pasarela establezca.`,
    },
    {
      titulo: "8. Uso aceptable",
      texto: `El cliente se compromete a utilizar la plataforma exclusivamente para fines lícitos y acordes con la legislación peruana vigente. Queda prohibido: (a) intentar acceder sin autorización a sistemas o cuentas de terceros; (b) utilizar la plataforma para actividades fraudulentas o ilegales; (c) reproducir, redistribuir o revender el software sin autorización expresa de ${nombre}; (d) interferir con el funcionamiento normal de la plataforma. El incumplimiento facultará a ${nombre} a suspender o cancelar el acceso sin derecho a reembolso.`,
    },
    {
      titulo: "9. Disponibilidad y soporte técnico",
      texto: `${nombre} se compromete a mantener la plataforma disponible de forma continua, salvo por mantenimientos programados, actualizaciones o causas de fuerza mayor. El soporte técnico se presta a través de WhatsApp (${waUrl}) y correo electrónico (${CORREO}), de lunes a viernes de 9:00 a 18:00 horas (hora de Perú, GMT-5). ${nombre} no garantiza tiempos de resolución específicos, pero atenderá las solicitudes con la mayor diligencia posible.`,
    },
    {
      titulo: "10. Propiedad intelectual",
      texto: `Todo el software, diseño, código fuente, marcas, nombres comerciales y contenidos de ${nombre} son propiedad exclusiva de Ambrysoft o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual aplicables. La contratación del servicio otorga al cliente únicamente una licencia de uso personal, intransferible y no exclusiva durante el período contratado. No se transfiere ningún derecho de propiedad sobre el software ni ninguno de sus componentes.`,
    },
    {
      titulo: "11. Privacidad y protección de datos",
      texto: `El tratamiento de los datos personales del cliente se rige por la Política de Privacidad disponible en ${SITIO}/privacidad, en cumplimiento de la Ley N.° 29733, Ley de Protección de Datos Personales del Perú. ${nombre} recopila únicamente los datos necesarios para prestar el servicio, no los comercializa con terceros y los protege mediante medidas técnicas razonables. El cliente es responsable de los datos que ingresa en la plataforma.`,
    },
    {
      titulo: "12. Limitación de responsabilidad",
      texto: `${nombre} no será responsable por pérdidas de datos derivadas de errores del cliente, interrupciones por fuerza mayor o fallas de terceros proveedores (conectividad, energía eléctrica, etc.). La responsabilidad máxima de ${nombre} frente al cliente, por cualquier concepto, no excederá el importe total pagado por el cliente durante los tres (3) meses anteriores al hecho generador. En ningún caso ${nombre} será responsable por daños indirectos, lucro cesante o perjuicios no previsibles.`,
    },
    {
      titulo: "13. Modificaciones a los términos",
      texto: `${nombre} se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento. Los cambios serán notificados mediante correo electrónico o aviso visible en la plataforma, con al menos 15 días de anticipación. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos. Si el cliente no acepta los cambios, podrá cancelar el servicio conforme a la cláusula 6.`,
    },
    {
      titulo: "14. Ley aplicable y jurisdicción",
      texto: `Los presentes Términos y Condiciones se rigen por las leyes de la República del Perú. Para cualquier controversia derivada de su interpretación o ejecución, las partes se someten a la jurisdicción de los juzgados y tribunales de Lima, Perú, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.`,
    },
    {
      titulo: "15. Contacto",
      texto: `Para consultas, reclamos o solicitudes relacionadas con estos Términos y Condiciones, el cliente puede comunicarse con ${nombre} a través de: Correo electrónico: ${CORREO} | WhatsApp: ${waUrl} | Sitio web: ${SITIO}`,
    },
  ]

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="document-text-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Términos y Condiciones</h1>
            <p className={s.meta}>Última actualización: 24 de marzo de 2026 · {nombre}</p>
          </div>
        </div>

        <div className={s.intro}>
          Al acceder y utilizar los servicios de <strong>{nombre}</strong> ({SITIO}), el usuario acepta íntegramente los presentes Términos y Condiciones. Le recomendamos leerlos con detenimiento antes de contratar cualquiera de nuestros planes o módulos.
        </div>

        <div className={s.secciones}>
          {SECCIONES.map(sec => (
            <div key={sec.titulo} className={s.seccion}>
              <h2 className={s.secTitulo}>{sec.titulo}</h2>
              <p className={s.secTexto}>{sec.texto}</p>
            </div>
          ))}
        </div>

        <div className={s.footerNote}>
          <ion-icon name="shield-checkmark-outline" />
          <span>
            ¿Tienes dudas sobre estos términos? Escríbenos a{" "}
            <a href={`mailto:${CORREO}`} className={s.link}>{CORREO}</a>
          </span>
        </div>

      </div>
    </div>
  )
}