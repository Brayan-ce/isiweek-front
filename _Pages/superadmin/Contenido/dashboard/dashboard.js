"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import Link from "next/link"
import s from "./dashboard.module.css"
import { apiFetch } from "@/_EXTRAS/peticion"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmtFecha(fecha) {
  if (!fecha) return ""
  return new Date(fecha).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtMonto(n) {
  return new Intl.NumberFormat("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)
}

const ESTADO_EMPRESA   = { activa:     { label: "Activa",    cls: "chipGreen" }, inactiva:  { label: "Inactiva",  cls: "chipRed"   } }
const ESTADO_SOLICITUD = { pendiente:  { label: "Pendiente", cls: "chipAmber" }, aprobada:  { label: "Aprobada",  cls: "chipGreen" }, rechazada: { label: "Rechazada", cls: "chipRed" } }
const ESTADO_USUARIO   = { activo:     { label: "Activo",    cls: "chipGreen" }, inactivo:  { label: "Inactivo",  cls: "chipRed"   } }
const ESTADO_VENTA     = { completada: { label: "Pagada",    cls: "chipGreen" }, cancelada: { label: "Cancelada", cls: "chipRed"   }, pendiente: { label: "Pendiente", cls: "chipAmber" } }

async function obtenerDatosDashboard() {
  try {
    const res = await apiFetch(`/api/superadmin/dashboard/datos`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function DashboardSuperAdmin() {
  const [datos, setDatos]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha]       = useState("")

  useEffect(() => {
    setFecha(new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" }))
  }, [])

  async function cargar() {
    setCargando(true)
    const d = await obtenerDatosDashboard()
    setDatos(d)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const stats              = datos?.stats
  const ultimasEmpresas    = datos?.ultimasEmpresas    ?? []
  const ultimasSolicitudes = datos?.ultimasSolicitudes ?? []
  const ultimosUsuarios    = datos?.ultimosUsuarios    ?? []
  const ultimasVentas      = datos?.ultimasVentas      ?? []

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <div>
          <div className={s.pageTitle}>Datos</div>
          <div className={s.pageSubtitle}>{fecha}</div>
        </div>
        <button className={s.refreshBtn} onClick={cargar} disabled={cargando}>
          <ion-icon name={cargando ? "reload-outline" : "refresh-outline"} />
          {cargando ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Empresas activas</span>
            <span className={s.statValue}>{stats?.empresasActivas ?? "—"}</span>
            <span className={s.statSub}><span className={s.statSubBlue}>{stats?.totalEmpresas ?? 0}</span> en total</span>
          </div>
          <div className={`${s.statIcon} ${s.iconBlue}`}><ion-icon name="business-outline" /></div>
        </div>

        <div className={s.statCard}>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Usuarios activos</span>
            <span className={s.statValue}>{stats?.usuariosActivos ?? "—"}</span>
            <span className={s.statSub}><span className={s.statSubGreen}>{stats?.totalUsuarios ?? 0}</span> registrados</span>
          </div>
          <div className={`${s.statIcon} ${s.iconGreen}`}><ion-icon name="people-outline" /></div>
        </div>

        <div className={s.statCard}>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Solicitudes pendientes</span>
            <span className={s.statValue}>{stats?.solicitudesPendientes ?? "—"}</span>
            <span className={s.statSub}><span className={s.statSubAmber}>{stats?.totalSolicitudes ?? 0}</span> totales</span>
          </div>
          <div className={`${s.statIcon} ${s.iconAmber}`}><ion-icon name="mail-outline" /></div>
        </div>

        <div className={s.statCard}>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Total ventas sistema</span>
            <span className={s.statValue} style={{ fontSize: 22 }}>{stats ? fmtMonto(stats.totalVentas) : "—"}</span>
            <span className={s.statSub}>Todas las empresas</span>
          </div>
          <div className={`${s.statIcon} ${s.iconPurple}`}><ion-icon name="card-outline" /></div>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardTitle}>
              <span className={`${s.cardTitleIcon} ${s.iconBlue}`}><ion-icon name="business-outline" /></span>
              Ultimas empresas
            </div>
            <Link href="/superadmin/empresas" className={s.cardLink}>Ver todas</Link>
          </div>
          <div className={s.cardBody}>
            {ultimasEmpresas.length === 0
              ? <div className={s.empty}>Sin empresas registradas</div>
              : ultimasEmpresas.map(e => (
                <div key={e.id} className={s.row}>
                  <div className={`${s.rowIcon} ${s.iconBlue}`}><ion-icon name="business-outline" /></div>
                  <div className={s.rowInfo}>
                    <div className={s.rowName}>{e.nombre}</div>
                    <div className={s.rowSub}>{e.moneda?.simbolo ?? ""} · {fmtFecha(e.created_at)}</div>
                  </div>
                  <div className={s.rowRight}>
                    <span className={`${s.chip} ${s[ESTADO_EMPRESA[e.estado]?.cls ?? "chipGray"]}`}>
                      {ESTADO_EMPRESA[e.estado]?.label ?? e.estado}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardTitle}>
              <span className={`${s.cardTitleIcon} ${s.iconAmber}`}><ion-icon name="mail-outline" /></span>
              Ultimas solicitudes
            </div>
            <Link href="/superadmin/solicitudes" className={s.cardLink}>Ver todas</Link>
          </div>
          <div className={s.cardBody}>
            {ultimasSolicitudes.length === 0
              ? <div className={s.empty}>Sin solicitudes</div>
              : ultimasSolicitudes.map(sol => (
                <div key={sol.id} className={s.row}>
                  <div className={`${s.rowIcon} ${s.iconAmber}`}><ion-icon name="person-outline" /></div>
                  <div className={s.rowInfo}>
                    <div className={s.rowName}>{sol.nombre ?? "Sin nombre"}</div>
                    <div className={s.rowSub}>{sol.email ?? ""}</div>
                  </div>
                  <div className={s.rowRight}>
                    <span className={`${s.chip} ${s[ESTADO_SOLICITUD[sol.estado]?.cls ?? "chipGray"]}`}>
                      {ESTADO_SOLICITUD[sol.estado]?.label ?? sol.estado}
                    </span>
                    <span className={s.rowDate}>{fmtFecha(sol.created_at)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div className={s.fullGrid}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardTitle}>
              <span className={`${s.cardTitleIcon} ${s.iconGreen}`}><ion-icon name="people-outline" /></span>
              Usuarios recientes
            </div>
            <Link href="/superadmin/usuarios" className={s.cardLink}>Ver todos</Link>
          </div>
          <div className={s.cardBody}>
            {ultimosUsuarios.length === 0
              ? <div className={s.empty}>Sin usuarios</div>
              : ultimosUsuarios.map(u => (
                <div key={u.id} className={s.row}>
                  <div className={`${s.rowIcon} ${s.iconGreen}`}><ion-icon name="person-circle-outline" /></div>
                  <div className={s.rowInfo}>
                    <div className={s.rowName}>{u.nombre_completo}</div>
                    <div className={s.rowSub}>{u.tipo_usuario?.nombre ?? ""} · {u.empresa?.nombre ?? "Sin empresa"}</div>
                  </div>
                  <div className={s.rowRight}>
                    <span className={`${s.chip} ${s[ESTADO_USUARIO[u.estado]?.cls ?? "chipGray"]}`}>
                      {ESTADO_USUARIO[u.estado]?.label ?? u.estado}
                    </span>
                    <span className={s.rowDate}>{fmtFecha(u.created_at)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <div className={s.cardTitle}>
              <span className={`${s.cardTitleIcon} ${s.iconPurple}`}><ion-icon name="card-outline" /></span>
              Actividad reciente
            </div>
            <span className={s.cardLink} style={{ cursor: "default" }}>Ventas</span>
          </div>
          <div className={s.cardBody}>
            {ultimasVentas.length === 0
              ? <div className={s.empty}>Sin actividad reciente</div>
              : ultimasVentas.map(v => (
                <div key={v.id} className={s.actRow}>
                  <div className={s.actDot} style={{ background: v.estado === "completada" ? "#22c55e" : v.estado === "cancelada" ? "#ef4444" : "#f59e0b" }} />
                  <div className={s.actInfo}>
                    <div className={s.actText}>
                      {v.empresa?.nombre ?? "Empresa"} — {v.usuario?.nombre_completo?.split(" ")[0] ?? "Usuario"}
                    </div>
                    <div className={s.actMeta}>{fmtFecha(v.created_at)} · {ESTADO_VENTA[v.estado]?.label ?? v.estado}</div>
                  </div>
                  <div className={s.actAmount}>${fmtMonto(v.total)}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}