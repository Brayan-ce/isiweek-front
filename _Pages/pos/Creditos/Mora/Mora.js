"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Mora.module.css"

const API          = process.env.NEXT_PUBLIC_BACKEND_URL  ?? "http://localhost:3001"
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000"

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

function agruparPorMoneda(items, getSimboloFn, getMontoFn) {
  const grupos = {}
  for (const item of items) {
    const sim = getSimboloFn(item) ?? "?"
    grupos[sim] = (grupos[sim] ?? 0) + Number(getMontoFn(item) ?? 0)
  }
  return Object.entries(grupos)
    .filter(([, m]) => m > 0)
    .map(([sim, monto]) => makeFmt(sim)(monto))
    .join(" · ") || "—"
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function abrirWhatsApp(telefono, mensaje) {
  const tel = (telefono ?? "").replace(/\D/g, "")
  if (!tel) return
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank")
}

function mensajeVencida(cuota, fmt) {
  const nombre   = cuota.contrato?.cliente?.nombre ?? "cliente"
  const contrato = cuota.contrato?.numero ?? ""
  const fecha    = fmtFecha(cuota.fecha_vencimiento)
  const monto    = fmt(cuota.monto)
  const mora     = cuota.mora_calculada > 0 ? `\nMora acumulada: ${fmt(cuota.mora_calculada)}` : ""
  const token    = cuota.contrato?.cliente?.token_deuda
  const link     = token ? `\nVe el detalle de tu deuda aquí: ${FRONTEND_URL}/deuda/${token}` : ""
  return `Hola ${nombre}, te recordamos que la cuota #${cuota.numero} del contrato #${contrato} venció el ${fecha} por un monto de ${monto}.${mora}${link}\n\nPor favor comunícate con nosotros para regularizar tu situación. ¡Gracias!`
}

function mensajeProxima(cuota, fmt) {
  const nombre   = cuota.contrato?.cliente?.nombre ?? "cliente"
  const contrato = cuota.contrato?.numero ?? ""
  const fecha    = fmtFecha(cuota.fecha_vencimiento)
  const monto    = fmt(cuota.monto)
  const dias     = cuota.dias_restantes
  const token    = cuota.contrato?.cliente?.token_deuda
  const link     = token ? `\nVe el detalle de tu deuda aquí: ${FRONTEND_URL}/deuda/${token}` : ""
  const cuandoStr = dias === 0 ? "hoy" : `en ${dias} día${dias !== 1 ? "s" : ""}`
  return `Hola ${nombre}, te recordamos que la cuota #${cuota.numero} del contrato #${contrato} vence ${cuandoStr} (${fecha}) por un monto de ${monto}.${link}\n\n¡Gracias por mantenerte al día!`
}

function ModalPagoMora({ cuota, empresaId, payload, metodos, onClose, onPagado }) {
  const simbolo = cuota.contrato?.moneda?.simbolo ?? "RD$"
  const fmt     = makeFmt(simbolo)

  const [monto,     setMonto]     = useState(String(Number(cuota.mora_calculada ?? cuota.mora ?? 0).toFixed(2)))
  const [metodo,    setMetodo]    = useState("")
  const [ref,       setRef]       = useState("")
  const [notas,     setNotas]     = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState("")

  const pagar = async () => {
    if (!monto || Number(monto) <= 0) { setError("Ingresa un monto válido"); return }
    setError(""); setGuardando(true)
    try {
      const res = await fetch(
        `${API}/api/pos/creditos/mora/${empresaId}/cuotas/${cuota.id}/pagar`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monto_mora:     Number(monto),
            metodo_pago_id: metodo || null,
            referencia:     ref    || null,
            notas:          notas  || null,
            usuario_id:     payload.id,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al registrar pago")
      onPagado()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <span className={s.modalTitulo}>Registrar pago de mora</span>
          <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        </div>
        <div className={s.modalBody}>
          {error && <div className={s.alertError}>{error}</div>}
          <div className={s.moraInfo}>
            <div className={s.moraInfoItem}>
              <span className={s.moraInfoLbl}>Cliente</span>
              <span className={s.moraInfoVal}>{cuota.contrato?.cliente?.nombre ?? ""}</span>
            </div>
            <div className={s.moraInfoItem}>
              <span className={s.moraInfoLbl}>Contrato</span>
              <span className={s.moraInfoVal}>#{cuota.contrato?.numero ?? ""}</span>
            </div>
            <div className={s.moraInfoItem}>
              <span className={s.moraInfoLbl}>Cuota</span>
              <span className={s.moraInfoVal}>#{cuota.numero} · {fmtFecha(cuota.fecha_vencimiento)}</span>
            </div>
            <div className={s.moraInfoItem}>
              <span className={s.moraInfoLbl}>Mora calculada</span>
              <span className={s.moraInfoValRojo}>{fmt(cuota.mora_calculada)}</span>
            </div>
            <div className={s.moraInfoItem}>
              <span className={s.moraInfoLbl}>Días vencida</span>
              <span className={s.moraInfoVal}>{cuota.dias_vencida} días ({cuota.dias_con_mora} con mora)</span>
            </div>
          </div>
          <div className={s.campo}>
            <label>Monto de mora a pagar *</label>
            <div className={s.inputPrefijo}>
              <span>{simbolo}</span>
              <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
          </div>
          <div className={s.campo}>
            <label>Método de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="">Seleccionar...</option>
              {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className={s.campo}>
            <label>Referencia <span className={s.opc}>(opcional)</span></label>
            <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Nro. transferencia, cheque..." />
          </div>
          <div className={s.campo}>
            <label>Notas <span className={s.opc}>(opcional)</span></label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
          </div>
        </div>
        <div className={s.modalFoot}>
          <button className={s.btnCancelar} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className={s.btnPagar} onClick={pagar} disabled={guardando}>
            {guardando ? "Registrando..." : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalMasiva({ empresaId, totalCuotas, onClose, onAplicada }) {
  const [aplicando, setAplicando] = useState(false)
  const [error,     setError]     = useState("")

  const aplicar = async () => {
    setAplicando(true); setError("")
    try {
      const res  = await fetch(`${API}/api/pos/creditos/mora/${empresaId}/aplicar-masiva`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al aplicar")
      onAplicada(data.actualizadas)
    } catch (e) {
      setError(e.message)
      setAplicando(false)
    }
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <span className={s.modalTitulo}>Aplicar mora masiva</span>
          <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        </div>
        <div className={s.modalBody}>
          {error && <div className={s.alertError}>{error}</div>}
          <div className={s.masivaBanner}>
            <ion-icon name="warning-outline" />
            <p>Esto calculará y aplicará la mora a <strong>{totalCuotas} cuotas vencidas</strong> según el porcentaje de mora de cada plan. Las cuotas dentro del período de gracia no serán afectadas.</p>
          </div>
        </div>
        <div className={s.modalFoot}>
          <button className={s.btnCancelar} onClick={onClose} disabled={aplicando}>Cancelar</button>
          <button className={s.btnAplicarModal} onClick={aplicar} disabled={aplicando}>
            {aplicando ? "Aplicando..." : "Aplicar mora masiva"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Mora() {
  const router = useRouter()
  const [payload,     setPayload]     = useState(null)
  const [empresaId,   setEmpresaId]   = useState(null)
  const [tab,         setTab]         = useState("vencidas")
  const [vencidas,    setVencidas]    = useState([])
  const [alertas,     setAlertas]     = useState([])
  const [proximas,    setProximas]    = useState([])
  const [historial,   setHistorial]   = useState([])
  const [metodos,     setMetodos]     = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [modalPago,   setModalPago]   = useState(null)
  const [modalMasiva, setModalMasiva] = useState(false)
  const [aplicandoId, setAplicandoId] = useState(null)
  const [busqueda,    setBusqueda]    = useState("")
  const [toast,       setToast]       = useState(null)

  useEffect(() => {
    const p = getTokenPayload()
    if (!p) { router.push("/pos/login"); return }
    setPayload(p); setEmpresaId(p.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const [rV, rA, rP, rH, rM] = await Promise.all([
        fetch(`${API}/api/pos/creditos/mora/${empresaId}/vencidas`),
        fetch(`${API}/api/pos/creditos/mora/${empresaId}/alertas`),
        fetch(`${API}/api/pos/creditos/mora/${empresaId}/proximas`),
        fetch(`${API}/api/pos/creditos/mora/${empresaId}/historial`),
        fetch(`${API}/api/pos/creditos/pagos/metodos`),
      ])
      if (rV.ok) setVencidas(await rV.json())
      if (rA.ok) setAlertas(await rA.json())
      if (rP.ok) setProximas(await rP.json())
      if (rH.ok) setHistorial(await rH.json())
      if (rM.ok) setMetodos(await rM.json())
    } catch {}
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  const mostrarToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const aplicarCuota = async (cuota) => {
    const fmt = makeFmt(cuota.contrato?.moneda?.simbolo ?? "RD$")
    setAplicandoId(cuota.id)
    try {
      const res  = await fetch(`${API}/api/pos/creditos/mora/${empresaId}/cuotas/${cuota.id}/aplicar`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error")
      mostrarToast(`Mora aplicada: ${fmt(data.mora)}`)
      cargar()
    } catch (e) {
      mostrarToast(e.message, "error")
    } finally {
      setAplicandoId(null)
    }
  }

  const moraPendienteTexto = agruparPorMoneda(
    vencidas,
    c => c.contrato?.moneda?.simbolo,
    c => c.mora_calculada
  )
  const moraCobradaTexto = agruparPorMoneda(
    historial,
    p => p.contrato?.moneda?.simbolo,
    p => p.monto_mora
  )

  const q = busqueda.toLowerCase()
  const vencidasFiltradas = vencidas.filter(c =>
    (c.contrato?.cliente?.nombre ?? "").toLowerCase().includes(q) ||
    (c.contrato?.numero ?? "").toLowerCase().includes(q)
  )
  const alertasFiltradas = alertas.filter(a =>
    (a.cliente?.nombre ?? "").toLowerCase().includes(q)
  )
  const proximasFiltradas = proximas.filter(c =>
    (c.contrato?.cliente?.nombre ?? "").toLowerCase().includes(q) ||
    (c.contrato?.numero ?? "").toLowerCase().includes(q)
  )

  return (
    <div className={s.page}>

      {toast && (
        <div className={`${s.toast} ${toast.tipo === "error" ? s.toastError : s.toastOk}`}>
          <ion-icon name={toast.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {toast.msg}
        </div>
      )}

      <div className={s.topRow1}>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Mora y Alertas</h1>
          <span className={s.subtitulo}>
            {vencidas.length} cuota{vencidas.length !== 1 ? "s" : ""} vencida{vencidas.length !== 1 ? "s" : ""} · {moraPendienteTexto} en mora
          </span>
        </div>
        <button className={s.btnMasiva} onClick={() => setModalMasiva(true)} disabled={vencidas.length === 0}>
          <ion-icon name="flash-outline" />
          Aplicar mora masiva
        </button>
      </div>

      <div className={s.metricasGrid}>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(239,68,68,0.1)" }}>
            <ion-icon name="alert-circle-outline" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Cuotas vencidas</span>
            <span className={s.metricaVal}>{vencidas.length}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(245,158,11,0.1)" }}>
            <ion-icon name="cash-outline" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Mora pendiente</span>
            <span className={s.metricaVal} style={{ fontSize: moraPendienteTexto.includes("·") ? "13px" : undefined }}>
              {moraPendienteTexto}
            </span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(29,111,206,0.1)" }}>
            <ion-icon name="people-outline" style={{ color: "#1d6fce" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Clientes en mora</span>
            <span className={s.metricaVal}>{alertas.length}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(139,92,246,0.1)" }}>
            <ion-icon name="time-outline" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Vencen en 7 días</span>
            <span className={s.metricaVal}>{proximas.length}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(16,185,129,0.1)" }}>
            <ion-icon name="checkmark-circle-outline" style={{ color: "#10b981" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Mora cobrada</span>
            <span className={s.metricaVal} style={{ fontSize: moraCobradaTexto.includes("·") ? "13px" : undefined }}>
              {moraCobradaTexto}
            </span>
            <span className={s.metricaSub}>{historial.length} pagos</span>
          </div>
        </div>
      </div>

      <div className={s.tabsWrap}>
        <div className={s.tabs}>
          {[
            { key: "vencidas",  label: "Cuotas vencidas",   count: vencidas.length  },
            { key: "alertas",   label: "Alertas",            count: alertas.length   },
            { key: "proximas",  label: "Próx. vencimientos", count: proximas.length  },
            { key: "historial", label: "Historial",          count: historial.length },
          ].map(t => (
            <button
              key={t.key}
              className={`${s.tab} ${tab === t.key ? s.tabActivo : ""}`}
              onClick={() => { setTab(t.key); setBusqueda("") }}
            >
              {t.label}
              <span className={s.tabCount}>{t.count}</span>
            </button>
          ))}
        </div>
        {tab !== "historial" && (
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente o contrato..."
              className={s.searchInput}
            />
            {busqueda && (
              <button className={s.searchClear} onClick={() => setBusqueda("")}>
                <ion-icon name="close-circle-outline" />
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "vencidas" && (
        cargando ? (
          <div className={s.tablaWrap}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)}</div>
        ) : vencidasFiltradas.length === 0 ? (
          <div className={s.vacio}>
            <ion-icon name="checkmark-circle-outline" />
            <p>{busqueda ? "Sin resultados" : "No hay cuotas vencidas"}</p>
          </div>
        ) : (
          <div className={s.tablaWrap}>
            <div className={s.tablaHead}>
              <span>Cliente</span><span>Contrato</span><span>Cuota</span>
              <span>Vencimiento</span><span>Días</span><span>Monto cuota</span>
              <span>Mora calculada</span><span>Acciones</span>
            </div>
            {vencidasFiltradas.map(c => {
              const fmt     = makeFmt(c.contrato?.moneda?.simbolo ?? "RD$")
              const tieneWa = !!c.contrato?.cliente?.telefono
              return (
                <div
                  key={c.id}
                  className={`${s.tablaRow} ${c.dias_con_mora > 30 ? s.rowCritica : c.dias_con_mora > 0 ? s.rowVencida : s.rowGracia} ${tieneWa ? s.rowClickable : ""}`}
                  onClick={tieneWa ? () => abrirWhatsApp(c.contrato.cliente.telefono, mensajeVencida(c, fmt)) : undefined}
                  title={tieneWa ? `Enviar WhatsApp a ${c.contrato.cliente.nombre}` : undefined}
                >
                  <div className={s.cellCliente}>
                    <span className={s.clienteNombre}>{c.contrato?.cliente?.nombre ?? ""}</span>
                    {tieneWa && (
                      <span className={s.waHint}>
                        <ion-icon name="logo-whatsapp" />
                        {c.contrato.cliente.telefono}
                      </span>
                    )}
                  </div>
                  <span className={s.contratoNum}>#{c.contrato?.numero ?? ""}</span>
                  <span className={s.cellVal}>#{c.numero}</span>
                  <span className={s.cellVal}>{fmtFecha(c.fecha_vencimiento)}</span>
                  <div className={s.diasCell}>
                    <span className={`${s.diasBadge} ${c.dias_con_mora > 30 ? s.diasCritica : c.dias_con_mora > 0 ? s.diasVencida : s.diasGracia}`}>{c.dias_vencida}d</span>
                    {c.dias_con_mora <= 0 && <span className={s.graciaTag}>en gracia</span>}
                  </div>
                  <span className={s.cellVal}>{fmt(c.monto)}</span>
                  <span className={`${s.moraVal} ${c.mora_calculada > 0 ? s.moraValRojo : s.moraValCero}`}>{fmt(c.mora_calculada)}</span>
                  <div className={s.cellAcciones} onClick={e => e.stopPropagation()}>
                    <button className={s.btnAplicar} title="Aplicar mora" onClick={() => aplicarCuota(c)} disabled={aplicandoId === c.id || c.dias_con_mora <= 0}>
                      <ion-icon name={aplicandoId === c.id ? "hourglass-outline" : "flash-outline"} />
                    </button>
                    <button className={s.btnPagarMora} title="Registrar pago de mora" onClick={() => setModalPago(c)} disabled={c.mora_calculada <= 0}>
                      <ion-icon name="cash-outline" />
                    </button>
                  </div>

                  <div className={s.mobileCard} onClick={e => e.stopPropagation()}>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Contrato</span><span className={s.mobileValBlue}>#{c.contrato?.numero ?? ""}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Cuota</span><span className={s.mobileVal}>#{c.numero}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Vencimiento</span><span className={s.mobileVal}>{fmtFecha(c.fecha_vencimiento)}</span></div>
                      <div className={s.mobileField}>
                        <span className={s.mobileLbl}>Días</span>
                        <div className={s.diasCell}>
                          <span className={`${s.diasBadge} ${c.dias_con_mora > 30 ? s.diasCritica : c.dias_con_mora > 0 ? s.diasVencida : s.diasGracia}`}>{c.dias_vencida}d</span>
                          {c.dias_con_mora <= 0 && <span className={s.graciaTag}>en gracia</span>}
                        </div>
                      </div>
                    </div>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Monto cuota</span><span className={s.mobileVal}>{fmt(c.monto)}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Mora</span><span className={c.mora_calculada > 0 ? s.mobileValRojo : s.mobileValGris}>{fmt(c.mora_calculada)}</span></div>
                    </div>
                    {tieneWa && (
                      <button
                        className={s.btnWaMobile}
                        onClick={() => abrirWhatsApp(c.contrato.cliente.telefono, mensajeVencida(c, fmt))}
                      >
                        <ion-icon name="logo-whatsapp" />
                        Contactar por WhatsApp
                      </button>
                    )}
                    <div className={s.mobileAcciones}>
                      <button className={s.btnAplicar} title="Aplicar mora" onClick={() => aplicarCuota(c)} disabled={aplicandoId === c.id || c.dias_con_mora <= 0}>
                        <ion-icon name={aplicandoId === c.id ? "hourglass-outline" : "flash-outline"} />
                      </button>
                      <button className={s.btnPagarMora} title="Registrar pago de mora" onClick={() => setModalPago(c)} disabled={c.mora_calculada <= 0}>
                        <ion-icon name="cash-outline" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === "alertas" && (
        cargando ? (
          <div className={s.tablaWrap}>{[...Array(3)].map((_, i) => <div key={i} className={s.skeletonRow} />)}</div>
        ) : alertasFiltradas.length === 0 ? (
          <div className={s.vacio}>
            <ion-icon name="shield-checkmark-outline" />
            <p>{busqueda ? "Sin resultados" : "Sin clientes en mora"}</p>
          </div>
        ) : (
          <div className={s.alertasGrid}>
            {alertasFiltradas.map(a => {
              const moraTexto = Object.entries(a.mora_por_moneda ?? {})
                .map(([sim, monto]) => makeFmt(sim)(monto))
                .join(" · ") || "—"
              const monedaPrincipal = Object.keys(a.mora_por_moneda ?? {})[0] ?? "RD$"
              const fmt     = makeFmt(monedaPrincipal)
              const tieneWa = !!a.cliente?.telefono
              const primeraCuota = a.cuotas?.[0]
              const msg = primeraCuota
                ? mensajeVencida({ ...primeraCuota, contrato: { ...primeraCuota.contrato, cliente: a.cliente } }, makeFmt(monedaPrincipal))
                : null

              return (
                <div
                  key={a.cliente?.id}
                  className={`${s.alertaCard} ${a.mora_total > 5000 ? s.alertaCritica : ""} ${tieneWa ? s.alertaClickable : ""}`}
                  onClick={tieneWa && msg ? () => abrirWhatsApp(a.cliente.telefono, msg) : undefined}
                  title={tieneWa ? `Contactar a ${a.cliente?.nombre} por WhatsApp` : undefined}
                >
                  <div className={s.alertaHead}>
                    <div className={s.alertaAvatar}>{a.cliente?.nombre?.charAt(0).toUpperCase()}</div>
                    <div className={s.alertaInfo}>
                      <span className={s.alertaNombre}>{a.cliente?.nombre}</span>
                      {tieneWa && (
                        <span className={s.waHint}>
                          <ion-icon name="logo-whatsapp" />
                          {a.cliente.telefono}
                          <span className={s.waHintTip}>· click para contactar</span>
                        </span>
                      )}
                    </div>
                    <div className={s.alertaMoraBadge}>
                      <span className={s.alertaMoraVal}>{moraTexto}</span>
                      <span className={s.alertaMoraLbl}>mora total</span>
                    </div>
                  </div>
                  <div className={s.alertaStats}>
                    <div className={s.alertaStat}>
                      <span className={s.alertaStatVal}>{a.cuotas_vencidas}</span>
                      <span className={s.alertaStatLbl}>cuotas</span>
                    </div>
                    <div className={s.alertaStat}>
                      <span className={s.alertaStatVal}>{fmt(a.monto_total)}</span>
                      <span className={s.alertaStatLbl}>monto vencido</span>
                    </div>
                  </div>
                  <div className={s.alertaCuotas}>
                    {a.cuotas.slice(0, 3).map(c => {
                      const fmtC = makeFmt(c.contrato?.moneda?.simbolo ?? "RD$")
                      return (
                        <div key={c.id} className={s.alertaCuotaItem}>
                          <span className={s.alertaCuotaNum}>#{c.numero}</span>
                          <span className={s.alertaCuotaFecha}>{fmtFecha(c.fecha_vencimiento)}</span>
                          <span className={s.alertaCuotaDias}>{c.dias_vencida}d</span>
                          <span className={s.alertaCuotaMora}>{fmtC(c.mora_calculada)}</span>
                        </div>
                      )
                    })}
                    {a.cuotas.length > 3 && <span className={s.alertaMas}>+{a.cuotas.length - 3} más</span>}
                  </div>
                  {tieneWa && (
                    <div className={s.alertaWaFooter}>
                      <ion-icon name="logo-whatsapp" />
                      Toca para enviar recordatorio por WhatsApp
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === "proximas" && (
        cargando ? (
          <div className={s.tablaWrap}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)}</div>
        ) : proximasFiltradas.length === 0 ? (
          <div className={s.vacio}>
            <ion-icon name="calendar-outline" />
            <p>{busqueda ? "Sin resultados" : "No hay cuotas por vencer en los próximos 7 días"}</p>
          </div>
        ) : (
          <div className={s.tablaWrap}>
            <div className={s.tablaHeadProx}>
              <span>Cliente</span><span>Contrato</span><span>Cuota</span>
              <span>Vencimiento</span><span>Días restantes</span><span>Monto</span>
            </div>
            {proximasFiltradas.map(c => {
              const fmt     = makeFmt(c.contrato?.moneda?.simbolo ?? "RD$")
              const tieneWa = !!c.contrato?.cliente?.telefono
              return (
                <div
                  key={c.id}
                  className={`${s.tablaRowProx} ${c.dias_restantes === 0 ? s.rowHoy : c.dias_restantes <= 2 ? s.rowUrgente : s.rowProxima} ${tieneWa ? s.rowClickable : ""}`}
                  onClick={tieneWa ? () => abrirWhatsApp(c.contrato.cliente.telefono, mensajeProxima(c, fmt)) : undefined}
                  title={tieneWa ? `Enviar recordatorio a ${c.contrato.cliente.nombre}` : undefined}
                >
                  <div className={s.cellCliente}>
                    <span className={s.clienteNombre}>{c.contrato?.cliente?.nombre ?? ""}</span>
                    {tieneWa && (
                      <span className={s.waHint}>
                        <ion-icon name="logo-whatsapp" />
                        {c.contrato.cliente.telefono}
                      </span>
                    )}
                  </div>
                  <span className={s.contratoNum}>#{c.contrato?.numero ?? ""}</span>
                  <span className={s.cellVal}>#{c.numero}</span>
                  <span className={s.cellVal}>{fmtFecha(c.fecha_vencimiento)}</span>
                  <div className={s.diasCell}>
                    <span className={`${s.diasBadge} ${c.dias_restantes === 0 ? s.diasHoy : c.dias_restantes <= 2 ? s.diasUrgente : s.diasProxima}`}>
                      {c.dias_restantes === 0 ? "Hoy" : `${c.dias_restantes}d`}
                    </span>
                  </div>
                  <span className={s.cellVal}>{fmt(c.monto)}</span>

                  <div className={s.mobileCard} onClick={e => e.stopPropagation()}>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Contrato</span><span className={s.mobileValBlue}>#{c.contrato?.numero ?? ""}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Cuota</span><span className={s.mobileVal}>#{c.numero}</span></div>
                    </div>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Vencimiento</span><span className={s.mobileVal}>{fmtFecha(c.fecha_vencimiento)}</span></div>
                      <div className={s.mobileField}>
                        <span className={s.mobileLbl}>Días restantes</span>
                        <span className={`${s.diasBadge} ${c.dias_restantes === 0 ? s.diasHoy : c.dias_restantes <= 2 ? s.diasUrgente : s.diasProxima}`}>
                          {c.dias_restantes === 0 ? "Hoy" : `${c.dias_restantes}d`}
                        </span>
                      </div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Monto</span><span className={s.mobileVal}>{fmt(c.monto)}</span></div>
                    </div>
                    {tieneWa && (
                      <button
                        className={s.btnWaMobile}
                        onClick={() => abrirWhatsApp(c.contrato.cliente.telefono, mensajeProxima(c, fmt))}
                      >
                        <ion-icon name="logo-whatsapp" />
                        Enviar recordatorio por WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === "historial" && (
        cargando ? (
          <div className={s.tablaWrap}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)}</div>
        ) : historial.length === 0 ? (
          <div className={s.vacio}>
            <ion-icon name="time-outline" />
            <p>Sin historial de moras pagadas</p>
          </div>
        ) : (
          <div className={s.tablaWrap}>
            <div className={s.tablaHeadHist}>
              <span>Cliente</span><span>Contrato</span><span>Mora pagada</span>
              <span>Método</span><span>Registrado por</span><span>Fecha</span>
            </div>
            {historial.map(p => {
              const fmt = makeFmt(p.contrato?.moneda?.simbolo ?? "RD$")
              return (
                <div key={p.id} className={s.tablaRowHist}>
                  <span className={s.clienteNombre}>{p.contrato?.cliente?.nombre ?? ""}</span>
                  <span className={s.contratoNum}>#{p.contrato?.numero ?? ""}</span>
                  <span className={s.moraVal}>{fmt(p.monto_mora)}</span>
                  <span className={s.cellVal}>{p.metodo_pago?.nombre ?? ""}</span>
                  <span className={s.cellVal}>{p.usuario?.nombre_completo ?? ""}</span>
                  <span className={s.cellVal}>{fmtFecha(p.fecha)}</span>
                  <div className={s.mobileCard}>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Contrato</span><span className={s.mobileValBlue}>#{p.contrato?.numero ?? ""}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Mora pagada</span><span className={s.mobileValRojo}>{fmt(p.monto_mora)}</span></div>
                    </div>
                    <div className={s.mobileCardRow}>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Método</span><span className={s.mobileVal}>{p.metodo_pago?.nombre ?? ""}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Registrado por</span><span className={s.mobileVal}>{p.usuario?.nombre_completo ?? ""}</span></div>
                      <div className={s.mobileField}><span className={s.mobileLbl}>Fecha</span><span className={s.mobileVal}>{fmtFecha(p.fecha)}</span></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {modalPago && (
        <ModalPagoMora
          cuota={modalPago}
          empresaId={empresaId}
          payload={payload}
          metodos={metodos}
          onClose={() => setModalPago(null)}
          onPagado={() => {
            setModalPago(null)
            mostrarToast("Pago de mora registrado correctamente")
            cargar()
          }}
        />
      )}
      {modalMasiva && (
        <ModalMasiva
          empresaId={empresaId}
          totalCuotas={vencidas.filter(c => c.dias_con_mora > 0).length}
          onClose={() => setModalMasiva(false)}
          onAplicada={(n) => {
            setModalMasiva(false)
            mostrarToast(`Mora aplicada a ${n} cuotas`)
            cargar()
          }}
        />
      )}
    </div>
  )
}