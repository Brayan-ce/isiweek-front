"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import s from "./VerCaja.module.css"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
}

function fmtHora(f) {
  if (!f) return "—"
  return new Date(f).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
}

async function getSesion(id) {
  try {
    const res = await apiFetch(`/api/pos/cajas/sesion/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function VerCaja() {
  const router   = useRouter()
  const params   = useParams()
  const id       = params?.id

  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(true)
  const [usuarioId, setUsuarioId] = useState(null)
  const [moneda,   setMoneda]   = useState({ simbolo: "RD$", codigo: "DOP" })
  const simbolo = (moneda?.simbolo && String(moneda.simbolo).trim()) || "RD$"

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    apiFetch(`/api/pos/header/${usuarioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresa?.moneda) setMoneda(d.empresa.moneda) })
      .catch(() => {})
  }, [usuarioId])

  const cargar = useCallback(async () => {
    if (!id) return
    setCargando(true)
    const d = await getSesion(id)
    setDatos(d)
    setCargando(false)
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        <div className={s.skeleton} style={{ height: 60 }} />
        <div className={s.skeleton} style={{ height: 120 }} />
        <div className={s.skeleton} style={{ height: 300 }} />
      </div>
    </div>
  )

  if (!datos) return (
    <div className={s.page}>
      <div className={s.error}>
        <ion-icon name="alert-circle-outline" />
        <span>No se pudo cargar la sesión</span>
        <button onClick={() => router.back()}>Volver</button>
      </div>
    </div>
  )

  const { sesion, resumen, ventas, gastos } = datos
  const estaAbierta = sesion.estado === "abierta"

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <button className={s.btnVolver} onClick={() => router.back()}>
          <ion-icon name="arrow-back-outline" /> Volver
        </button>
        <div className={s.headerInfo}>
          <h1 className={s.titulo}>
            Sesión #{String(sesion.id).padStart(5, "0")}
          </h1>
          <span className={`${s.estadoBadge} ${estaAbierta ? s.badgeAbierta : s.badgeCerrada}`}>
            {estaAbierta ? <><span className={s.dot} />Abierta</> : "Cerrada"}
          </span>
        </div>
        <button className={s.btnEditar} onClick={() => router.push(`/pos/cajas/editar/${sesion.id}`)}>
          <ion-icon name="create-outline" /> Editar
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className={s.resumenGrid}>
        <div className={s.resumenCard}>
          <span className={s.resumenLabel}>Monto inicial</span>
          <span className={s.resumenValor}>{fmt(resumen.montoInicial, simbolo)}</span>
        </div>
        <div className={s.resumenCard}>
          <span className={s.resumenLabel}>Ventas</span>
          <span className={`${s.resumenValor} ${s.resumenPos}`}>{fmt(resumen.totalVentas, simbolo)}</span>
        </div>
        <div className={s.resumenCard}>
          <span className={s.resumenLabel}>Gastos</span>
          <span className={`${s.resumenValor} ${s.resumenNeg}`}>{fmt(resumen.totalGastos, simbolo)}</span>
        </div>
        <div className={`${s.resumenCard} ${s.resumenCardTotal}`}>
          <span className={s.resumenLabel}>Total en caja</span>
          <span className={`${s.resumenValor} ${s.resumenAzul}`}>{fmt(resumen.totalEnCaja, simbolo)}</span>
        </div>
        {resumen.saldoCierre != null && (
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Saldo cierre real</span>
            <span className={`${s.resumenValor} ${s.resumenAzul}`}>{fmt(resumen.saldoCierre, simbolo)}</span>
          </div>
        )}
        {resumen.diferencia != null && (
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Diferencia</span>
            <span className={`${s.resumenValor} ${resumen.diferencia < 0 ? s.resumenNeg : resumen.diferencia > 0 ? s.resumenPos : s.resumenAzul}`}>
              {resumen.diferencia >= 0 ? "+" : ""}{fmt(resumen.diferencia, simbolo)}
            </span>
          </div>
        )}
      </div>

      {/* Info turno + métodos */}
      <div className={s.bottomGrid}>
        <div className={s.seccionCard}>
          <div className={s.seccionTitulo}><ion-icon name="information-circle-outline" /> Información del turno</div>
          <div className={s.turnoInfo}>
            <div className={s.turnoRow}><span>Apertura</span><span>{fmtFecha(sesion.abierta_at)} {fmtHora(sesion.abierta_at)}</span></div>
            {sesion.cerrada_at && (
              <div className={s.turnoRow}><span>Cierre</span><span>{fmtFecha(sesion.cerrada_at)} {fmtHora(sesion.cerrada_at)}</span></div>
            )}
            <div className={s.turnoRow}><span>Ventas realizadas</span><span>{resumen.cantVentas}</span></div>
            <div className={s.turnoRow}><span>Cajero</span><span>{sesion.usuario?.nombre_completo ?? "—"}</span></div>
            {sesion.notas_cierre && (
              <div className={s.turnoRow}><span>Notas</span><span>{sesion.notas_cierre}</span></div>
            )}
          </div>
        </div>

        <div className={s.seccionCard}>
          <div className={s.seccionTitulo}><ion-icon name="pie-chart-outline" /> Desglose por método de pago</div>
          {!resumen.ventasPorMetodo?.length ? (
            <div className={s.seccionVacio}>Sin ventas en esta sesión</div>
          ) : (
            <div className={s.metodosList}>
              {resumen.ventasPorMetodo.map((m, i) => (
                <div key={i} className={s.metodoItem}>
                  <div className={s.metodoNombre}><ion-icon name="card-outline" />{m.nombre}</div>
                  <div className={s.metodoRight}>
                    <span className={s.metodoCant}>{m.cantidad} vta{m.cantidad !== 1 ? "s" : ""}</span>
                    <span className={s.metodoTotal}>{fmt(m.total, simbolo)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ventas */}
      {ventas?.length > 0 && (
        <div className={s.seccionCard}>
          <div className={s.seccionTitulo}><ion-icon name="receipt-outline" /> Ventas del turno ({ventas.length})</div>

          {/* Desktop table */}
          <div className={s.ventasTableWrap}>
            <div className={s.ventasHeader}>
              <span>#</span><span>Cliente</span><span>Método</span><span>Total</span><span>Hora</span><span>Estado</span><span>Acciones</span>
            </div>
            {ventas.map(v => (
              <div key={v.id} className={s.ventasRow}>
                <span className={s.ventaId}>#{String(v.id).padStart(6, "0")}</span>
                <span>{v.cliente?.nombre ?? "Consumidor final"}</span>
                <span>{v.metodo_pago?.nombre ?? "—"}</span>
                <span className={s.totalCell}>{fmt(v.total, simbolo)}</span>
                <span className={s.horaCell}>{fmtHora(v.created_at)}</span>
                <span className={`${s.badge} ${v.estado === "completada" ? s.badgeComp : v.estado === "cancelada" ? s.badgeCanc : s.badgePend}`}>
                  {v.estado}
                </span>
                <div className={s.ventaAcciones}>
                  <button className={s.ventaBtnPrint} title="Reimprimir" onClick={() => router.push(`/pos/vender/imprimir/${v.id}`)}>  
                    <ion-icon name="print-outline" />
                  </button>
                  <button className={s.ventaBtnVer} title="Ver detalle" onClick={() => router.push(`/pos/vender/imprimir/${v.id}`)}>
                    <ion-icon name="eye-outline" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className={s.ventasMobile}>
            {ventas.map(v => (
              <div key={`m-${v.id}`} className={s.ventaMobileCard}>
                <div className={s.ventaMobileTop}>
                  <span className={s.ventaId}>#{String(v.id).padStart(6, "0")}</span>
                  <span className={`${s.badge} ${v.estado === "completada" ? s.badgeComp : v.estado === "cancelada" ? s.badgeCanc : s.badgePend}`}>{v.estado}</span>
                </div>
                <div className={s.ventaMobileMid}>
                  <span className={s.ventaMobileCliente}>{v.cliente?.nombre ?? "Consumidor final"}</span>
                  <span className={s.ventaMobileMetodo}>{v.metodo_pago?.nombre ?? "—"}</span>
                </div>
                <div className={s.ventaMobileBot}>
                  <span className={s.ventaMobileHora}>{fmtHora(v.created_at)}</span>
                  <span className={s.ventaMobileTotal}>{fmt(v.total, simbolo)}</span>
                  <div className={s.ventaAcciones}>
                    <button className={s.ventaBtnPrint} title="Reimprimir" onClick={() => router.push(`/pos/vender/imprimir/${v.id}`)}>  
                      <ion-icon name="print-outline" />
                    </button>
                    <button className={s.ventaBtnVer} title="Ver detalle" onClick={() => router.push(`/pos/vender/imprimir/${v.id}`)}>  
                      <ion-icon name="eye-outline" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos */}
      {gastos?.length > 0 && (
        <div className={s.seccionCard}>
          <div className={s.seccionTitulo}><ion-icon name="trending-down-outline" /> Gastos del turno ({gastos.length})</div>
          {gastos.map(g => (
            <div key={g.id} className={s.gastoItem}>
              <div className={s.gastoInfo}>
                <span className={s.gastoConcepto}>{g.concepto}</span>
                {g.tipo && <span className={s.gastoTipo}>{g.tipo}</span>}
              </div>
              <div className={s.gastoRight}>
                <span className={s.gastoMonto}>-{fmt(g.monto, simbolo)}</span>
                <span className={s.gastoHora}>{fmtHora(g.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
