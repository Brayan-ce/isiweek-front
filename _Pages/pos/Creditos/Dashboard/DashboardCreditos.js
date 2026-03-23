"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./DashboardCreditos.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const ESTADO_META = {
  activo:         { color: s.badgeActivo,         label: "Activo"         },
  pagado:         { color: s.badgePagado,         label: "Pagado"         },
  incumplido:     { color: s.badgeIncumplido,     label: "Incumplido"     },
  reestructurado: { color: s.badgeReestructurado, label: "Reestructurado" },
  cancelado:      { color: s.badgeCancelado,      label: "Cancelado"      },
  vencida:        { color: s.badgeVencida,        label: "Vencida"        },
  pendiente:      { color: s.badgePendiente,      label: "Pendiente"      },
  parcial:        { color: s.badgeParcial,        label: "Parcial"        },
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getDashboardCreditos(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/creditos/dashboard/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function makeFmt(simbolo) {
  return (n) =>
    `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function diasRestantes(fecha) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const d    = new Date(fecha); d.setHours(0,0,0,0)
  const diff = Math.round((d - hoy) / 86400000)
  if (diff < 0)   return { label: `Vencida hace ${Math.abs(diff)}d`, clase: s.diasVencida }
  if (diff === 0) return { label: "Vence hoy",                       clase: s.diasHoy     }
  if (diff <= 3)  return { label: `Vence en ${diff}d`,               clase: s.diasUrgente }
  return              { label: `En ${diff} dias`,                    clase: s.diasNormal  }
}

function MiniBar({ data, fmt }) {
  const max = Math.max(...data.map(d => d.monto), 1)
  return (
    <div className={s.barChart}>
      {data.map((d, i) => (
        <div key={i} className={s.barCol}>
          <div className={s.barWrap}>
            <div className={s.bar} style={{ height: `${Math.max((d.monto / max) * 100, 2)}%` }} title={fmt(d.monto)} />
          </div>
          <span className={s.barLabel}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardCreditos() {
  const router = useRouter()
  const [empresaId,    setEmpresaId]    = useState(null)
  const [data,         setData]         = useState(null)
  const [cargando,     setCarga]        = useState(true)
  const [monedaActiva, setMonedaActiva] = useState(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCarga(true)
    const res = await getDashboardCreditos(empresaId)
    setData(res)
    if (res) setMonedaActiva(res.moneda_activa)
    setCarga(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeletonCard} />)}</div>
      <div className={s.skeletonBody} />
    </div>
  )

  if (!data) return (
    <div className={s.page}><div className={s.error}>No se pudo cargar el dashboard</div></div>
  )

  const { monedas, por_moneda } = data
  const monedaInfo  = monedas.find(m => m.id === monedaActiva) ?? monedas[0]
  const vista       = por_moneda[monedaActiva] ?? Object.values(por_moneda)[0]
  const hayMixtas   = monedas.length > 1

  if (!vista || !monedaInfo) return (
    <div className={s.page}><div className={s.error}>Sin contratos registrados</div></div>
  )

  const fmt = makeFmt(monedaInfo.simbolo)
  const { metricas, contratos_recientes, cuotas_proximas, alertas_mora, pagos_grafica } = vista

  const irAPagar = (c) => {
    const nombre = encodeURIComponent(c.cliente?.nombre ?? "")
    const cid    = c.cliente?.id ?? ""
    router.push(`/pos/creditos/pagos?q=${nombre}&cid=${cid}&ctid=${c.id}`)
  }

  return (
    <div className={s.page}>

      {hayMixtas && (
        <div className={s.monedaFiltro}>
          <ion-icon name="swap-horizontal-outline" />
          <span className={s.monedaFiltroLbl}>Ver cartera en:</span>
          <div className={s.monedaTabs}>
            {monedas.map(m => (
              <button
                key={m.id}
                className={`${s.monedaTab} ${monedaActiva === m.id ? s.monedaTabActiva : ""}`}
                onClick={() => setMonedaActiva(m.id)}
              >
                {m.simbolo} {m.codigo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={s.metricasGrid}>
        <div className={s.metricaCard}>
          <div className={s.metricaIconWrap} style={{ background: "rgba(29,111,206,0.1)" }}>
            <ion-icon name="document-text-outline" style={{ color: "#1d6fce" }} />
          </div>
          <div>
            <span className={s.metricaLabel}>Contratos activos</span>
            <span className={s.metricaValor}>{metricas.contratos_activos}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIconWrap} style={{ background: "rgba(16,185,129,0.1)" }}>
            <ion-icon name="wallet-outline" style={{ color: "#10b981" }} />
          </div>
          <div>
            <span className={s.metricaLabel}>Cartera activa</span>
            <span className={s.metricaValor}>{fmt(metricas.cartera_activa)}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIconWrap} style={{ background: "rgba(139,92,246,0.1)" }}>
            <ion-icon name="cash-outline" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <span className={s.metricaLabel}>Pagos del mes</span>
            <span className={s.metricaValor}>{fmt(metricas.pagos_mes_monto)}</span>
            <span className={s.metricaSub}>{metricas.pagos_mes_count} transacciones</span>
          </div>
        </div>
        <div className={`${s.metricaCard} ${metricas.cuotas_vencidas > 0 ? s.metricaAlerta : ""}`}>
          <div className={s.metricaIconWrap} style={{ background: "rgba(239,68,68,0.1)" }}>
            <ion-icon name="alert-circle-outline" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <span className={s.metricaLabel}>Cuotas vencidas</span>
            <span className={s.metricaValor} style={{ color: metricas.cuotas_vencidas > 0 ? "#ef4444" : undefined }}>
              {metricas.cuotas_vencidas}
            </span>
            <span className={s.metricaSub}>{fmt(metricas.monto_por_cobrar)} por cobrar</span>
          </div>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div className={s.colIzq}>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="bar-chart-outline" />Pagos ultimos 6 meses</div>
            {pagos_grafica?.length > 0
              ? <MiniBar data={pagos_grafica} fmt={fmt} />
              : <div className={s.empty}><p>Sin datos de pagos</p></div>
            }
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="document-text-outline" />Contratos recientes</div>
            {contratos_recientes.length === 0 ? (
              <div className={s.empty}><ion-icon name="document-outline" /><p>Sin contratos</p></div>
            ) : (
              <div className={s.tabla}>
                <div className={s.tablaHead}>
                  <span>Contrato</span>
                  <span>Cliente</span>
                  <span>Total</span>
                  <span>Saldo</span>
                  <span>Estado</span>
                  <span></span>
                </div>
                {contratos_recientes.map(c => (
                  <div key={c.id} className={s.tablaRow}>
                    <span className={s.contratoNum}>#{c.numero}</span>
                    <span className={s.clienteNombre}>{c.cliente?.nombre ?? ""}</span>
                    <span className={s.monto}>{fmt(c.monto_total)}</span>
                    <span className={s.monto}>{fmt(c.saldo_pendiente)}</span>
                    <span className={`${s.badge} ${ESTADO_META[c.estado]?.color ?? ""}`}>
                      {ESTADO_META[c.estado]?.label ?? c.estado}
                    </span>
                    <div className={s.tablaAcciones}>
                      <button className={s.btnVer} onClick={() => router.push(`/pos/creditos/contratos/${c.id}/ver`)}>
                        <ion-icon name="eye-outline" />
                        Ver
                      </button>
                      <button className={s.btnPagar} onClick={() => irAPagar(c)}>
                        <ion-icon name="cash-outline" />
                        Pagar
                      </button>
                    </div>

                    <div className={s.mobileCard}>
                      <div className={s.mobileTop}>
                        <div className={s.mobileTopLeft}>
                          <span className={s.contratoNum}>#{c.numero}</span>
                          <span className={s.mobileCliente}>{c.cliente?.nombre ?? ""}</span>
                        </div>
                        <span className={`${s.badge} ${ESTADO_META[c.estado]?.color ?? ""}`}>
                          {ESTADO_META[c.estado]?.label ?? c.estado}
                        </span>
                      </div>
                      <div className={s.mobileMontos}>
                        <div className={s.mobileMontoItem}>
                          <span className={s.mobileLbl}>Total</span>
                          <span className={s.mobileVal}>{fmt(c.monto_total)}</span>
                        </div>
                        <div className={s.mobileMontoItem}>
                          <span className={s.mobileLbl}>Saldo</span>
                          <span className={`${s.mobileVal} ${s.mobileValRojo}`}>{fmt(c.saldo_pendiente)}</span>
                        </div>
                      </div>
                      <div className={s.mobileBtns}>
                        <button className={s.btnVer} onClick={() => router.push(`/pos/creditos/contratos/${c.id}/ver`)}>
                          <ion-icon name="eye-outline" />
                          Ver contrato
                        </button>
                        <button className={s.btnPagar} onClick={() => irAPagar(c)}>
                          <ion-icon name="cash-outline" />
                          Ir a pagar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className={s.colDer}>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="time-outline" />
              Proximas a vencer
              {cuotas_proximas.length > 0 && <span className={s.cardBadge}>{cuotas_proximas.length}</span>}
            </div>
            {cuotas_proximas.length === 0 ? (
              <div className={s.empty}><ion-icon name="checkmark-circle-outline" /><p>Sin cuotas proximas</p></div>
            ) : cuotas_proximas.map(c => {
              const dias = diasRestantes(c.fecha_vencimiento)
              return (
                <div key={c.id} className={s.cuotaItem}>
                  <div className={s.cuotaInfo}>
                    <span className={s.cuotaCliente}>{c.contrato?.cliente?.nombre ?? ""}</span>
                    <span className={s.cuotaContrato}>Contrato #{c.contrato?.numero} · Cuota {c.numero}</span>
                    {c.contrato?.cliente?.telefono && (
                      <span className={s.cuotaTel}><ion-icon name="call-outline" />{c.contrato.cliente.telefono}</span>
                    )}
                  </div>
                  <div className={s.cuotaDer}>
                    <span className={s.cuotaMonto}>{fmt(c.monto)}</span>
                    <span className={`${s.diasBadge} ${dias.clase}`}>{dias.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={s.card}>
            <div className={`${s.cardTitulo} ${alertas_mora.length > 0 ? s.cardTituloAlerta : ""}`}>
              <ion-icon name="warning-outline" />
              Alertas de mora
              {alertas_mora.length > 0 && <span className={`${s.cardBadge} ${s.cardBadgeRojo}`}>{alertas_mora.length}</span>}
            </div>
            {alertas_mora.length === 0 ? (
              <div className={s.empty}><ion-icon name="shield-checkmark-outline" /><p>Sin cuotas en mora</p></div>
            ) : alertas_mora.map(c => {
              const dias = diasRestantes(c.fecha_vencimiento)
              return (
                <div key={c.id} className={`${s.cuotaItem} ${s.cuotaMora}`}>
                  <div className={s.cuotaInfo}>
                    <span className={s.cuotaCliente}>{c.contrato?.cliente?.nombre ?? ""}</span>
                    <span className={s.cuotaContrato}>Contrato #{c.contrato?.numero} · Cuota {c.numero}</span>
                    {c.contrato?.cliente?.telefono && (
                      <a href={`https://wa.me/${c.contrato.cliente.telefono}`} target="_blank" rel="noreferrer" className={s.waBtn}>
                        <ion-icon name="logo-whatsapp" />Contactar
                      </a>
                    )}
                  </div>
                  <div className={s.cuotaDer}>
                    <span className={s.cuotaMonto}>{fmt(c.monto)}</span>
                    {Number(c.mora) > 0 && <span className={s.cuotaMoraVal}>+{fmt(c.mora)} mora</span>}
                    <span className={`${s.diasBadge} ${dias.clase}`}>{dias.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}