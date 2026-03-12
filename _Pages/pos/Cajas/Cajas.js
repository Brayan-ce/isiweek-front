"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Cajas.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
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

async function getDatosCaja(usuarioId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/datos/${usuarioId}/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function abrirCaja(usuarioId, empresaId, montoInicial) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, empresaId, montoInicial }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function cerrarCaja(sesionId, usuarioId, montoFinalManual = null, notas = "") {
  try {
    const res = await fetch(`${API}/api/pos/cajas/cerrar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sesionId, usuarioId, montoFinalManual, notas }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function registrarGasto(usuarioId, empresaId, concepto, monto, tipo) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/gasto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, empresaId, concepto, monto, tipo }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function getHistorialCajas(usuarioId, empresaId, pagina = 1, limite = 10) {
  try {
    const params = new URLSearchParams({ pagina, limite })
    const res = await fetch(`${API}/api/pos/cajas/historial/${usuarioId}/${empresaId}?${params}`)
    if (!res.ok) return { sesiones: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { sesiones: [], total: 0, paginas: 1 } }
}

export default function Cajas() {
  const router = useRouter()

  const [empresaId, setEmpresaId]               = useState(null)
  const [usuarioId, setUsuarioId]               = useState(null)
  const [datos, setDatos]                       = useState(null)
  const [cargando, setCargando]                 = useState(true)
  const [tab, setTab]                           = useState("caja")
  const [alerta, setAlerta]                     = useState(null)
  const [procesando, setProcesando]             = useState(false)
  const [modalAbrir, setModalAbrir]             = useState(false)
  const [modalCerrar, setModalCerrar]           = useState(false)
  const [modalGasto, setModalGasto]             = useState(false)
  const [montoInicial, setMontoInicial]         = useState("")
  const [gastoConcepto, setGastoConcepto]       = useState("")
  const [gastoMonto, setGastoMonto]             = useState("")
  const [gastoTipo, setGastoTipo]               = useState("")
  const [historial, setHistorial]               = useState([])
  const [histPagina, setHistPagina]             = useState(1)
  const [histPaginas, setHistPaginas]           = useState(1)
  const [cargandoHist, setCargandoHist]         = useState(false)
  const [montoManual, setMontoManual]           = useState(false)
  const [montoCierreManual, setMontoCierreManual] = useState("")
  const [notasCierre, setNotasCierre]           = useState("")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  const cargar = useCallback(async () => {
    if (!usuarioId || !empresaId) return
    setCargando(true)
    const d = await getDatosCaja(usuarioId, empresaId)
    setDatos(d)
    setCargando(false)
  }, [usuarioId, empresaId])

  useEffect(() => { cargar() }, [cargar])

  async function cargarHistorial(p = 1) {
    if (!usuarioId || !empresaId) return
    setCargandoHist(true)
    const res = await getHistorialCajas(usuarioId, empresaId, p, 10)
    setHistorial(res.sesiones)
    setHistPaginas(res.paginas)
    setHistPagina(p)
    setCargandoHist(false)
  }

  useEffect(() => {
    if (tab === "historial") cargarHistorial(1)
  }, [tab, usuarioId, empresaId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function abrirModalCerrar() {
    setMontoManual(false)
    setMontoCierreManual("")
    setNotasCierre("")
    setModalCerrar(true)
  }

  async function handleAbrir() {
    setProcesando(true)
    const res = await abrirCaja(usuarioId, empresaId, Number(montoInicial) || 0)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Caja abierta correctamente")
    setModalAbrir(false)
    setMontoInicial("")
    cargar()
  }

  async function handleCerrar() {
    if (!datos?.sesion) return
    const montoFinal = montoManual ? Number(montoCierreManual) : null
    setProcesando(true)
    const res = await cerrarCaja(datos.sesion.id, usuarioId, montoFinal, notasCierre)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Caja cerrada. Saldo final: ${fmt(res.saldo_cierre)}`)
    setModalCerrar(false)
    cargar()
  }

  async function handleGasto() {
    if (!gastoConcepto.trim() || !gastoMonto) return
    setProcesando(true)
    const res = await registrarGasto(usuarioId, empresaId, gastoConcepto, gastoMonto, gastoTipo)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Gasto "${res.concepto}" registrado`)
    setModalGasto(false)
    setGastoConcepto("")
    setGastoMonto("")
    setGastoTipo("")
    cargar()
  }

  const simbolo = "RD$"
  const { sesion, resumen, ventas, gastos, numeroCaja } = datos ?? {}
  const cajaAbierta = sesion?.estado === "abierta"
  const montoCalculado = resumen?.totalEnCaja ?? 0

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        <div className={s.skeleton} style={{ height: 180 }} />
        <div className={s.skeleton} style={{ height: 300 }} />
      </div>
    </div>
  )

  return (
    <div className={s.page}>

      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === "caja" ? s.tabActivo : ""}`} onClick={() => setTab("caja")}>
          <ion-icon name="wallet-outline" /> Mi Caja
        </button>
        <button className={`${s.tab} ${tab === "historial" ? s.tabActivo : ""}`} onClick={() => setTab("historial")}>
          <ion-icon name="time-outline" /> Historial
        </button>
      </div>

      {tab === "caja" && (
        <>
          {!sesion ? (
            <div className={s.sinCajaWrap}>
              <div className={s.sinCajaIcon}><ion-icon name="wallet-outline" /></div>
              <div className={s.sinCajaTitulo}>No tienes caja abierta hoy</div>
              <div className={s.sinCajaSub}>Abre tu caja para empezar a vender</div>
              <button className={s.btnAbrir} onClick={() => setModalAbrir(true)}>
                <ion-icon name="lock-open-outline" /> Abrir caja
              </button>
            </div>
          ) : (
          <>
          {!cajaAbierta && (
            <div className={s.sinCajaWrap}>
              <div className={s.sinCajaIcon}><ion-icon name="wallet-outline" /></div>
              <div className={s.sinCajaTitulo}>Tu caja esta cerrada</div>
              <div className={s.sinCajaSub}>Puedes abrir una nueva sesion cuando quieras</div>
              <button className={s.btnAbrir} onClick={() => setModalAbrir(true)}>
                <ion-icon name="lock-open-outline" /> Abrir nueva caja
              </button>
            </div>
          )}
          {cajaAbierta && (
            <>
              <div className={s.cajaHeader}>
                <div className={s.cajaHeaderLeft}>
                  <div className={s.cajaHeaderIcono}>
                    <ion-icon name="wallet-outline" />
                  </div>
                  <div>
                    <div className={s.cajaTitulo}>
                      {numeroCaja ? `Caja ${numeroCaja}` : "Mi Caja"}
                    </div>
                    <div className={`${s.cajaEstadoBadge} ${cajaAbierta ? s.badgeAbierta : s.badgeCerrada}`}>
                      {cajaAbierta ? (
                        <><span className={s.dot} />Abierta</>
                      ) : "Cerrada"}
                    </div>
                  </div>
                </div>
                <div className={s.cajaHeaderBtns}>
                  {cajaAbierta && (
                    <>
                      <button className={s.btnGasto} onClick={() => setModalGasto(true)}>
                        <ion-icon name="remove-circle-outline" /> Registrar gasto
                      </button>
                      <button className={s.btnVender} onClick={() => router.push("/pos/vender")}>
                        <ion-icon name="storefront-outline" /> Registrar venta
                      </button>
                      <button className={s.btnCerrar} onClick={abrirModalCerrar}>
                        <ion-icon name="lock-closed-outline" /> Cerrar caja
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={s.resumenGrid}>
                <div className={s.resumenCard}>
                  <span className={s.resumenLabel}>Monto Inicial</span>
                  <span className={s.resumenValor}>{fmt(resumen?.montoInicial, simbolo)}</span>
                </div>
                <div className={s.resumenCard}>
                  <span className={s.resumenLabel}>Ventas del Dia</span>
                  <span className={`${s.resumenValor} ${s.resumenPos}`}>{fmt(resumen?.totalVentas, simbolo)}</span>
                </div>
                <div className={s.resumenCard}>
                  <span className={s.resumenLabel}>Gastos</span>
                  <span className={`${s.resumenValor} ${s.resumenNeg}`}>{fmt(resumen?.totalGastos, simbolo)}</span>
                </div>
                <div className={`${s.resumenCard} ${s.resumenCardTotal}`}>
                  <span className={s.resumenLabel}>Total en Caja</span>
                  <span className={`${s.resumenValor} ${s.resumenTotal}`}>{fmt(resumen?.totalEnCaja, simbolo)}</span>
                </div>
              </div>

              <div className={s.bottomGrid}>
                <div className={s.seccionCard}>
                  <div className={s.seccionTitulo}>
                    <ion-icon name="pie-chart-outline" /> Desglose por Metodo de Pago
                  </div>
                  {!resumen?.ventasPorMetodo?.length ? (
                    <div className={s.seccionVacio}>Sin ventas registradas</div>
                  ) : (
                    <div className={s.metodosList}>
                      {resumen.ventasPorMetodo.map((m, i) => (
                        <div key={i} className={s.metodoItem}>
                          <div className={s.metodoNombre}>
                            <ion-icon name="card-outline" />
                            {m.nombre}
                          </div>
                          <div className={s.metodoRight}>
                            <span className={s.metodoCant}>{m.cantidad} vta{m.cantidad !== 1 ? "s" : ""}</span>
                            <span className={s.metodoTotal}>{fmt(m.total, simbolo)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={s.seccionCard}>
                  <div className={s.seccionTitulo}>
                    <ion-icon name="information-circle-outline" /> Informacion del Turno
                  </div>
                  <div className={s.turnoInfo}>
                    <div className={s.turnoRow}>
                      <span>Fecha</span>
                      <span>{fmtFecha(sesion.abierta_at)}</span>
                    </div>
                    <div className={s.turnoRow}>
                      <span>Hora Apertura</span>
                      <span>{fmtHora(sesion.abierta_at)}</span>
                    </div>
                    {sesion.cerrada_at && (
                      <div className={s.turnoRow}>
                        <span>Hora Cierre</span>
                        <span>{fmtHora(sesion.cerrada_at)}</span>
                      </div>
                    )}
                    <div className={s.turnoRow}>
                      <span>Ventas Realizadas</span>
                      <span>{resumen?.cantVentas ?? 0}</span>
                    </div>
                    <div className={s.turnoRow}>
                      <span>Estado</span>
                      <span className={cajaAbierta ? s.turnoAbierta : s.turnoCerrada}>
                        {cajaAbierta ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {ventas?.length > 0 && (
                <div className={s.seccionCard}>
                  <div className={s.seccionTitulo}>
                    <ion-icon name="receipt-outline" /> Ventas del turno
                  </div>
                  <div className={s.ventasTableHeader}>
                    <span>#</span><span>Cliente</span><span>Metodo</span><span>Total</span><span>Hora</span><span>Estado</span>
                  </div>
                  {ventas.map(v => (
                    <div key={v.id} className={s.ventasTableRow}>
                      <span className={s.ventaId}>#{String(v.id).padStart(6, "0")}</span>
                      <span>{v.cliente?.nombre ?? "Consumidor final"}</span>
                      <span>{v.metodo_pago?.nombre ?? "—"}</span>
                      <span className={s.totalCell}>{fmt(v.total, simbolo)}</span>
                      <span className={s.horaCell}>{fmtHora(v.created_at)}</span>
                      <span className={`${s.badge} ${v.estado === "completada" ? s.badgeComp : v.estado === "cancelada" ? s.badgeCanc : s.badgePend}`}>
                        {v.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {gastos?.length > 0 && (
                <div className={s.seccionCard}>
                  <div className={s.seccionTitulo}>
                    <ion-icon name="trending-down-outline" /> Gastos del turno
                  </div>
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
            </>
          )}
          </>
          )}
        </>
      )}

      {tab === "historial" && (
        <div className={s.seccionCard}>
          <div className={s.seccionTitulo}>
            <ion-icon name="time-outline" /> Historial de sesiones
          </div>
          {cargandoHist ? (
            [...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)
          ) : historial.length === 0 ? (
            <div className={s.seccionVacio}>Sin sesiones registradas</div>
          ) : (
            <>
              <div className={s.histTableHeader}>
                <span>Fecha</span><span>Apertura</span><span>Cierre</span><span>Saldo apertura</span><span>Saldo cierre</span><span>Ventas</span><span>Estado</span>
              </div>
              {historial.map(ses => (
                <div key={ses.id} className={s.histTableRow}>
                  <span>{fmtFecha(ses.abierta_at)}</span>
                  <span>{fmtHora(ses.abierta_at)}</span>
                  <span>{ses.cerrada_at ? fmtHora(ses.cerrada_at) : "—"}</span>
                  <span>{fmt(ses.saldo_apertura, simbolo)}</span>
                  <span>{ses.saldo_cierre != null ? fmt(ses.saldo_cierre, simbolo) : "—"}</span>
                  <span>{ses._count?.ventas ?? 0}</span>
                  <span className={`${s.badge} ${ses.estado === "abierta" ? s.badgeAbierta : s.badgeCerrada}`}>
                    {ses.estado}
                  </span>
                </div>
              ))}
              {histPaginas > 1 && (
                <div className={s.paginacion}>
                  <button disabled={histPagina === 1} onClick={() => cargarHistorial(histPagina - 1)}>
                    <ion-icon name="chevron-back-outline" />
                  </button>
                  <span>{histPagina} / {histPaginas}</span>
                  <button disabled={histPagina === histPaginas} onClick={() => cargarHistorial(histPagina + 1)}>
                    <ion-icon name="chevron-forward-outline" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modalAbrir && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalAbrir(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalAbrir(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitulo}><ion-icon name="lock-open-outline" /> Abrir caja</div>
            <div className={s.modalField}>
              <label>Monto inicial en caja</label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={montoInicial}
                onChange={e => setMontoInicial(e.target.value)}
                className={s.modalInput}
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleAbrir()}
              />
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnSecundario} onClick={() => setModalAbrir(false)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleAbrir} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : "Abrir caja"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCerrar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalCerrar(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalCerrar(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitulo}><ion-icon name="lock-closed-outline" /> Cerrar caja</div>

            <div className={s.modalResumenCierre}>
              <div className={s.cierreRow}><span>Monto inicial</span><span>{fmt(resumen?.montoInicial, simbolo)}</span></div>
              <div className={s.cierreRow}><span>Ventas del dia</span><span className={s.cierrePos}>{fmt(resumen?.totalVentas, simbolo)}</span></div>
              <div className={s.cierreRow}><span>Gastos</span><span className={s.cierreNeg}>-{fmt(resumen?.totalGastos, simbolo)}</span></div>
              <div className={`${s.cierreRow} ${s.cierreTotal}`}><span>Total esperado</span><span>{fmt(montoCalculado, simbolo)}</span></div>
            </div>

            <div className={s.switchRow}>
              <div className={s.switchInfo}>
                <span className={s.switchLabel}>Ingresar monto final manualmente</span>
                <span className={s.switchSub}>Activa si el cliente realizo ajustes en caja</span>
              </div>
              <button
                className={`${s.switchBtn} ${montoManual ? s.switchOn : ""}`}
                onClick={() => {
                  setMontoManual(v => !v)
                  setMontoCierreManual("")
                }}
                type="button"
              >
                <span className={s.switchThumb} />
              </button>
            </div>

            {montoManual && (
              <div className={s.modalField}>
                <label>Monto final en caja</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={montoCierreManual}
                  onChange={e => setMontoCierreManual(e.target.value)}
                  className={s.modalInput}
                  autoFocus
                />
                {montoCierreManual !== "" && (
                  <div className={`${s.diferencia} ${Number(montoCierreManual) < montoCalculado ? s.diferencianeg : Number(montoCierreManual) > montoCalculado ? s.diferenciapos : s.diferenciaok}`}>
                    {Number(montoCierreManual) === montoCalculado
                      ? "Monto exacto"
                      : `Diferencia: ${fmt(Math.abs(Number(montoCierreManual) - montoCalculado), simbolo)} ${Number(montoCierreManual) < montoCalculado ? "faltante" : "sobrante"}`
                    }
                  </div>
                )}
              </div>
            )}

            <div className={s.modalField}>
              <label>Notas (opcional)</label>
              <textarea
                placeholder="Observaciones del cierre..."
                value={notasCierre}
                onChange={e => setNotasCierre(e.target.value)}
                className={`${s.modalInput} ${s.modalTextarea}`}
                rows={2}
              />
            </div>

            <div className={s.modalAcciones}>
              <button className={s.btnSecundario} onClick={() => setModalCerrar(false)}>Cancelar</button>
              <button
                className={s.btnCerrarModal}
                onClick={handleCerrar}
                disabled={procesando || (montoManual && !montoCierreManual)}
              >
                {procesando ? <span className={s.spinner} /> : <><ion-icon name="lock-closed-outline" /> Cerrar caja</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalGasto && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalGasto(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalGasto(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitulo}><ion-icon name="remove-circle-outline" /> Registrar gasto</div>
            <div className={s.modalField}>
              <label>Concepto</label>
              <input
                type="text"
                placeholder="Ej: Compra de materiales"
                value={gastoConcepto}
                onChange={e => setGastoConcepto(e.target.value)}
                className={s.modalInput}
                autoFocus
              />
            </div>
            <div className={s.modalField}>
              <label>Monto</label>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={gastoMonto}
                onChange={e => setGastoMonto(e.target.value)}
                className={s.modalInput}
                onKeyDown={e => e.key === "Enter" && handleGasto()}
              />
            </div>
            <div className={s.modalField}>
              <label>Tipo (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Operativo, Limpieza..."
                value={gastoTipo}
                onChange={e => setGastoTipo(e.target.value)}
                className={s.modalInput}
              />
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnSecundario} onClick={() => setModalGasto(false)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleGasto} disabled={procesando || !gastoConcepto.trim() || !gastoMonto}>
                {procesando ? <span className={s.spinner} /> : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}