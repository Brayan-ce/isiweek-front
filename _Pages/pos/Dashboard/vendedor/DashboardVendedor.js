"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getDashboardVendedor } from "../api"
import s from "../Dashboard.module.css"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtHora(f) {
  if (!f) return ""
  return new Date(f).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
}

export default function DashboardVendedor() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [usuarioId, setUsuarioId] = useState(null)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!empresaId || !usuarioId) return
    getDashboardVendedor(usuarioId, empresaId).then(d => { setData(d); setCargando(false) })
  }, [empresaId, usuarioId])

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  if (!data) return (
    <div className={s.page}>
      <div className={s.empty}><ion-icon name="alert-circle-outline" /><p>Error al cargar datos</p></div>
    </div>
  )

  const { ventasHoy, totalHoy, meta, ultimasVentas, cajaActiva, simbolo } = data
  const m = simbolo ?? "$"
  const progreso = meta > 0 ? Math.min((totalHoy / meta) * 100, 100) : 0

  return (
    <div className={s.page}>
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(29,111,206,0.1)", color: "#1d6fce" }}>
            <ion-icon name="today-outline" />
          </div>
          <div className={s.statInfo}>
            <div className={s.statLabel}>Mis ventas hoy</div>
            <div className={s.statValor}>{m} {fmt(totalHoy)}</div>
            <div className={s.statSub}>{ventasHoy} transacciones</div>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
            <ion-icon name="wallet-outline" />
          </div>
          <div className={s.statInfo}>
            <div className={s.statLabel}>Caja activa</div>
            <div className={s.statValor}>{cajaActiva ? cajaActiva.caja.nombre : "Sin caja"}</div>
            <div className={s.statSub}>{cajaActiva ? `${m} ${fmt(cajaActiva.caja.saldo_actual)}` : "Ninguna abierta"}</div>
          </div>
        </div>
      </div>

      {meta > 0 && (
        <div className={s.metaCard}>
          <div className={s.metaTop}>
            <div className={s.metaLabel}><ion-icon name="flag-outline" /> Meta diaria</div>
            <div className={s.metaValores}>
              <span className={s.metaActual}>{m} {fmt(totalHoy)}</span>
              <span className={s.metaDe}>/ {m} {fmt(meta)}</span>
            </div>
          </div>
          <div className={s.progressBar}>
            <div
              className={s.progressFill}
              style={{
                width: `${progreso}%`,
                background: progreso >= 100 ? "#22c55e" : progreso >= 60 ? "#f59e0b" : "#1d6fce"
              }}
            />
          </div>
          <div className={s.metaPct}>{progreso.toFixed(1)}% completado</div>
        </div>
      )}

      <div className={s.tableCard}>
        <div className={s.cardTitle}><ion-icon name="receipt-outline" /> Mis ultimas ventas</div>
        {ultimasVentas.length === 0 ? (
          <div className={s.emptyChart}>Sin ventas hoy</div>
        ) : (
          <div className={s.tableWrap}>
            <div className={`${s.tableHeader} ${s.tableHeaderVendedor}`}>
              <span>Cliente</span>
              <span>Metodo</span>
              <span>Total</span>
              <span>Hora</span>
            </div>
            {ultimasVentas.map(v => (
              <div key={v.id} className={`${s.tableRow} ${s.tableRowVendedor}`}>
                <span>{v.cliente?.nombre ?? "Consumidor final"}</span>
                <span>{v.metodo_pago?.nombre ?? "—"}</span>
                <span className={s.totalCell}>{m} {fmt(v.total)}</span>
                <span className={s.fechaCell}>{fmtHora(v.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}