"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./Cuotas.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

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

function fmtFecha(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

async function getDatosCuota(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/datos/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getVentasCuotas(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
    const res = await apiFetch(`/api/pos/cuotas/lista/${empresaId}?${params}`)
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

async function getUsuariosEmpresa(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/usuarios/${empresaId}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function editarEstadoCuota(empresaId, cuotaId, estado) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/editar-cuota/${empresaId}/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function pagarCuota(empresaId, cuotaId, body) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/pagar/${empresaId}/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function pagarMultipleCuotasAPI(empresaId, ventaId, body) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/pagar-multiple/${empresaId}/${ventaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

function calcularDistribucion(cuotas, monto) {
  const pendientes = cuotas
    .filter(c => c.estado === "pendiente" || c.estado === "parcial")
    .sort((a, b) => Number(a.numero) - Number(b.numero))
  let remaining = Number(monto) || 0
  const result = []
  for (const cuota of pendientes) {
    if (remaining <= 0.005) break
    const yaAbonado    = Number(cuota.monto_pagado ?? 0)
    const montoFalta   = Number(cuota.monto) - yaAbonado
    if (remaining >= montoFalta - 0.005) {
      result.push({ cuota, tipo: "completa", montoFalta })
      remaining = Number((remaining - montoFalta).toFixed(2))
    } else {
      result.push({ cuota, tipo: "parcial", montoPagado: remaining + yaAbonado, montoRestante: Number((montoFalta - remaining).toFixed(2)) })
      remaining = 0
    }
  }
  return result
}

export default function Cuotas() {
  const router = useRouter()
  const [empresaId, setEmpresaId]             = useState(null)
  const [usuarioId, setUsuarioId]             = useState(null)
  const [simbolo, setSimbolo]                 = useState("RD$")
  const [ventas, setVentas]                   = useState([])
  const [total, setTotal]                     = useState(0)
  const [paginas, setPaginas]                 = useState(1)
  const [pagina, setPagina]                   = useState(1)
  const [usuarios, setUsuarios]               = useState([])
  const [expandidos, setExpandidos]           = useState({})
  const [cargando, setCargando]               = useState(true)
  const [alerta, setAlerta]                   = useState(null)
  const [modalEditar, setModalEditar]         = useState(null)
  const [modalPago, setModalPago]             = useState(null)
  const [editando, setEditando]               = useState(false)
  const [cajaSesionId, setCajaSesionId]       = useState("")
  const [pagando, setPagando]                 = useState(false)
  const [datos, setDatos]                     = useState(null)
  const [modalPagoMultiple, setModalPagoMultiple] = useState(null)
  const [montoPagoMultiple, setMontoPagoMultiple] = useState("")
  const [cajaMultipleId, setCajaMultipleId]   = useState("")
  const [pagandoMultiple, setPagandoMultiple] = useState(false)

  const [filtros, setFiltros] = useState({
    cliente_id: "",
    estado: "",
    fecha_desde: "",
    fecha_hasta: "",
    usuario_id: "",
  })

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    apiFetch(`/api/pos/header/${usuarioId}`)
      .then(r => r.json())
      .then(d => { if (d?.empresa?.moneda?.simbolo) setSimbolo(d.empresa.moneda.simbolo) })
      .catch(() => {})
  }, [usuarioId])

  const cargar = useCallback(async (f = filtros, p = pagina) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getVentasCuotas(empresaId, { ...f, pagina: p, limite: 15 })
    setVentas(res.ventas ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId, filtros, pagina])

  useEffect(() => {
    if (!empresaId) return
    cargar()
    getUsuariosEmpresa(empresaId).then(u => setUsuarios(u ?? []))
    getDatosCuota(empresaId).then(d => { if (d) setDatos(d) })
  }, [empresaId])

  function toggleExpandir(id) {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function aplicarFiltros() {
    setPagina(1)
    cargar(filtros, 1)
  }

  function limpiarFiltros() {
    const vacio = { cliente_id: "", estado: "", fecha_desde: "", fecha_hasta: "", usuario_id: "" }
    setFiltros(vacio)
    setPagina(1)
    cargar(vacio, 1)
  }

  async function handleEditarCuota(estado) {
    if (!modalEditar) return
    setEditando(true)
    const res = await editarEstadoCuota(empresaId, modalEditar.cuota.id, estado)
    setEditando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Estado actualizado")
    setModalEditar(null)
    cargar()
  }

  async function handlePagarCuota() {
    if (!modalPago) return
    setPagando(true)
    const res = await pagarCuota(empresaId, modalPago.cuota.id, {
      caja_sesion_id: cajaSesionId ? Number(cajaSesionId) : null,
    })
    setPagando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Cuota ${modalPago.cuota.numero} pagada`)
    setModalPago(null)
    setCajaSesionId("")
    cargar()
  }

  async function handlePagoMultiple() {
    if (!modalPagoMultiple) return
    const monto = Number(montoPagoMultiple)
    if (!monto || monto <= 0) return mostrarAlerta("error", "Ingresa un monto valido")
    setPagandoMultiple(true)
    const res = await pagarMultipleCuotasAPI(empresaId, modalPagoMultiple.venta.id, {
      monto,
      caja_sesion_id: cajaMultipleId ? Number(cajaMultipleId) : null,
    })
    setPagandoMultiple(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Pago registrado correctamente")
    setModalPagoMultiple(null)
    setMontoPagoMultiple("")
    setCajaMultipleId("")
    cargar()
  }

  const distPrev = modalPagoMultiple
    ? calcularDistribucion(modalPagoMultiple.venta.venta_cuotas ?? [], montoPagoMultiple)
    : []
  const totalPendienteMultiple = modalPagoMultiple
    ? (modalPagoMultiple.venta.venta_cuotas ?? []).filter(c => c.estado === "pendiente" || c.estado === "parcial").reduce((a, c) => a + Number(c.monto) - Number(c.monto_pagado ?? 0), 0)
    : 0

  const hayFiltros = Object.values(filtros).some(v => v)

  if (!empresaId || cargando) return <div className={s.page} />

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.topLeft}>
          <span className={s.conteo}>{total} registros</span>
        </div>
        <button className={s.nuevaBtn} onClick={() => router.push("/pos/cuotas/nueva")}>
          <ion-icon name="add-outline" />
          Nueva venta a credito
        </button>
      </div>

      <div className={s.filtrosCard}>
        <div className={s.filtrosGrid}>
          <div className={s.filtroGrupo}>
            <label className={s.filtroLabel}>Estado</label>
            <select className={s.filtroSelect} value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="pendiente">Con cuotas pendientes</option>
              <option value="completa">Completadas</option>
            </select>
          </div>
          <div className={s.filtroGrupo}>
            <label className={s.filtroLabel}>Vendedor</label>
            <select className={s.filtroSelect} value={filtros.usuario_id} onChange={e => setFiltros(p => ({ ...p, usuario_id: e.target.value }))}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo}</option>)}
            </select>
          </div>
          <div className={s.filtroGrupo}>
            <label className={s.filtroLabel}>Desde</label>
            <input type="date" className={s.filtroInput} value={filtros.fecha_desde} onChange={e => setFiltros(p => ({ ...p, fecha_desde: e.target.value }))} />
          </div>
          <div className={s.filtroGrupo}>
            <label className={s.filtroLabel}>Hasta</label>
            <input type="date" className={s.filtroInput} value={filtros.fecha_hasta} onChange={e => setFiltros(p => ({ ...p, fecha_hasta: e.target.value }))} />
          </div>
        </div>
        <div className={s.filtrosBtns}>
          {hayFiltros && (
            <button className={s.limpiarBtn} onClick={limpiarFiltros}>
              <ion-icon name="close-outline" /> Limpiar
            </button>
          )}
          <button className={s.buscarBtn} onClick={aplicarFiltros}>
            <ion-icon name="search-outline" /> Buscar
          </button>
        </div>
      </div>

      <div className={s.listaWrap}>
        {ventas.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="wallet-outline" />
            <p>No hay ventas a credito</p>
          </div>
        ) : ventas.map(v => {
          const abierto = !!expandidos[v.id]
          const pct = v.cuotas_total > 0 ? Math.round((v.cuotas_pagadas / v.cuotas_total) * 100) : 0
          const completa = v.cuotas_pagadas === v.cuotas_total

          return (
            <div key={v.id} className={`${s.ventaCard} ${completa ? s.ventaCompleta : ""}`}>
              <div className={s.ventaHeader} onClick={() => toggleExpandir(v.id)}>
                <div className={s.ventaInfo}>
                  <div className={s.ventaAvatar}>{v.cliente?.nombre?.charAt(0)?.toUpperCase() ?? "?"}</div>
                  <div className={s.ventaTexts}>
                    <span className={s.ventaCliente}>{v.cliente?.nombre ?? "Sin cliente"}</span>
                    <span className={s.ventaMeta}>
                      {fmtFecha(v.created_at)} · {v.usuario?.nombre_completo ?? "—"}
                    </span>
                  </div>
                </div>

                <div className={s.ventaProgreso}>
                  <div className={s.progresoBar}>
                    <div className={s.progresoFill} style={{ width: `${pct}%`, background: completa ? "#16a34a" : "#1d6fce" }} />
                  </div>
                  <span className={s.progresoTexto}>{v.cuotas_pagadas}/{v.cuotas_total} cuotas</span>
                </div>

                <div className={s.ventaMontos}>
                  <span className={s.montoPendiente}>{fmt(v.monto_pendiente, simbolo)}</span>
                  <span className={s.montoPendienteLabel}>pendiente</span>
                </div>

                <div className={`${s.estadoBadge} ${completa ? s.estadoCompleta : s.estadoPendiente}`}>
                  {completa ? "Completa" : "Pendiente"}
                </div>

                <button
                  className={s.ojitoBtnHeader}
                  onClick={e => { e.stopPropagation(); router.push(`/pos/cuotas/imprimir/${v.id}`) }}
                  title="Ver boucher"
                >
                  <ion-icon name="print-outline" />
                </button>

                <ion-icon name={abierto ? "chevron-up-outline" : "chevron-down-outline"} class={s.chevron} />
              </div>

              {abierto && (
                <div className={s.cuotasDetalle}>
                  {!completa && (
                    <div className={s.pagoMultipleAccion}>
                      <button
                        className={s.pagoMultipleBtn}
                        onClick={e => { e.stopPropagation(); setModalPagoMultiple({ venta: v }); setMontoPagoMultiple("") }}
                      >
                        <ion-icon name="cash-outline" />
                        Pagar monto manualmente
                      </button>
                    </div>
                  )}
                  <div className={s.cuotasDetalleHead}>
                    <span>Cuota</span>
                    <span>Monto</span>
                    <span>Estado</span>
                    <span>Pagada</span>
                    <span></span>
                  </div>
                  {v.venta_cuotas.map(c => (
                    <div key={c.id} className={`${s.cuotaDetalleRow} ${c.estado === "pagada" ? s.cuotaRowPagada : ""}`}>
                      <span className={s.cuotaDetalleNum}>#{c.numero}</span>
                      <span className={s.cuotaDetalleMonto}>{fmt(c.monto, simbolo)}</span>
                      <span className={`${s.cuotaEstado} ${c.estado === "pagada" ? s.cuotaEstadoPagada : c.estado === "parcial" ? s.cuotaEstadoParcial : s.cuotaEstadoPendiente}`}>
                        {c.estado === "pagada" ? "Pagada" : c.estado === "parcial" ? "Parcial" : "Pendiente"}
                      </span>
                      <span className={s.cuotaFecha}>{c.pagada_at ? fmtFecha(c.pagada_at) : "—"}</span>
                      <div className={s.cuotaAccion}>
                        {(c.estado === "pendiente" || c.estado === "parcial") && (
                          <>
                            {c.estado === "parcial" && (
                              <span className={s.cuotaParcialInfo}>
                                {fmt(Number(c.monto) - Number(c.monto_pagado ?? 0), simbolo)} restante
                              </span>
                            )}
                            <button className={s.pagarBtn} onClick={() => setModalPago({ cuota: c, venta: v })}>
                              <ion-icon name="cash-outline" />
                              Pagar
                            </button>
                          </>
                        )}
                        <button className={s.editarBtn} onClick={() => setModalEditar({ cuota: c, venta: v })} title="Editar estado">
                          <ion-icon name="pencil-outline" />
                        </button>
                        {c.estado === "pagada" && (
                          <span className={s.checkPagada}><ion-icon name="checkmark-circle" /></span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className={s.cuotasResumen}>
                    <span>Total: {fmt(v.total, simbolo)}</span>
                    <span>Pagado: {fmt(v.monto_pagado, simbolo)}</span>
                    <span className={v.monto_pendiente > 0 ? s.resumenPendiente : s.resumenOk}>
                      Pendiente: {fmt(v.monto_pendiente, simbolo)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => { const p = pagina - 1; setPagina(p); cargar(filtros, p) }}>
            <ion-icon name="chevron-back-outline" />
          </button>
          <span>{pagina} / {paginas}</span>
          <button disabled={pagina === paginas} onClick={() => { const p = pagina + 1; setPagina(p); cargar(filtros, p) }}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modalEditar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalEditar(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalEditar(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitle}>Editar estado de cuota</div>
            <div className={s.modalInfo}>
              <div className={s.modalInfoRow}>
                <span>Cliente</span>
                <strong>{modalEditar.venta.cliente?.nombre}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>Cuota</span>
                <strong>#{modalEditar.cuota.numero} de {modalEditar.venta.cuotas_total}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>Monto</span>
                <strong className={s.modalMonto}>{fmt(modalEditar.cuota.monto, simbolo)}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>Estado actual</span>
                <span className={`${s.cuotaEstado} ${modalEditar.cuota.estado === "pagada" ? s.cuotaEstadoPagada : s.cuotaEstadoPendiente}`}>
                  {modalEditar.cuota.estado === "pagada" ? "Pagada" : "Pendiente"}
                </span>
              </div>
            </div>
            <div className={s.modalAcciones}>
              <button className={s.cancelarBtn} onClick={() => setModalEditar(null)}>Cancelar</button>
              {modalEditar.cuota.estado === "pendiente" ? (
                <button className={s.confirmarBtn} onClick={() => handleEditarCuota("pagada")} disabled={editando}>
                  {editando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" />Marcar pagada</>}
                </button>
              ) : (
                <button className={`${s.confirmarBtn} ${s.confirmarBtnWarn}`} onClick={() => handleEditarCuota("pendiente")} disabled={editando}>
                  {editando ? <span className={s.spinner} /> : <><ion-icon name="refresh-outline" />Revertir a pendiente</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalPago && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalPago(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalPago(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitle}>Registrar pago de cuota</div>
            <div className={s.modalInfo}>
              <div className={s.modalInfoRow}>
                <span>Cliente</span>
                <strong>{modalPago.venta.cliente?.nombre}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>Cuota</span>
                <strong>#{modalPago.cuota.numero} de {modalPago.venta.cuotas_total}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>{modalPago.cuota.estado === "parcial" ? "Monto restante" : "Monto"}</span>
                <strong className={s.modalMonto}>
                  {fmt(Number(modalPago.cuota.monto) - Number(modalPago.cuota.monto_pagado ?? 0), simbolo)}
                </strong>
              </div>
              {modalPago.cuota.estado === "parcial" && (
                <div className={s.modalInfoRow}>
                  <span>Ya abonado</span>
                  <strong style={{ color: "#16a34a" }}>{fmt(Number(modalPago.cuota.monto_pagado ?? 0), simbolo)}</strong>
                </div>
              )}
            </div>
            <div className={s.modalCajaWrap}>
              <label className={s.label}>Registrar en caja (opcional)</label>
              <select
                className={s.filtroSelect}
                value={cajaSesionId}
                onChange={e => setCajaSesionId(e.target.value)}
              >
                <option value="">No registrar en caja</option>
                {(datos?.cajas ?? []).map(cs => (
                  <option key={cs.id} value={cs.id}>{cs.caja?.nombre ?? `Caja #${cs.id}`}</option>
                ))}
              </select>
            </div>
            <div className={s.modalAcciones}>
              <button className={s.cancelarBtn} onClick={() => setModalPago(null)}>Cancelar</button>
              <button className={s.confirmarBtn} onClick={handlePagarCuota} disabled={pagando}>
                {pagando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" /> Confirmar pago</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagoMultiple && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalPagoMultiple(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalPagoMultiple(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitle}>Pagar monto manualmente</div>
            <div className={s.modalInfo}>
              <div className={s.modalInfoRow}>
                <span>Cliente</span>
                <strong>{modalPagoMultiple.venta.cliente?.nombre}</strong>
              </div>
              <div className={s.modalInfoRow}>
                <span>Pendiente total</span>
                <strong className={s.modalMonto}>{fmt(totalPendienteMultiple, simbolo)}</strong>
              </div>
            </div>
            <div className={s.modalCajaWrap}>
              <label className={s.label}>Monto recibido</label>
              <input
                type="number"
                className={s.filtroInput}
                placeholder="0.00"
                value={montoPagoMultiple}
                min="0"
                step="0.01"
                onChange={e => setMontoPagoMultiple(e.target.value)}
                autoFocus
              />
            </div>
            {distPrev.length > 0 && (
              <div className={s.distPreview}>
                <div className={s.distTitle}>Como se distribuye:</div>
                {distPrev.map(d => (
                  <div key={d.cuota.id} className={`${s.distRow} ${d.tipo === "completa" ? s.distCompleta : s.distParcial}`}>
                    <span>Cuota #{d.cuota.numero}{d.cuota.estado === "parcial" ? " (parcial)" : ""}</span>
                    {d.tipo === "completa" ? (
                      <span className={s.distMonto}>{fmt(d.montoFalta, simbolo)} <ion-icon name="checkmark-circle" /></span>
                    ) : (
                      <span className={s.distMonto}>{fmt(d.montoPagado - Number(d.cuota.monto_pagado ?? 0), simbolo)} <span className={s.distResto}>(restan {fmt(d.montoRestante, simbolo)})</span></span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className={s.modalCajaWrap}>
              <label className={s.label}>Registrar en caja (opcional)</label>
              <select
                className={s.filtroSelect}
                value={cajaMultipleId}
                onChange={e => setCajaMultipleId(e.target.value)}
              >
                <option value="">No registrar en caja</option>
                {(datos?.cajas ?? []).map(cs => (
                  <option key={cs.id} value={cs.id}>{cs.caja?.nombre ?? `Caja #${cs.id}`}</option>
                ))}
              </select>
            </div>
            <div className={s.modalAcciones}>
              <button className={s.cancelarBtn} onClick={() => setModalPagoMultiple(null)}>Cancelar</button>
              <button className={s.confirmarBtn} onClick={handlePagoMultiple} disabled={pagandoMultiple || !montoPagoMultiple}>
                {pagandoMultiple ? <span className={s.spinner} /> : <><ion-icon name="cash-outline" /> Confirmar pago</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}