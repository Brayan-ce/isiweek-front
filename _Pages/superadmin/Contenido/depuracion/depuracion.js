"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import s from "./depuracion.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmtTs(ts) {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function fmtFecha(ts) {
  if (!ts) return ""
  return new Date(ts).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const STATUS_COLOR = { 2: "#16a34a", 3: "#d97706", 4: "#dc2626", 5: "#7c3aed" }

function statusColor(code) {
  return STATUS_COLOR[Math.floor(code / 100)] ?? "#64748b"
}

const TABS      = ["bd", "peticiones", "errores"]
const TAB_LABEL = { bd: "Estado BD", peticiones: "Peticiones HTTP", errores: "Errores" }
const TAB_ICON  = { bd: "server-outline", peticiones: "swap-horizontal-outline", errores: "bug-outline" }

async function obtenerEstadoBD() {
  try {
    const res = await apiFetch(`/api/superadmin/depuracion/bd`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function obtenerLogs() {
  try {
    const res = await apiFetch(`/api/superadmin/depuracion/logs`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function limpiarLogs() {
  try {
    const res = await apiFetch(`/api/superadmin/depuracion/logs`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al limpiar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

export default function DepuracionPage() {
  const [tab, setTab]             = useState("bd")
  const [bd, setBd]               = useState(null)
  const [logs, setLogs]           = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [limpiando, setLimpiando] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [bdData, logsData] = await Promise.all([obtenerEstadoBD(), obtenerLogs()])
    setBd(bdData)
    setLogs(logsData)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(cargar, 5000)
    return () => clearInterval(t)
  }, [autoRefresh, cargar])

  async function handleLimpiar() {
    setLimpiando(true)
    await limpiarLogs()
    await cargar()
    setLimpiando(false)
  }

  const errCount = logs?.errores?.length ?? 0

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <div className={s.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${s.tab} ${tab === t ? s.tabActive : ""}`}
              onClick={() => setTab(t)}
            >
              <ion-icon name={TAB_ICON[t]} />
              {TAB_LABEL[t]}
              {t === "errores" && errCount > 0 && (
                <span className={s.badge}>{errCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className={s.topActions}>
          <button
            className={`${s.btnRefresh} ${autoRefresh ? s.btnRefreshOn : ""}`}
            onClick={() => setAutoRefresh(v => !v)}
          >
            <ion-icon name="refresh-outline" />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </button>
          <button className={s.btnRefresh} onClick={cargar} disabled={cargando}>
            <ion-icon name="reload-outline" /> Refrescar
          </button>
          {(tab === "peticiones" || tab === "errores") && (
            <button className={s.btnLimpiar} onClick={handleLimpiar} disabled={limpiando}>
              <ion-icon name="trash-outline" /> {limpiando ? "Limpiando..." : "Limpiar"}
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className={s.skeletonGrid}>
          {[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}
        </div>
      ) : (
        <>
          {tab === "bd" && (
            <div className={s.bdGrid}>
              {(bd ?? []).map(row => (
                <div key={row.tabla} className={s.bdCard}>
                  <div className={s.bdIconWrap}><ion-icon name="server-outline" /></div>
                  <div className={s.bdInfo}>
                    <div className={s.bdTabla}>{row.tabla}</div>
                    <div className={s.bdTotal}>
                      {row.error ? <span className={s.bdError}>Error</span> : row.total.toLocaleString()}
                    </div>
                  </div>
                  <div className={s.bdLabel}>registros</div>
                </div>
              ))}
            </div>
          )}

          {tab === "peticiones" && (
            <div className={s.logTable}>
              <div className={s.logHeader}>
                <span>Metodo</span>
                <span>URL</span>
                <span>Status</span>
                <span>Tiempo</span>
                <span>Hora</span>
              </div>
              {(logs?.peticiones ?? []).length === 0 ? (
                <div className={s.empty}><ion-icon name="swap-horizontal-outline" /><p>Sin peticiones registradas</p></div>
              ) : (
                logs.peticiones.map(p => (
                  <div key={p.id} className={s.logRow}>
                    <span className={s.method} data-method={p.method}>{p.method}</span>
                    <span className={s.url} title={p.url}>{p.url}</span>
                    <span className={s.status} style={{ color: statusColor(p.status) }}>{p.status}</span>
                    <span className={s.tiempo}>{p.tiempo ? `${Math.round(p.tiempo)}ms` : "—"}</span>
                    <span className={s.ts}>{fmtTs(p.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "errores" && (
            <div className={s.erroresList}>
              {(logs?.errores ?? []).length === 0 ? (
                <div className={s.empty}><ion-icon name="checkmark-circle-outline" /><p>Sin errores registrados</p></div>
              ) : (
                logs.errores.map(e => (
                  <div key={e.id} className={s.errorCard}>
                    <div className={s.errorTop}>
                      <span className={s.errorMethod} data-method={e.method}>{e.method}</span>
                      <span className={s.errorUrl}>{e.url}</span>
                      <span className={s.errorTs}>{fmtFecha(e.timestamp)} {fmtTs(e.timestamp)}</span>
                    </div>
                    <div className={s.errorMsg}>{e.mensaje}</div>
                    {e.stack && <pre className={s.errorStack}>{e.stack}</pre>}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}