"use client"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import s from "./Navegacion.module.css"

const GRUPOS = [
  {
    id: "gestion",
    label: "Gestion",
    icon: "cube-outline",
    slugs: [
      "mis-ventas", "productos", "clientes", "inventario", "compras",
      "proveedores", "cotizaciones", "categorias", "marcas", "cajas",
      "gastos", "reportes", "cuotas",
    ],
  },
  {
    id: "creditos",
    label: "Financiamiento",
    icon: "card-outline",
    slugs: [
      "creditos/dashboard", "creditos/planes", "creditos/contratos",
      "creditos/control", "creditos/pagos", "creditos/mora",
    ],
  },
  {
    id: "ventas-online",
    label: "Ventas Online",
    icon: "globe-outline",
    slugs: ["ventas-online/pedidos", "ventas-online/catalogo", "ventas-online/configuracion"],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: "settings-outline",
    slugs: ["dashboard", "solicitudes", "empresas", "usuarios", "depuracion", "configuracion"],
  },
]

const SLUG_LABEL = {
  "mis-ventas":                   "Mis Ventas",
  "productos":                    "Productos",
  "clientes":                     "Clientes",
  "inventario":                   "Inventario",
  "compras":                      "Compras",
  "proveedores":                  "Proveedores",
  "cotizaciones":                 "Cotizaciones",
  "categorias":                   "Categorias",
  "marcas":                       "Marcas",
  "cajas":                        "Cajas",
  "gastos":                       "Gastos",
  "reportes":                     "Reportes",
  "cuotas":                       "Ventas a credito",
  "creditos/dashboard":           "Dashboard Creditos",
  "creditos/planes":              "Planes de Credito",
  "creditos/contratos":           "Contratos",
  "creditos/control":             "Control",
  "creditos/pagos":               "Pagos",
  "creditos/mora":                "Mora y Alertas",
  "ventas-online/pedidos":        "Pedidos",
  "ventas-online/catalogo":       "Catalogo",
  "ventas-online/configuracion":  "Configuracion",
  "dashboard":                    "Dashboard",
  "solicitudes":                  "Solicitudes",
  "empresas":                     "Empresas",
  "usuarios":                     "Usuarios",
  "depuracion":                   "Depuracion",
  "configuracion":                "Configuracion",
}

const SLUG_ICON = {
  "mis-ventas":                   "receipt-outline",
  "productos":                    "cube-outline",
  "clientes":                     "person-outline",
  "inventario":                   "layers-outline",
  "compras":                      "cart-outline",
  "proveedores":                  "business-outline",
  "cotizaciones":                 "document-text-outline",
  "categorias":                   "pricetag-outline",
  "marcas":                       "ribbon-outline",
  "cajas":                        "wallet-outline",
  "gastos":                       "trending-down-outline",
  "reportes":                     "bar-chart-outline",
  "cuotas":                       "card-outline",
  "creditos/dashboard":           "grid-outline",
  "creditos/planes":              "list-outline",
  "creditos/contratos":           "document-outline",
  "creditos/control":             "calendar-outline",
  "creditos/pagos":               "cash-outline",
  "creditos/mora":                "alert-circle-outline",
  "ventas-online/pedidos":        "bag-outline",
  "ventas-online/catalogo":       "storefront-outline",
  "ventas-online/configuracion":  "settings-outline",
  "dashboard":                    "grid-outline",
  "solicitudes":                  "mail-outline",
  "empresas":                     "business-outline",
  "usuarios":                     "people-outline",
  "depuracion":                   "bug-outline",
  "configuracion":                "settings-outline",
}

