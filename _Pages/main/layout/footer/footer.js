"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import s from "./footer.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const NAV = [
  {
    titulo: "Producto",
    links: [
      { label: "Inicio",        href: "/"          },
      { label: "Planes",        href: "/planes"     },
      { label: "Crear cuenta",  href: "/registrar"  },
      { label: "Iniciar sesión",href: "/login"      },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { label: "Términos y condiciones", href: "/terminos"   },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Política de cookies",    href: "/cookies"    },
      { label: "Política de reembolsos", href: "/reembolsos" },
    ],
  },
  {
    titulo: "Soporte",
    links: [
      { label: "Contacto",             href: "/contacto" },
      { label: "Preguntas frecuentes", href: "/faq"      },
    ],
  },
]

const PAGOS = [
  { nombre: "Visa",       icono: "card-outline"             },
  { nombre: "Mastercard", icono: "card-outline"             },
  { nombre: "Stripe",     icono: "shield-checkmark-outline" },
  { nombre: "PayPal",     icono: "logo-paypal"              },
]

export default function Footer() {
  const [config, setConfig]     = useState({})
  const [activeTab, setActiveTab] = useState(0)
  const carouselRef             = useRef()

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  function goTab(i) {
    setActiveTab(i)
    carouselRef.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }

  const nombre    = config.sistema_nombre ?? "IsiWeek"
  const logoPath  = config.sistema_logo   ?? null
  const logoUrl   = logoPath ? `${API}${logoPath}` : null
  const waNumero  = config.whatsapp_numero ?? "18494324597"
  const waMensaje = encodeURIComponent(config.whatsapp_mensaje ?? `Hola, necesito información sobre ${nombre}`)
  const waUrl     = `https://wa.me/${waNumero}?text=${waMensaje}`
  const year      = new Date().getFullYear()

  return (
    <footer className={s.footer}>

      {/* ── Desktop layout ── */}
      <div className={s.inner}>
        <div className={s.brand}>
          <Link href="/" className={s.brandLink}>
            {logoUrl
              ? <img src={logoUrl} alt={nombre} className={s.logoImg} />
              : <div className={s.logoIcon}>{nombre.charAt(0)}</div>
            }
            <span className={s.logoText}>{nombre}</span>
          </Link>
          <p className={s.brandDesc}>
            Sistema de gestión empresarial multi-módulo. POS, créditos, obras y ventas online en un solo lugar.
          </p>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className={s.waBtn}>
            <ion-icon name="logo-whatsapp" />
            Soporte por WhatsApp
          </a>
        </div>

        <div className={s.nav}>
          {NAV.map(col => (
            <div key={col.titulo} className={s.col}>
              <span className={s.colTitulo}>{col.titulo}</span>
              <ul className={s.colLinks}>
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className={s.colLink}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile carousel layout ── */}
      <div className={s.mobile}>
        <div className={s.mobileBrand}>
          <Link href="/" className={s.brandLink}>
            {logoUrl
              ? <img src={logoUrl} alt={nombre} className={s.logoImg} />
              : <div className={s.logoIcon}>{nombre.charAt(0)}</div>
            }
            <span className={s.logoText}>{nombre}</span>
          </Link>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className={s.waBtnMobile}>
            <ion-icon name="logo-whatsapp" />
          </a>
        </div>

        <div className={s.tabs}>
          {NAV.map((col, i) => (
            <button
              key={col.titulo}
              className={`${s.tabBtn} ${activeTab === i ? s.tabBtnActive : ""}`}
              onClick={() => goTab(i)}
              type="button"
            >
              {col.titulo}
            </button>
          ))}
        </div>

        <div className={s.carousel} ref={carouselRef}>
          {NAV.map((col, i) => (
            <div key={col.titulo} className={`${s.slide} ${activeTab === i ? s.slideActive : ""}`}>
              <ul className={s.slideLinks}>
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className={s.slideLink}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar (shared) ── */}
      <div className={s.bottom}>
        <div className={s.bottomInner}>
          <span className={s.copy}>© {year} {nombre}. Todos los derechos reservados.</span>
          <div className={s.pagos}>
            <span className={s.pagosLabel}>Pagos seguros con</span>
            <div className={s.pagosIcons}>
              {PAGOS.map(p => (
                <div key={p.nombre} className={s.pagoChip} title={p.nombre}>
                  <ion-icon name={p.icono} />
                  <span>{p.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  )
}