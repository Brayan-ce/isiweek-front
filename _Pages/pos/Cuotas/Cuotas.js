"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getVentasCuotas, getUsuariosEmpresa, pagarCuota, getDatosCuota, editarEstadoCuota } from "./servidor"
import s from "./Cuotas.module.css"

const EMPRESA_ID = 1

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

export default function Cuotas() {
  const router = useRouter()
  const [ventas, setVentas] = useState([])
  const [total, setTotal] = useState(0)
  const [paginas, setPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [usuarios, setUsuarios] = useState([])
  const [expandidos, setExpandidos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [alerta, setAlerta] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalPago, setModalPago] = useState(null)
  const [editando, setEditando] = useState(false)
  const [cajaSesionId, setCajaSesionId] = useState("")
  const [pagando, setPagando] = useState(false)
  const [datos, setDatos] = useState(null)

  const [filtros, setFiltros] = useState({
    cliente_id: "",
    estado: "",
    fecha_desde: "",
    fecha_hasta: "",
    usuario_id: "",
  })

  const cargar = useCallback(async (f = filtros, p = pagina) => {
    setCargando(true)
    const res = await getVentasCuotas(EMPRESA_ID, { ...f, pagina: p, limite: 15 })
    setVentas(res.ventas ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [filtros, pagina])

  useEffect(() => {
    cargar()
    getUsuariosEmpresa(EMPRESA_ID).then(u => setUsuarios(u ?? []))
    getDatosCuota(EMPRESA_ID).then(d => { if (d) setDatos(d) })
  }, [])

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
    const res = await editarEstadoCuota(EMPRESA_ID, modalEditar.cuota.id, estado)
    setEditando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Estado actualizado")
    setModalEditar(null)
    cargar()
  }

  async function handlePagarCuota() {
    if (!modalPago) return
    setPagando(true)
    const res = await pagarCuota(EMPRESA_ID, modalPago.cuota.id, {
      caja_sesion_id: cajaSesionId ? Number(cajaSesionId) : null,
    })
    setPagando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Cuota ${modalPago.cuota.numero} pagada`)
    setModalPago(null)
    setCajaSesionId("")
    cargar()
  }

  const hayFiltros = Object.values(filtros).some(v => v)

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
          Nueva venta a crédito
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
        {cargando ? (
          [...Array(5)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : ventas.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="wallet-outline" />
            <p>No hay ventas a crédito</p>
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
                  <span className={s.montoPendiente}>{fmt(v.monto_pendiente)}</span>
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
                      <span className={s.cuotaDetalleMonto}>{fmt(c.monto)}</span>
                      <span className={`${s.cuotaEstado} ${c.estado === "pagada" ? s.cuotaEstadoPagada : s.cuotaEstadoPendiente}`}>
                        {c.estado === "pagada" ? "Pagada" : "Pendiente"}
                      </span>
                      <span className={s.cuotaFecha}>{c.pagada_at ? fmtFecha(c.pagada_at) : "—"}</span>
                      <div className={s.cuotaAccion}>
                        {c.estado === "pendiente" && (
                          <button className={s.pagarBtn} onClick={() => setModalPago({ cuota: c, venta: v })}>
                            <ion-icon name="cash-outline" />
                            Pagar
                          </button>
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
                    <span>Total: {fmt(v.total)}</span>
                    <span>Pagado: {fmt(v.monto_pagado)}</span>
                    <span className={v.monto_pendiente > 0 ? s.resumenPendiente : s.resumenOk}>
                      Pendiente: {fmt(v.monto_pendiente)}
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
                <strong className={s.modalMonto}>{fmt(modalEditar.cuota.monto)}</strong>
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
                <span>Monto</span>
                <strong className={s.modalMonto}>{fmt(modalPago.cuota.monto)}</strong>
              </div>
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
    </div>
  )
}