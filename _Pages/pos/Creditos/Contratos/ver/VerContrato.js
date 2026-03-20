"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./VerContrato.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function makeFmt(simbolo) {
  return (n) =>
    `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_CONTRATO = {
  activo:         { label: "Activo",         cls: s.badgeActivo         },
  pagado:         { label: "Pagado",         cls: s.badgePagado         },
  incumplido:     { label: "Incumplido",     cls: s.badgeIncumplido     },
  reestructurado: { label: "Reestructurado", cls: s.badgeReestructurado },
  cancelado:      { label: "Cancelado",      cls: s.badgeCancelado      },
}

const ESTADO_CUOTA = {
  pendiente: { label: "Pendiente", cls: s.cuotaPendiente },
  pagada:    { label: "Pagada",    cls: s.cuotaPagada    },
  vencida:   { label: "Vencida",   cls: s.cuotaVencida   },
  parcial:   { label: "Parcial",   cls: s.cuotaParcial   },
}

function diasRestantes(fecha) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const d    = new Date(fecha); d.setHours(0,0,0,0)
  const diff = Math.round((d - hoy) / 86400000)
  if (diff < 0)   return { label: `Vencida ${Math.abs(diff)}d`, cls: s.diasVencida }
  if (diff === 0) return { label: "Hoy",                        cls: s.diasHoy     }
  if (diff <= 5)  return { label: `En ${diff}d`,                cls: s.diasUrgente }
  return              { label: `En ${diff}d`,                   cls: s.diasNormal  }
}

export default function VerContrato({ id }) {
  const router     = useRouter()
  const contratoId = Number(id)

  const [empresaId, setEmpresaId] = useState(null)
  const [contrato,  setContrato]  = useState(null)
  const [pagos,     setPagos]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [tab,       setTab]       = useState("cuotas")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const [rC, rP] = await Promise.all([
        fetch(`${API}/api/pos/creditos/contratos/${empresaId}/${contratoId}`),
        fetch(`${API}/api/pos/creditos/contratos/${empresaId}/${contratoId}/pagos`),
      ])
      if (rC.ok) setContrato(await rC.json())
      if (rP.ok) setPagos(await rP.json())
    } catch {}
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonBar} />
      <div className={s.skeletonMetricas}>
        {[...Array(4)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
      </div>
      <div className={s.skeletonBody} />
    </div>
  )

  if (!contrato) return (
    <div className={s.page}>
      <div className={s.alertError}>No se pudo cargar el contrato</div>
    </div>
  )

  const fmt  = makeFmt(contrato.moneda?.simbolo ?? "RD$")
  const est  = ESTADO_CONTRATO[contrato.estado] ?? { label: contrato.estado, cls: "" }
  const progreso = contrato.total_pagar > 0
    ? Math.round(((contrato.total_pagar - contrato.saldo_pendiente) / contrato.total_pagar) * 100)
    : 0

  const cuotasPagadas = contrato.cuotas?.filter(c => c.estado === "pagada") ?? []

  const irAPagar = () => {
    const clienteId = contrato.cliente?.id
    const nombre    = encodeURIComponent(contrato.cliente?.nombre ?? "")
    router.push(`/pos/creditos/pagos?q=${nombre}&cid=${clienteId}&ctid=${contratoId}`)
  }

  return (
    <div className={s.page}>

      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push("/pos/creditos/contratos")}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <div className={s.tituloRow}>
            <h1 className={s.titulo}>#{contrato.numero}</h1>
            <span className={`${s.badge} ${est.cls}`}>{est.label}</span>
          </div>
          <span className={s.subtitulo}>
            {contrato.cliente?.nombre} · {contrato.plan?.nombre} · {contrato.meses} meses
          </span>
        </div>
        <div className={s.topAcciones}>
          <button className={s.btnIrPagar} onClick={irAPagar}>
            <ion-icon name="cash-outline" />
            Ir a pagar
          </button>
          <button className={s.btnEditar} onClick={() => router.push(`/pos/creditos/contratos/${contratoId}/editar`)}>
            <ion-icon name="create-outline" />
            Editar
          </button>
        </div>
      </div>

      <div className={s.metricasGrid}>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(29,111,206,0.1)" }}>
            <ion-icon name="cash-outline" style={{ color: "#1d6fce" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Monto total</span>
            <span className={s.metricaVal}>{fmt(contrato.monto_total)}</span>
            <span className={s.metricaSub}>Financiado {fmt(contrato.monto_financiado)}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(239,68,68,0.1)" }}>
            <ion-icon name="alert-circle-outline" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Saldo pendiente</span>
            <span className={s.metricaVal} style={{ color: contrato.saldo_pendiente > 0 ? "#ef4444" : "#10b981" }}>
              {fmt(contrato.saldo_pendiente)}
            </span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(16,185,129,0.1)" }}>
            <ion-icon name="wallet-outline" style={{ color: "#10b981" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Cuota mensual</span>
            <span className={s.metricaVal}>{fmt(contrato.cuota_mensual)}</span>
            <span className={s.metricaSub}>{Number(contrato.tasa_anual_pct).toFixed(2)}% anual</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(139,92,246,0.1)" }}>
            <ion-icon name="time-outline" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Progreso</span>
            <span className={s.metricaVal}>{progreso}%</span>
            <span className={s.metricaSub}>{cuotasPagadas.length} de {contrato.cuotas?.length ?? 0} cuotas</span>
          </div>
        </div>
      </div>

      <div className={s.progresoWrap}>
        <div className={s.progresoBar}>
          <div className={s.progresoFill} style={{ width: `${progreso}%` }} />
        </div>
        <div className={s.progresoLabels}>
          <span>{fmtFecha(contrato.fecha_inicio)}</span>
          <span>{progreso}% pagado</span>
          <span>{fmtFecha(contrato.fecha_fin)}</span>
        </div>
      </div>

      <div className={s.mainGrid}>

        <div className={s.colInfo}>
          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="person-outline" />Cliente</div>
            <div className={s.infoList}>
              <div className={s.infoItem}><span className={s.infoLbl}>Nombre</span><span className={s.infoVal}>{contrato.cliente?.nombre ?? ""}</span></div>
              {contrato.cliente?.cedula_rnc && <div className={s.infoItem}><span className={s.infoLbl}>Cédula</span><span className={s.infoVal}>{contrato.cliente.cedula_rnc}</span></div>}
              {contrato.cliente?.telefono && (
                <div className={s.infoItem}>
                  <span className={s.infoLbl}>Teléfono</span>
                  <a href={`https://wa.me/${contrato.cliente.telefono}`} target="_blank" rel="noreferrer" className={s.waLink}>
                    <ion-icon name="logo-whatsapp" />{contrato.cliente.telefono}
                  </a>
                </div>
              )}
              {contrato.cliente?.email && <div className={s.infoItem}><span className={s.infoLbl}>Email</span><span className={s.infoVal}>{contrato.cliente.email}</span></div>}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="document-text-outline" />Detalles del contrato</div>
            <div className={s.infoList}>
              <div className={s.infoItem}><span className={s.infoLbl}>Plan</span><span className={s.infoVal}>{contrato.plan?.nombre ?? ""}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Plazo</span><span className={s.infoVal}>{contrato.meses} meses</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Tasa anual</span><span className={s.infoVal}>{Number(contrato.tasa_anual_pct).toFixed(2)}%</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Entrada</span><span className={s.infoVal}>{fmt(contrato.monto_inicial)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Total intereses</span><span className={s.infoVal}>{fmt(contrato.total_intereses)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Total a pagar</span><span className={s.infoVal}>{fmt(contrato.total_pagar)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Moneda</span><span className={s.infoVal}>{contrato.moneda?.simbolo ?? "—"}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Inicio</span><span className={s.infoVal}>{fmtFecha(contrato.fecha_inicio)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Fin</span><span className={s.infoVal}>{fmtFecha(contrato.fecha_fin)}</span></div>
              {contrato.notas && <div className={s.infoItem}><span className={s.infoLbl}>Notas</span><span className={s.infoVal}>{contrato.notas}</span></div>}
            </div>
          </div>

          {contrato.fiadores?.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="people-outline" />Fiadores</div>
              {contrato.fiadores.map(f => (
                <div key={f.id} className={s.fiadorItem}>
                  <span className={s.fiadorNombre}>{f.nombre}</span>
                  {f.cedula   && <span className={s.fiadorMeta}>{f.cedula}</span>}
                  {f.telefono && (
                    <a href={`https://wa.me/${f.telefono}`} target="_blank" rel="noreferrer" className={s.waLink}>
                      <ion-icon name="logo-whatsapp" />{f.telefono}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {contrato.activos?.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="cube-outline" />Activos / Garantías</div>
              {contrato.activos.map(a => (
                <div key={a.id} className={s.activoItem}>
                  <div className={s.activoInfo}>
                    <span className={s.activoNombre}>{a.nombre}</span>
                    {a.serial      && <span className={s.activoMeta}>S/N: {a.serial}</span>}
                    {a.descripcion && <span className={s.activoMeta}>{a.descripcion}</span>}
                  </div>
                  {Number(a.valor) > 0 && <span className={s.activoValor}>{fmt(a.valor)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={s.colTabs}>
          <div className={s.card}>
            <div className={s.tabs}>
              <button className={`${s.tab} ${tab === "cuotas" ? s.tabActivo : ""}`} onClick={() => setTab("cuotas")}>
                Cuotas <span className={s.tabCount}>{contrato.cuotas?.length ?? 0}</span>
              </button>
              <button className={`${s.tab} ${tab === "pagos" ? s.tabActivo : ""}`} onClick={() => setTab("pagos")}>
                Ya Pagados <span className={s.tabCount}>{pagos.length}</span>
              </button>
            </div>

            {tab === "cuotas" && (
              <div className={s.cuotasLista}>
                {contrato.cuotas?.map(c => {
                  const est  = ESTADO_CUOTA[c.estado] ?? { label: c.estado, cls: "" }
                  const dias = c.estado !== "pagada" ? diasRestantes(c.fecha_vencimiento) : null
                  return (
                    <div key={c.id} className={`${s.cuotaRow} ${c.estado === "vencida" ? s.cuotaRowVencida : ""}`}>
                      <span className={s.cuotaNum}>#{c.numero}</span>
                      <div className={s.cuotaFechas}>
                        <span className={s.cuotaFecha}>{fmtFecha(c.fecha_vencimiento)}</span>
                        {dias && <span className={`${s.diasBadge} ${dias.cls}`}>{dias.label}</span>}
                      </div>
                      <div className={s.cuotaMontos}>
                        <span className={s.cuotaMonto}>{fmt(c.monto)}</span>
                        <span className={s.cuotaDetalle}>K:{fmt(c.capital)} I:{fmt(c.interes)}{Number(c.mora) > 0 ? ` M:${fmt(c.mora)}` : ""}</span>
                      </div>
                      <span className={`${s.cuotaBadge} ${est.cls}`}>{est.label}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === "pagos" && (
              pagos.length === 0 ? (
                <div className={s.empty}><ion-icon name="cash-outline" /><p>Sin pagos registrados</p></div>
              ) : (
                <div className={s.pagosLista}>
                  {pagos.map(p => (
                    <div key={p.id} className={s.pagoRow}>
                      <div className={s.pagoInfo}>
                        <span className={s.pagoMonto}>{fmt(p.monto)}</span>
                        <span className={s.pagoMeta}>{p.metodo_pago?.nombre ?? ""} · {p.usuario?.nombre_completo ?? ""}</span>
                        {p.referencia && <span className={s.pagoRef}>Ref: {p.referencia}</span>}
                      </div>
                      <div className={s.pagoDer}>
                        <span className={s.pagoFecha}>{fmtFecha(p.fecha)}</span>
                        <div className={s.pagoDesglose}>
                          <span>K {fmt(p.monto_capital)}</span>
                          <span>I {fmt(p.monto_interes)}</span>
                          {Number(p.monto_mora) > 0 && <span className={s.pagoMoraVal}>M {fmt(p.monto_mora)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  )
}