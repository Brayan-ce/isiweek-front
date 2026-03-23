"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./VerPlan.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(n) { return `${Number(n ?? 0).toFixed(2)}%` }

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_CONTRATO = {
  activo:         { label: "Activo",         cls: s.badgeActivo         },
  pagado:         { label: "Pagado",         cls: s.badgePagado         },
  incumplido:     { label: "Incumplido",     cls: s.badgeIncumplido     },
  reestructurado: { label: "Reestructurado", cls: s.badgeReestructurado },
  cancelado:      { label: "Cancelado",      cls: s.badgeCancelado      },
}

export default function VerPlan({ id }) {
  const router  = useRouter()
  const planId  = Number(id)

  const [empresaId, setEmpresaId] = useState(null)
  const [plan, setPlan]           = useState(null)
  const [contratos, setContratos] = useState([])
  const [pagos, setPagos]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [tab, setTab]             = useState("contratos")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const [resPlan, resContratos, resPagos] = await Promise.all([
        fetch(`${API}/api/pos/creditos/planes/${empresaId}/${planId}`),
        fetch(`${API}/api/pos/creditos/planes/${empresaId}/${planId}/contratos`),
        fetch(`${API}/api/pos/creditos/planes/${empresaId}/${planId}/pagos`),
      ])
      if (resPlan.ok)      setPlan(await resPlan.json())
      if (resContratos.ok) setContratos(await resContratos.json())
      if (resPagos.ok)     setPagos(await resPagos.json())
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

  if (!plan) return (
    <div className={s.page}>
      <div className={s.alertError}>No se pudo cargar el plan</div>
    </div>
  )

  const carteraActiva = contratos
    .filter(c => c.estado === "activo")
    .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0)

  const totalPagado      = pagos.reduce((a, p) => a + Number(p.monto ?? 0), 0)
  const contratosActivos = contratos.filter(c => c.estado === "activo").length
  const credito          = plan.opciones?.filter(o => o.tipo === "credito") ?? []
  const cash             = plan.opciones?.filter(o => o.tipo === "cash")    ?? []

  return (
    <div className={s.page}>

      {/* Top bar */}
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push("/pos/creditos/planes")}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <div className={s.tituloRow}>
            <h1 className={s.titulo}>{plan.nombre}</h1>
            {plan.codigo && <span className={s.planCodigo}>{plan.codigo}</span>}
            <span className={`${s.planEstado} ${plan.activo ? s.estadoActivo : s.estadoInactivo}`}>
              {plan.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          {plan.descripcion && <p className={s.subtitulo}>{plan.descripcion}</p>}
        </div>
        <button
          className={s.btnEditar}
          onClick={() => router.push(`/pos/creditos/planes/${planId}/editar`)}
        >
          <ion-icon name="create-outline" /> Editar
        </button>
      </div>

      {/* Métricas */}
      <div className={s.metricasGrid}>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(29,111,206,0.1)" }}>
            <ion-icon name="document-text-outline" style={{ color: "#1d6fce" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Contratos totales</span>
            <span className={s.metricaVal}>{contratos.length}</span>
            <span className={s.metricaSub}>{contratosActivos} activos</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(16,185,129,0.1)" }}>
            <ion-icon name="wallet-outline" style={{ color: "#10b981" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Cartera activa</span>
            <span className={s.metricaVal}>{fmt(carteraActiva)}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(139,92,246,0.1)" }}>
            <ion-icon name="cash-outline" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Total recaudado</span>
            <span className={s.metricaVal}>{fmt(totalPagado)}</span>
            <span className={s.metricaSub}>{pagos.length} pagos</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(245,158,11,0.1)" }}>
            <ion-icon name="time-outline" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Plazos</span>
            <span className={s.metricaVal}>{plan.opciones?.length ?? 0}</span>
          </div>
        </div>
      </div>

      <div className={s.mainGrid}>

        {/* Columna info */}
        <div className={s.colInfo}>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="settings-outline" />Configuración</div>
            <div className={s.infoList}>
              <div className={s.infoItem}>
                <span className={s.infoLbl}>Mora</span>
                <span className={s.infoVal}>{pct(plan.mora_pct)}</span>
              </div>
              <div className={s.infoItem}>
                <span className={s.infoLbl}>Días de gracia</span>
                <span className={s.infoVal}>{plan.dias_gracia} días</span>
              </div>
              <div className={s.infoItem}>
                <span className={s.infoLbl}>Pago anticipado</span>
                <span className={s.infoVal}>{plan.permite_anticipado ? "Sí" : "No"}</span>
              </div>
              {plan.permite_anticipado && (
                <>
                  <div className={s.infoItem}>
                    <span className={s.infoLbl}>Desc. anticipado</span>
                    <span className={s.infoVal}>{pct(plan.descuento_anticipado_pct)}</span>
                  </div>
                  <div className={s.infoItem}>
                    <span className={s.infoLbl}>Cuotas mín. anticipadas</span>
                    <span className={s.infoVal}>{plan.cuotas_minimas_anticipadas}</span>
                  </div>
                </>
              )}
              <div className={s.infoItem}>
                <span className={s.infoLbl}>Requiere fiador</span>
                <span className={s.infoVal}>{plan.requiere_fiador ? "Sí" : "No"}</span>
              </div>
              <div className={s.infoItem}>
                <span className={s.infoLbl}>Creado</span>
                <span className={s.infoVal}>{fmtFecha(plan.created_at)}</span>
              </div>
            </div>
          </div>

          {plan.opciones?.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="time-outline" />Plazos</div>
              {credito.length > 0 && (
                <div className={s.opcionGrupo}>
                  <span className={s.opcionGrupoLbl}>Crédito</span>
                  {credito.map(op => (
                    <div key={op.id} className={s.opcionRow}>
                      <span className={s.opcionMeses}>{op.meses} meses</span>
                      <span className={s.dot} />
                      <span className={s.opcionTasa}>{pct(op.tasa_anual_pct)} anual</span>
                      {Number(op.inicial_pct) > 0 && (
                        <><span className={s.dot} /><span className={s.opcionInicial}>{pct(op.inicial_pct)} inicial</span></>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {cash.length > 0 && (
                <div className={s.opcionGrupo}>
                  <span className={s.opcionGrupoLbl}>Cash</span>
                  {cash.map(op => (
                    <div key={op.id} className={s.opcionRow}>
                      <span className={s.opcionMeses}>{op.meses} meses</span>
                      {Number(op.inicial_pct) > 0 && (
                        <><span className={s.dot} /><span className={s.opcionInicial}>{pct(op.inicial_pct)} inicial</span></>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Columna tabs */}
        <div className={s.colTabs}>
          <div className={s.card}>
            <div className={s.tabs}>
              <button
                className={`${s.tab} ${tab === "contratos" ? s.tabActivo : ""}`}
                onClick={() => setTab("contratos")}
              >
                Contratos
                <span className={s.tabCount}>{contratos.length}</span>
              </button>
              <button
                className={`${s.tab} ${tab === "pagos" ? s.tabActivo : ""}`}
                onClick={() => setTab("pagos")}
              >
                Pagos
                <span className={s.tabCount}>{pagos.length}</span>
              </button>
            </div>

            {tab === "contratos" && (
              contratos.length === 0 ? (
                <div className={s.empty}>
                  <ion-icon name="document-outline" />
                  <p>Sin contratos asociados</p>
                </div>
              ) : (
                <div className={s.tablaWrap}>
                  <div className={s.tablaHead}>
                    <span>Contrato</span>
                    <span>Cliente</span>
                    <span>Total</span>
                    <span>Saldo</span>
                    <span>Estado</span>
                    <span>Fecha</span>
                  </div>
                  {contratos.map(c => {
                    const est = ESTADO_CONTRATO[c.estado] ?? { label: c.estado, cls: "" }
                    return (
                      <div key={c.id} className={s.tablaRow}>
                        <span className={s.contratoNum}>#{c.numero}</span>
                        <span className={s.clienteNombre}>{c.cliente?.nombre ?? "—"}</span>
                        <span className={s.montoTxt}>{fmt(c.monto_total)}</span>
                        <span className={s.montoTxt}>{fmt(c.saldo_pendiente)}</span>
                        <span className={`${s.badge} ${est.cls}`}>{est.label}</span>
                        <span className={s.fechaTxt}>{fmtFecha(c.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {tab === "pagos" && (
              pagos.length === 0 ? (
                <div className={s.empty}>
                  <ion-icon name="cash-outline" />
                  <p>Sin pagos registrados</p>
                </div>
              ) : (
                <div className={s.tablaWrap}>
                  <div className={`${s.tablaHead} ${s.tablaHeadPagos}`}>
                    <span>Contrato</span>
                    <span>Cliente</span>
                    <span>Monto</span>
                    <span>Método</span>
                    <span>Fecha</span>
                  </div>
                  {pagos.map(p => (
                    <div key={p.id} className={`${s.tablaRow} ${s.tablaRowPagos}`}>
                      <span className={s.contratoNum}>#{p.contrato?.numero ?? "—"}</span>
                      <span className={s.clienteNombre}>{p.contrato?.cliente?.nombre ?? "—"}</span>
                      <span className={s.montoTxt}>{fmt(p.monto)}</span>
                      <span className={s.metodoPago}>{p.metodo_pago?.nombre ?? "—"}</span>
                      <span className={s.fechaTxt}>{fmtFecha(p.fecha)}</span>
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