export default function Sidebar({ data, open, onClose }) {
  const pathname = usePathname()
  const router   = useRouter()

  const slugsDisponibles = new Set((data?.modulos ?? []).map(m => m.slug))
  const esVendedor = data?.usuario?.tipo_usuario_id === 3

  const grupoActivoId = GRUPOS.find(g =>
    g.slugs.some(sl => pathname === `/pos/${sl}` || pathname.startsWith(`/pos/${sl}/`))
  )?.id ?? null

  const [abiertos, setAbiertos] = useState(() => {
    const init = {}
    GRUPOS.forEach(g => { init[g.id] = g.id === grupoActivoId })
    return init
  })

  const [sheetGrupo, setSheetGrupo] = useState(null)

  function toggleGrupo(id) {
    setAbiertos(p => ({ ...p, [id]: !p[id] }))
  }

  function abrirSheet(g) {
    setSheetGrupo(g)
  }

  function cerrarSheet() {
    setSheetGrupo(null)
  }

  function navegar(slug) {
    router.push(`/pos/${slug}`)
    onClose()
  }

  function isActivo(slug) {
    return pathname === `/pos/${slug}` || pathname.startsWith(`/pos/${slug}/`)
  }

  const empresa         = data?.empresa ?? { nombre: "" }
  const usuario         = data?.usuario ?? { nombre_completo: "" }
  const tieneVender     = slugsDisponibles.has("vender")
  const SLUGS_SOLO_ADMIN = ["solicitudes", "empresas", "usuarios", "depuracion", "configuracion"]

  const gruposFiltrados = GRUPOS
    .map(g => ({
      ...g,
      hijos: g.slugs.filter(sl => {
        if (!slugsDisponibles.has(sl)) return false
        if (esVendedor && SLUGS_SOLO_ADMIN.includes(sl)) return false
        return true
      }),
    }))
    .filter(g => g.hijos.length > 0)

  return (
    <>
      {open && <div className={s.overlay} onClick={onClose} />}
      <aside className={`${s.sidebar} ${open ? s.sidebarOpen : ""}`}>

        <div className={s.sidebarTop}>
          <div className={s.perfilRow}>
            <div className={`${s.perfilAvatar} ${empresa.logo ? s.perfilAvatarSinFondo : ""}`}>
              {empresa.logo
                ? <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}${empresa.logo}`} alt={empresa.nombre} className={s.perfilAvatarImg} />
                : usuario.nombre_completo?.charAt(0).toUpperCase()
              }
            </div>
            <div className={s.perfilInfo}>
              <span className={s.perfilNombre}>{usuario.nombre_completo}</span>
              <span className={s.perfilEmpresa}>{empresa.nombre}</span>
            </div>
          </div>
          <button className={s.closeBtn} onClick={onClose}>
            <ion-icon name="close-outline" />
          </button>
        </div>

        <nav className={s.nav}>

          {tieneVender && (
            <button
              className={`${s.padreDirecto} ${isActivo("vender") ? s.padreDirectoActivo : ""}`}
              onClick={() => navegar("vender")}
            >
              <ion-icon name="storefront-outline" />
              <span>Vender</span>
            </button>
          )}

          {gruposFiltrados.map(grupo => {
            const estaAbierto = abiertos[grupo.id]
            const tieneActivo = grupo.hijos.some(sl => isActivo(sl))

            return (
              <div key={grupo.id} className={s.grupo}>
                <button
                  className={`${s.grupoHeader} ${tieneActivo ? s.grupoHeaderActivo : ""}`}
                  onClick={() => toggleGrupo(grupo.id)}
                >
                  <ion-icon name={grupo.icon} />
                  <span>{grupo.label}</span>
                  <ion-icon
                    name="chevron-forward-outline"
                    style={{
                      fontSize: "13px",
                      flexShrink: 0,
                      marginLeft: "auto",
                      transition: "transform 0.2s",
                      transform: estaAbierto ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {estaAbierto && (
                  <div className={s.grupoHijos}>
                    {grupo.hijos.map(sl => (
                      <button
                        key={sl}
                        className={`${s.navItem} ${isActivo(sl) ? s.navItemActive : ""}`}
                        onClick={() => navegar(sl)}
                      >
                        <ion-icon name={SLUG_ICON[sl] ?? "ellipse-outline"} />
                        <span>{SLUG_LABEL[sl]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

        </nav>

        <div className={s.sidebarBottom}>
          <button className={s.logoutBtn} onClick={() => router.push("/login")}>
            <ion-icon name="log-out-outline" />
            <span>Cerrar sesion</span>
          </button>
        </div>

      </aside>

      <nav className={s.bottomNav}>
        {tieneVender && (
          <button
            className={`${s.bnItem} ${isActivo("vender") ? s.bnItemActive : ""}`}
            onClick={() => navegar("vender")}
          >
            <ion-icon name="storefront-outline" />
            <span>Vender</span>
          </button>
        )}
        {gruposFiltrados.slice(0, tieneVender ? 4 : 5).map(g => (
          <button
            key={g.id}
            className={`${s.bnItem} ${g.hijos.some(sl => isActivo(sl)) ? s.bnItemActive : ""}`}
            onClick={() => abrirSheet(g)}
          >
            <ion-icon name={g.icon} />
            <span>{g.label}</span>
          </button>
        ))}
      </nav>

      {sheetGrupo && (
        <>
          <div className={s.sheetOverlay} onClick={cerrarSheet} />
          <div className={s.sheet}>
            <div className={s.sheetHeader}>
              <ion-icon name={sheetGrupo.icon} />
              <span>{sheetGrupo.label}</span>
              <button className={s.sheetClose} onClick={cerrarSheet}>
                <ion-icon name="close-outline" />
              </button>
            </div>
            <div className={s.sheetGrid}>
              {sheetGrupo.hijos.map(sl => (
                <button
                  key={sl}
                  className={`${s.sheetItem} ${isActivo(sl) ? s.sheetItemActive : ""}`}
                  onClick={() => { navegar(sl); cerrarSheet() }}
                >
                  <div className={s.sheetItemIcon}>
                    <ion-icon name={SLUG_ICON[sl] ?? "ellipse-outline"} />
                  </div>
                  <span>{SLUG_LABEL[sl]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}