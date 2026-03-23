"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./PedidosOnline.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const LIMITE = 20

const ESTADOS = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"]

const ESTADO_META = {
  pendiente:  { color: s.estadoPendiente,  icon: "time-outline",            label: "Pendiente"  },
  confirmado: { color: s.estadoConfirmado, icon: "checkmark-circle-outline", label: "Confirmado" },
  enviado:    { color: s.estadoEnviado,    icon: "car-outline",              label: "Enviado"    },
  entregado:  { color: s.estadoEntregado,  icon: "bag-check-outline",        label: "Entregado"  },
  cancelado:  { color: s.estadoCancelado,  icon: "close-circle-outline",     label: "Cancelado"  },
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtHora(f) {
  if (!f) return "—"
  return new Date(f).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
}

async function getPedidos(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await apiFetch(`/api/pos/ventas-online/pedidos/lista/${empresaId}?${params}`)
    if (!res.ok) return { pedidos: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { pedidos: [], total: 0, paginas: 1 } }
}

async function getPedido(empresaId, pedidoId) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/pedidos/${empresaId}/${pedidoId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function cambiarEstadoPedido(empresaId, pedidoId, estado) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/pedidos/${empresaId}/${pedidoId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function getResumenPedidos(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/pedidos/resumen/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function EstadoBadge({ estado }) {
  const m = ESTADO_META[estado] ?? ESTADO_META.pendiente
  return (
    <span className={`${s.badge} ${m.color}`}>
      <ion-icon name={m.icon} />
      {m.label}
    </span>
  )
}

function ModalDetalle({ pedidoId, empresaId, onClose, onCambioEstado, mostrarAlerta }) {
  const [pedido, setPedido]       = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [cambiando, setCambiando] = useState(false)

  useEffect(() => {
    setCargando(true)
    getPedido(empresaId, pedidoId).then(d => { setPedido(d); setCargando(false) })
  }, [pedidoId, empresaId])

  async function handleEstado(nuevoEstado) {
    setCambiando(true)
    const res = await cambiarEstadoPedido(empresaId, pedidoId, nuevoEstado)
    setCambiando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Estado actualizado")
    setPedido(p => ({ ...p, estado: nuevoEstado }))
    onCambioEstado(pedidoId, nuevoEstado)
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}>
          <ion-icon name="close-outline" />
        </button>
        {cargando ? (
          <div className={s.modalLoading}><span className={s.spinnerDark} /></div>
        ) : !pedido ? (
          <div className={s.modalLoading}>No se pudo cargar el pedido</div>
        ) : (
          <>
            <div className={s.modalTitulo}>
              <ion-icon name="bag-outline" />
              Pedido #{pedido.id}
              <EstadoBadge estado={pedido.estado} />
            </div>
            <div className={s.modalBody}>
              <div className={s.seccion}>
                <div className={s.seccionTitulo}><ion-icon name="person-outline" />Cliente</div>
                <div className={s.infoGrid}>
                  <div className={s.infoItem}><span className={s.infoLabel}>Nombre</span><span className={s.infoVal}>{pedido.nombre_cliente}</span></div>
                  {pedido.telefono  && <div className={s.infoItem}><span className={s.infoLabel}>Telefono</span><span className={s.infoVal}>{pedido.telefono}</span></div>}
                  {pedido.email     && <div className={s.infoItem}><span className={s.infoLabel}>Email</span><span className={s.infoVal}>{pedido.email}</span></div>}
                  {pedido.direccion && <div className={s.infoItem}><span className={s.infoLabel}>Direccion</span><span className={s.infoVal}>{pedido.direccion}</span></div>}
                  {pedido.notas     && <div className={s.infoItem}><span className={s.infoLabel}>Notas</span><span className={s.infoVal}>{pedido.notas}</span></div>}
                  <div className={s.infoItem}><span className={s.infoLabel}>Fecha</span><span className={s.infoVal}>{fmtFecha(pedido.created_at)} {fmtHora(pedido.created_at)}</span></div>
                </div>
              </div>
              <div className={s.seccion}>
                <div className={s.seccionTitulo}><ion-icon name="list-outline" />Productos</div>
                <div className={s.itemsList}>
                  {pedido.items?.map((item, i) => (
                    <div key={i} className={s.itemRow}>
                      {item.imagen
                        ? <img src={`${API}${item.imagen}`} alt={item.nombre_producto} className={s.itemImg} />
                        : <div className={s.itemImgVacio}><ion-icon name="cube-outline" /></div>
                      }
                      <span className={s.itemNombre}>{item.nombre_producto}</span>
                      <span className={s.itemCant}>x{item.cantidad}</span>
                      <span className={s.itemSubtotal}>{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className={s.totalRow}>
                  <span>Total</span>
                  <span className={s.totalVal}>{fmt(pedido.total)}</span>
                </div>
              </div>
              <div className={s.seccion}>
                <div className={s.seccionTitulo}><ion-icon name="swap-horizontal-outline" />Cambiar Estado</div>
                <div className={s.estadosBtns}>
                  {ESTADOS.map(e => (
                    <button
                      key={e}
                      className={`${s.estadoBtn} ${pedido.estado === e ? s.estadoBtnActivo : ""}`}
                      onClick={() => pedido.estado !== e && handleEstado(e)}
                      disabled={cambiando || pedido.estado === e}
                    >
                      <ion-icon name={ESTADO_META[e].icon} />
                      {ESTADO_META[e].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PedidosOnline() {
  const router                    = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [pedidos, setPedidos]     = useState([])
  const [total, setTotal]         = useState(0)
  const [paginas, setPaginas]     = useState(1)
  const [pagina, setPagina]       = useState(1)
  const [resumen, setResumen]     = useState(null)
  const [estadoFiltro, setEstado] = useState("")
  const [busqueda, setBusqueda]   = useState("")
  const [inputVal, setInputVal]   = useState("")
  const [cargando, setCargando]   = useState(true)
  const [alerta, setAlerta]       = useState(null)
  const [modalId, setModalId]     = useState(null)
  const debounceRef               = useRef(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (opts = {}) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getPedidos(empresaId, {
      busqueda: opts.busqueda ?? busqueda,
      estado:   opts.estado   ?? estadoFiltro,
      pagina:   opts.pagina   ?? pagina,
      limite:   LIMITE,
    })
    setPedidos(res.pedidos ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId, busqueda, estadoFiltro, pagina])

  useEffect(() => {
    if (!empresaId) return
    cargar()
    getResumenPedidos(empresaId).then(r => setResumen(r))
  }, [empresaId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function handleBusqueda(val) {
    setInputVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBusqueda(val); setPagina(1)
      cargar({ busqueda: val, pagina: 1 })
    }, 400)
  }

  function handleEstado(val) {
    setEstado(val); setPagina(1)
    cargar({ estado: val, pagina: 1 })
  }

  function limpiar() {
    setInputVal(""); setBusqueda(""); setEstado(""); setPagina(1)
    cargar({ busqueda: "", estado: "", pagina: 1 })
  }

  function irPagina(p) { setPagina(p); cargar({ pagina: p }) }

  function handleCambioEstado(pedidoId, nuevoEstado) {
    setPedidos(p => p.map(x => x.id === pedidoId ? { ...x, estado: nuevoEstado } : x))
    getResumenPedidos(empresaId).then(r => setResumen(r))
  }

  const hayFiltros = inputVal || estadoFiltro

  const paginasArr = () => {
    if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1)
    const arr = []
    if (pagina <= 4) arr.push(1, 2, 3, 4, 5, "...", paginas)
    else if (pagina >= paginas - 3) arr.push(1, "...", paginas - 4, paginas - 3, paginas - 2, paginas - 1, paginas)
    else arr.push(1, "...", pagina - 1, pagina, pagina + 1, "...", paginas)
    return arr
  }

  if (!empresaId || cargando) return (
    <div className={s.page}>
      {[...Array(8)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
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

      {resumen && (
        <div className={s.resumenGrid}>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Pedidos hoy</span>
            <span className={s.resumenValor}>{resumen.hoy}</span>
          </div>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Pendientes</span>
            <span className={`${s.resumenValor} ${s.resumenAmarillo}`}>{resumen.pendientes}</span>
          </div>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Entregados este mes</span>
            <span className={`${s.resumenValor} ${s.resumenVerde}`}>{resumen.entregados_mes}</span>
          </div>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Total este mes</span>
            <span className={`${s.resumenValor} ${s.resumenAzul}`}>{fmt(resumen.total_mes)}</span>
          </div>
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar por cliente, email o telefono..."
            value={inputVal}
            onChange={e => handleBusqueda(e.target.value)}
          />
          {inputVal && (
            <button className={s.clearBtn} onClick={() => handleBusqueda("")}>
              <ion-icon name="close-outline" />
            </button>
          )}
        </div>
        <div className={s.topRight}>
          <select className={s.select} value={estadoFiltro} onChange={e => handleEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_META[e].label}</option>)}
          </select>
          {hayFiltros && (
            <button className={s.limpiarBtn} onClick={limpiar}>
              <ion-icon name="close-circle-outline" />
              Limpiar
            </button>
          )}
          <span className={s.conteo}>{total} pedido{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className={s.tabla}>
        <div className={s.tablaHeader}>
          <div className={s.colId}>#</div>
          <div className={s.colCliente}>Cliente</div>
          <div className={s.colContacto}>Contacto</div>
          <div className={s.colFecha}>Fecha</div>
          <div className={s.colTotal}>Total</div>
          <div className={s.colEstado}>Estado</div>
          <div className={s.colAcciones}></div>
        </div>
        <div className={s.tablaBody}>
          {pedidos.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="bag-outline" />
              <p>{hayFiltros ? "Sin resultados con los filtros aplicados" : "No hay pedidos registrados"}</p>
              {hayFiltros && <button className={s.limpiarFiltroEmpty} onClick={limpiar}>Limpiar filtros</button>}
            </div>
          ) : pedidos.map((p, idx) => (
            <div key={p.id} className={`${s.fila} ${idx % 2 === 1 ? s.filaAlterna : ""}`}>
              <div className={s.colId}><span className={s.idText}>#{p.id}</span></div>
              <div className={s.colCliente}>
                <div className={s.clienteWrap}>
                  <div className={s.clienteAvatar}>{p.nombre_cliente?.charAt(0).toUpperCase()}</div>
                  <span className={s.clienteNombre}>{p.nombre_cliente}</span>
                </div>
              </div>
              <div className={s.colContacto}>
                <span className={s.contactoText}>{p.telefono || p.email || "—"}</span>
              </div>
              <div className={s.colFecha}>
                <div>
                  <span className={s.fechaText}>{fmtFecha(p.created_at)}</span>
                  <span className={s.horaText}>{fmtHora(p.created_at)}</span>
                </div>
              </div>
              <div className={s.colTotal}><span className={s.totalText}>{fmt(p.total)}</span></div>
              <div className={s.colEstado}><EstadoBadge estado={p.estado} /></div>
              <div className={s.colAcciones}>
                <button className={s.verBtn} onClick={() => setModalId(p.id)}>
                  <ion-icon name="eye-outline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => irPagina(pagina - 1)}>
            <ion-icon name="chevron-back-outline" />
          </button>
          {paginasArr().map((item, i) =>
            item === "..." ? (
              <span key={`dots-${i}`} className={s.paginaDots}>...</span>
            ) : (
              <button
                key={item}
                className={item === pagina ? s.paginaActiva : s.paginaBtn}
                onClick={() => item !== pagina && irPagina(item)}
              >
                {item}
              </button>
            )
          )}
          <button disabled={pagina === paginas} onClick={() => irPagina(pagina + 1)}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modalId && (
        <ModalDetalle
          pedidoId={modalId}
          empresaId={empresaId}
          onClose={() => setModalId(null)}
          onCambioEstado={handleCambioEstado}
          mostrarAlerta={mostrarAlerta}
        />
      )}
    </div>
  )
}