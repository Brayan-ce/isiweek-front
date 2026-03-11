"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./MisVentas.module.css"

const EMPRESA_ID = 1
const USUARIO_ID = 2
const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

async function obtenerDatosHeader(usuarioId) {
  try {
    const res = await fetch(`${API}/api/pos/header/${usuarioId}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function getMisVentas({ empresaId, usuarioId, tipoUsuarioId, fechaDesde, fechaHasta, estado, pagina = 1, limite = 20 }) {
  try {
    const params = new URLSearchParams()
    if (fechaDesde) params.set("fechaDesde", fechaDesde)
    if (fechaHasta) params.set("fechaHasta", fechaHasta)
    if (estado)     params.set("estado", estado)
    params.set("pagina", pagina)
    params.set("limite", limite)
    const res = await fetch(`${API}/api/pos/mis-ventas/${empresaId}/${usuarioId}/${tipoUsuarioId}?${params}`)
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

async function cancelarVenta(ventaId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/mis-ventas/cancelar/${ventaId}/${empresaId}`, {
      method: "PATCH",
    })
    return res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

const ESTADOS = [
  { value: "",           label: "Todos" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada",  label: "Canceladas" },
  { value: "pendiente",  label: "Pendientes" },
]

const ESTADO_STYLE = {
  completada: s.estadoCompletada,
  cancelada:  s.estadoCancelada,
  pendiente:  s.estadoPendiente,
}

export default function MisVentas() {
  const router = useRouter()
  const [tipoUsuario, setTipoUsuario]   = useState(null)
  const [ventas, setVentas]             = useState([])
  const [total, setTotal]               = useState(0)
  const [paginas, setPaginas]           = useState(1)
  const [pagina, setPagina]             = useState(1)
  const [cargando, setCargando]         = useState(true)
  const [fechaDesde, setFechaDesde]     = useState("")
  const [fechaHasta, setFechaHasta]     = useState("")
  const [estado, setEstado]             = useState("")
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [cancelando, setCancelando]     = useState(null)
  const [alerta, setAlerta]             = useState(null)

  useEffect(() => {
    obtenerDatosHeader(USUARIO_ID).then(d => {
      setTipoUsuario(d?.usuario?.tipo_usuario_id ?? 3)
    })
  }, [])

  const cargar = useCallback(async (p = 1) => {
    if (!tipoUsuario) return
    setCargando(true)
    const data = await getMisVentas({
      empresaId:     EMPRESA_ID,
      usuarioId:     USUARIO_ID,
      tipoUsuarioId: tipoUsuario,
      fechaDesde,
      fechaHasta,
      estado,
      pagina: p,
      limite: 20,
    })
    setVentas(data.ventas)
    setTotal(data.total)
    setPaginas(data.paginas)
    setCargando(false)
  }, [tipoUsuario, fechaDesde, fechaHasta, estado])

  useEffect(() => { cargar(1); setPagina(1) }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  async function handleCancelar(venta) {
    setCancelando(venta.id)
    const res = await cancelarVenta(venta.id, EMPRESA_ID)
    setCancelando(null)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Venta #${String(venta.id).padStart(6, "0")} cancelada`)
    setVentaDetalle(null)
    cargar(pagina)
  }

  const simbolo = "RD$"

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <span className={s.totalBadge}>{total} registros</span>
        </div>
        <div className={s.topBarRight}>
          <button className={s.btnSecundario} onClick={() => router.push("/pos/cajas")}>
            <ion-icon name="wallet-outline" />
            Ver caja
          </button>
          <button className={s.btnPrimario} onClick={() => router.push("/pos/vender")}>
            <ion-icon name="add-outline" />
            Nueva venta
          </button>
        </div>
      </div>

      <div className={s.filtros}>
        <div className={s.filtroGrupo}>
          <label>Desde</label>
          <input type="date" className={s.filtroInput} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className={s.filtroGrupo}>
          <label>Hasta</label>
          <input type="date" className={s.filtroInput} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <div className={s.filtroGrupo}>
          <label>Estado</label>
          <select className={s.filtroSelect} value={estado} onChange={e => setEstado(e.target.value)}>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        {(fechaDesde || fechaHasta || estado) && (
          <button className={s.limpiarFiltros} onClick={() => { setFechaDesde(""); setFechaHasta(""); setEstado("") }}>
            <ion-icon name="close-outline" /> Limpiar
          </button>
        )}
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHeader}>
          <span>#</span>
          <span>Fecha</span>
          <span>Cliente</span>
          <span>Vendedor</span>
          <span>Método</span>
          <span>Total</span>
          <span>Estado</span>
          <span></span>
        </div>

        {cargando ? (
          [...Array(8)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : ventas.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="receipt-outline" />
            <p>Sin ventas con los filtros aplicados</p>
          </div>
        ) : (
          ventas.map(v => (
            <div key={v.id} className={s.tableRow}>
              <span className={s.ventaId}>#{String(v.id).padStart(6, "0")}</span>
              <span className={s.fecha}>{fmtFecha(v.created_at)}</span>
              <span className={s.cliente}>{v.cliente?.nombre ?? "Consumidor final"}</span>
              <span className={s.vendedor}>{v.usuario?.nombre_completo ?? "—"}</span>
              <span className={s.metodo}>{v.metodo_pago?.nombre ?? "—"}</span>
              <span className={s.totalCell}>{fmt(v.total, simbolo)}</span>
              <span className={`${s.estado} ${ESTADO_STYLE[v.estado] ?? ""}`}>{v.estado}</span>
              <div className={s.acciones}>
                <button className={s.accionBtn} title="Ver detalle" onClick={() => setVentaDetalle(v)}>
                  <ion-icon name="eye-outline" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); cargar(pagina - 1) }}>
            <ion-icon name="chevron-back-outline" />
          </button>
          {[...Array(paginas)].map((_, i) => (
            <button
              key={i}
              className={pagina === i + 1 ? s.paginaActiva : ""}
              onClick={() => { setPagina(i + 1); cargar(i + 1) }}
            >
              {i + 1}
            </button>
          ))}
          <button disabled={pagina === paginas} onClick={() => { setPagina(p => p + 1); cargar(pagina + 1) }}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {ventaDetalle && (
        <ModalDetalle
          venta={ventaDetalle}
          simbolo={simbolo}
          cancelando={cancelando === ventaDetalle.id}
          onCancelar={() => handleCancelar(ventaDetalle)}
          onClose={() => setVentaDetalle(null)}
        />
      )}
    </div>
  )
}

function ModalDetalle({ venta, simbolo, cancelando, onCancelar, onClose }) {
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const router = useRouter()

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}>
          <ion-icon name="close-outline" />
        </button>

        <div className={s.modalTitulo}>
          <span>Venta #{String(venta.id).padStart(6, "0")}</span>
          <span className={`${s.estado} ${ESTADO_STYLE[venta.estado] ?? ""}`}>{venta.estado}</span>
        </div>

        <div className={s.reciboWrap} id="recibo-print">
          <div className={s.reciboMeta}>
            <div className={s.reciboMetaItem}>
              <ion-icon name="calendar-outline" />
              <span>{new Date(venta.created_at).toLocaleString("es-DO")}</span>
            </div>
            <div className={s.reciboMetaItem}>
              <ion-icon name="person-outline" />
              <span>{venta.cliente?.nombre ?? "Consumidor final"}</span>
            </div>
            {venta.cliente?.cedula_rnc && (
              <div className={s.reciboMetaItem}>
                <ion-icon name="card-outline" />
                <span>{venta.cliente.cedula_rnc}</span>
              </div>
            )}
            <div className={s.reciboMetaItem}>
              <ion-icon name="person-circle-outline" />
              <span>{venta.usuario?.nombre_completo ?? "—"}</span>
            </div>
            <div className={s.reciboMetaItem}>
              <ion-icon name="cash-outline" />
              <span>{venta.metodo_pago?.nombre ?? "—"}</span>
            </div>
            {venta.caja_sesion?.caja && (
              <div className={s.reciboMetaItem}>
                <ion-icon name="wallet-outline" />
                <span>{venta.caja_sesion.caja.nombre}</span>
              </div>
            )}
            {venta.comprobante && (
              <div className={s.reciboMetaItem}>
                <ion-icon name="document-text-outline" />
                <span>{venta.comprobante.codigo} — {venta.comprobante.descripcion}</span>
              </div>
            )}
          </div>

          <div className={s.detalleHeader}>
            <span>Producto</span><span>Cant</span><span>Precio</span><span>Sub</span>
          </div>
          {venta.venta_detalles.map(d => (
            <div key={d.id} className={s.detalleRow}>
              <span>{d.nombre_producto}</span>
              <span>{d.cantidad}</span>
              <span>{fmt(d.precio_unitario, simbolo)}</span>
              <span>{fmt(d.subtotal, simbolo)}</span>
            </div>
          ))}

          <div className={s.detalleTotales}>
            <div className={s.detalleTotalRow}><span>Subtotal</span><span>{fmt(venta.subtotal, simbolo)}</span></div>
            <div className={s.detalleTotalRow}><span>ITBIS</span><span>{fmt(venta.itbis, simbolo)}</span></div>
            {Number(venta.descuento) > 0 && (
              <div className={s.detalleTotalRow}><span>Descuento</span><span>-{fmt(venta.descuento, simbolo)}</span></div>
            )}
            <div className={`${s.detalleTotalRow} ${s.detalleTotalFinal}`}>
              <span>Total</span><span>{fmt(venta.total, simbolo)}</span>
            </div>
            {Number(venta.efectivo_recibido) > 0 && (
              <div className={s.detalleTotalRow}><span>Efectivo</span><span>{fmt(venta.efectivo_recibido, simbolo)}</span></div>
            )}
            {Number(venta.efectivo_recibido) > Number(venta.total) && (
              <div className={s.detalleTotalRow}>
                <span>Cambio</span>
                <span>{fmt(Number(venta.efectivo_recibido) - Number(venta.total), simbolo)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={s.modalAcciones}>
          <button className={s.imprimirBtn} onClick={() => router.push(`/pos/vender/imprimir/${venta.id}`)}>
            <ion-icon name="print-outline" /> Reimprimir
          </button>
          {venta.estado === "completada" && (
            confirmarCancelar ? (
              <div className={s.confirmarWrap}>
                <span>¿Cancelar esta venta?</span>
                <button className={s.confirmarSi} onClick={onCancelar} disabled={cancelando}>
                  {cancelando ? <span className={s.spinner} /> : "Sí, cancelar"}
                </button>
                <button className={s.confirmarNo} onClick={() => setConfirmarCancelar(false)}>No</button>
              </div>
            ) : (
              <button className={s.cancelarVentaBtn} onClick={() => setConfirmarCancelar(true)}>
                <ion-icon name="close-circle-outline" /> Cancelar venta
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}