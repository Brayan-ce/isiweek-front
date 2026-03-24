"use client"

import { useEffect, useState } from "react"
import s from "./cookies.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const SITIO  = "https://pos.ambrysoft.com"
const CORREO = "ambrysoft@gmail.com"

const TABLA_COOKIES = [
  { nombre: "session_token",     tipo: "Esencial",    duracion: "Sesión",   descripcion: "Mantiene la sesión del usuario autenticado en la plataforma." },
  { nombre: "ambrysoft_token",   tipo: "Esencial",    duracion: "30 días",  descripcion: "Almacena un token de autenticación seguro del usuario (configurado con medidas de seguridad como HttpOnly y Secure)." },
  { nombre: "data-theme",        tipo: "Preferencia", duracion: "1 año",    descripcion: "Guarda la preferencia de tema (claro u oscuro) del usuario." },
  { nombre: "_ga, _gid",        tipo: "Analítica",   duracion: "2 años",   descripcion: "Cookies de Google Analytics para análisis anónimo del uso de la plataforma." },
  { nombre: "dlocalgo_*",        tipo: "Pago",        duracion: "Sesión",   descripcion: "Cookies establecidas por dLocal Go durante el proceso de pago seguro." },
  { nombre: "g_state, g_csrf_*", tipo: "Autenticación", duracion: "Sesión", descripcion: "Cookies de Google Sign-In para la autenticación con cuenta Google." },
]

export default function CookiesPage() {
  const [config, setConfig] = useState({})

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  const nombre = config.sistema_nombre ?? "Ambrysoft"

  const SECCIONES = [
    {
      icono: "information-circle-outline",
      titulo: "1. ¿Qué son las cookies?",
      texto: `Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario cuando visita un sitio web. Permiten que el sitio recuerde información entre visitas, como preferencias de visualización o el estado de inicio de sesión. Las cookies no son virus ni programas dañinos; son una tecnología estándar utilizada en la mayoría de sitios web.`,
    },
    {
      icono: "layers-outline",
      titulo: "2. Tipos de cookies que utilizamos",
      texto: `${nombre} utiliza los siguientes tipos de cookies: (a) Cookies esenciales: necesarias para el funcionamiento básico de la plataforma; sin ellas, no es posible acceder ni usar el servicio. (b) Cookies de preferencias: recuerdan las configuraciones del usuario, como el tema visual seleccionado. (c) Cookies analíticas: recopilan información anónima sobre cómo se usa la plataforma, con el fin de mejorarla. (d) Cookies de pago: establecidas por dLocal Go durante los procesos de pago seguro. (e) Cookies de autenticación: utilizadas por Google Sign-In para el inicio de sesión con cuenta Google.`,
    },
    {
      icono: "list-outline",
      titulo: "3. Detalle de cookies utilizadas",
      texto: `A continuación se detalla la tabla de cookies usadas por ${nombre}. Ver tabla más adelante en esta página.`,
      esTabla: true,
    },
    {
      icono: "settings-outline",
      titulo: "4. Control y gestión de cookies",
      texto: `El usuario puede controlar y eliminar las cookies desde la configuración de su navegador. La mayoría de navegadores permiten: (a) Ver las cookies almacenadas y eliminarlas individualmente. (b) Bloquear cookies de terceros. (c) Bloquear todas las cookies. Tenga en cuenta que deshabilitar las cookies esenciales puede impedir el correcto funcionamiento de la plataforma e imposibilitar el inicio de sesión. A continuación se indican las instrucciones para los navegadores más comunes: Chrome (Configuración > Privacidad y seguridad > Cookies), Firefox (Opciones > Privacidad y seguridad), Safari (Preferencias > Privacidad), Edge (Configuración > Privacidad, búsqueda y servicios).`,
    },
    {
      icono: "share-social-outline",
      titulo: "5. Cookies de terceros",
      texto: `${nombre} integra servicios de terceros que pueden establecer sus propias cookies: Google Analytics (análisis anónimo de tráfico), Google Sign-In (autenticación) y dLocal Go (procesamiento de pagos). Cada uno de estos proveedores tiene su propia política de cookies y privacidad, a la cual ${nombre} no tiene acceso ni control. Le recomendamos revisar las políticas de privacidad de estos servicios directamente en sus sitios oficiales.`,
    },
    {
      icono: "create-outline",
      titulo: "6. Actualizaciones de esta política",
      texto: `${nombre} puede actualizar esta Política de Cookies en cualquier momento. Cuando se realicen cambios significativos, se notificará mediante aviso en la plataforma o correo electrónico. La fecha de la última actualización se indica al inicio de este documento.`,
    },
    {
      icono: "mail-outline",
      titulo: "7. Contacto",
      texto: `Para consultas sobre el uso de cookies en ${nombre}, puede contactarnos a través de: Correo electrónico: ${CORREO} | Sitio web: ${SITIO}`,
    },
  ]

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="nutrition-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Política de Cookies</h1>
            <p className={s.meta}>Última actualización: 24 de marzo de 2026 · {nombre}</p>
          </div>
        </div>

        <div className={s.intro}>
          <strong>{nombre}</strong> utiliza cookies y tecnologías similares para garantizar el correcto funcionamiento de la plataforma, recordar sus preferencias y analizar el uso del servicio. A continuación le explicamos qué cookies usamos, para qué y cómo puede gestionarlas.
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
              {sec.esTabla ? (
                <div className={s.tablaWrap}>
                  <table className={s.tabla}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Duración</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TABLA_COOKIES.map(c => (
                        <tr key={c.nombre}>
                          <td><code className={s.code}>{c.nombre}</code></td>
                          <td><span className={`${s.badge} ${s[`badge_${c.tipo.toLowerCase()}`]}`}>{c.tipo}</span></td>
                          <td>{c.duracion}</td>
                          <td>{c.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={s.secTexto}>{sec.texto}</p>
              )}
            </div>
          ))}
        </div>

        <div className={s.footerNote}>
          <ion-icon name="nutrition-outline" />
          <span>
            ¿Preguntas sobre cookies? Escríbenos a{" "}
            <a href={`mailto:${CORREO}`} className={s.link}>{CORREO}</a>
          </span>
        </div>

      </div>
    </div>
  )
}