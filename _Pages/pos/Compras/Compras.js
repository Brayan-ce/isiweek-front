"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getCompras, getDatosCompra, crearCompra, editarCompra, eliminarCompra } from "./servidor"
import s from "./Compras.module.css"

const EMPRESA_ID = 1
const USUARIO_ID = 2

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_META = {
  completada: { label: "Completada", cls: "estadoCompletada" },
  pendiente:  { label: "Pendiente",  cls: "estadoPendiente" },
  cancelada:  { label: "Cancelada",  cls: "estadoCancelada" },
}

const ITEM_VACIO = { producto_id: "", nombre_producto: "", cantidad: 1, precio_unitario: "" }

function ModalCompra({ datos, inicial, onClose, onGuardado, mostrarAlerta }) {
  const esEditar = !!inicial
  const [proveedor_id, setProveedorId] = useState(inicial?.proveedor_id ?? "")
  const [estado, setEstado] = useState(inicial?.estado ?? "completada")
  const [items, setItems] = useState(
    inicial?.compra_detalles?.map(d => ({
      producto_id: d.producto_id ?? "",
      nombre_producto: d.nombre_producto ?? "",
      cantidad: d.cantidad,
      precio_unitario: String(d.precio_unitario),
    })) ?? [{ ...ITEM_VACIO }]
  )
  const [cargando, setCargando] = useState(false)

  const total = items.reduce((a, i) => a + (Number(i.precio_unitario) || 0) * (Number(i.cantidad) || 0), 0)

  function setItem(idx, campo, val) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [campo]: val }
      if (campo === "producto_id" && val) {
        const prod = datos.productos.find(p => String(p.id) === String(val))
        if (prod) {
          next[idx].nombre_producto = prod.nombre
          next[idx].precio_unitario = String(prod.precio_costo ?? "")
        }
      }
      return next
    })
  }

  function addItem() { setItems(prev => [...prev, { ...ITEM_VACIO }]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  async function handleGuardar() {
    if (!items.length) return mostrarAlerta("error", "Agrega al menos un producto")
    for (const i of items) {
      if (!i.nombre_producto?.trim()) return mostrarAlerta("error", "Todos los ítems deben tener nombre")
      if (!i.cantidad || Number(i.cantidad) <= 0) return mostrarAlerta("error", "La cantidad debe ser mayor a 0")
      if (!i.precio_unitario || Number(i.precio_unitario) < 0) return mostrarAlerta("error", "Revisa los precios")
    }
    setCargando(true)
    let res
    if (esEditar) {
      res = await editarCompra(EMPRESA_ID, inicial.id, { estado })
    } else {
      res = await crearCompra(EMPRESA_ID, USUARIO_ID, {
        proveedor_id: proveedor_id || null,
        estado,
        items: items.map(i => ({
          producto_id: i.producto_id || null,
          nombre_producto: i.nombre_producto.trim(),
          cantidad: Number(i.cantidad),
          precio_unitario: Number(i.precio_unitario),
        })),
      })
    }
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", esEditar ? "Compra actualizada" : "Compra registrada")
    onGuardado()
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.modalTitle}>{esEditar ? "Editar compra" : "Nueva compra"}</div>

        <div className={s.modalBody}>
          {!esEditar && (
            <div className={s.formGrupo}>
              <label className={s.formLabel}>Proveedor (opcional)</label>
              <select className={s.formSelect} value={proveedor_id} onChange={e => setProveedorId(e.target.value)}>
                <option value="">Sin proveedor</option>
                {datos.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}

          <div className={s.formGrupo}>
            <label className={s.formLabel}>Estado</label>
            <select className={s.formSelect} value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="completada">Completada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {!esEditar && (
            <>
              <div className={s.itemsHeader}>
                <span className={s.formLabel}>Productos</span>
                <button className={s.addItemBtn} onClick={addItem}>
                  <ion-icon name="add-outline" /> Agregar
                </button>
              </div>

              <div className={s.itemsHead}>
                <span>Producto</span>
                <span>Cant.</span>
                <span>Precio costo</span>
                <span></span>
              </div>

              <div className={s.itemsList}>
                {items.map((item, i) => (
                  <div key={i} className={s.itemRow}>
                    <select
                      className={s.itemSelect}
                      value={item.producto_id}
                      onChange={e => setItem(i, "producto_id", e.target.value)}
                    >
                      <option value="">Libre / manual</option>
                      {datos.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {!item.producto_id && (
                      <input
                        className={s.itemInput}
                        placeholder="Nombre del producto"
                        value={item.nombre_producto}
                        onChange={e => setItem(i, "nombre_producto", e.target.value)}
                      />
                    )}
                    <input
                      className={s.itemInputSm}
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={e => setItem(i, "cantidad", e.target.value)}
                    />
                    <input
                      className={s.itemInputSm}
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={item.precio_unitario}
                      onChange={e => setItem(i, "precio_unitario", e.target.value)}
                    />
                    <button className={s.removeItemBtn} onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <ion-icon name="trash-outline" />
                    </button>
                  </div>
                ))}
              </div>

              <div className={s.totalRow}>
                <span>Total estimado</span>
                <span className={s.totalMonto}>{fmt(total)}</span>
              </div>
            </>
          )}
        </div>

        <div className={s.modalAcciones}>
          <button className={s.cancelarBtn} onClick={onClose}>Cancelar</button>
          <button className={s.confirmarBtn} onClick={handleGuardar} disabled={cargando}>
            {cargando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" />{esEditar ? "Guardar cambios" : "Registrar compra"}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Compras() {
  const router = useRouter()
  const [compras, setCompras] = useState([])
  const [total, setTotal] = useState(0)
  const [paginas, setPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState(null)
  const [alerta, setAlerta] = useState(null)
  const [modal, setModal] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const [filtros, setFiltros] = useState({ proveedor_id: "", estado: "", fecha_desde: "", fecha_hasta: "" })

  const cargar = useCallback(async (f = filtros, p = pagina) => {
    setCargando(true)
    const res = await getCompras(EMPRESA_ID, { ...f, pagina: p, limite: 15 })
    setCompras(res.compras ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [filtros, pagina])

  useEffect(() => {
    cargar()
    getDatosCompra(EMPRESA_ID).then(d => { if (d) setDatos(d) })
  }, [])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function aplicarFiltros() { setPagina(1); cargar(filtros, 1) }
  function limpiarFiltros() {
    const v = { proveedor_id: "", estado: "", fecha_desde: "", fecha_hasta: "" }
    setFiltros(v); setPagina(1); cargar(v, 1)
  }

  async function handleEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const res = await eliminarCompra(EMPRESA_ID, confirmEliminar.id)
    setEliminando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Compra eliminada")
    setConfirmEliminar(null)
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
        <span className={s.conteo}>{total} compras</span>
        <button className={s.nuevaBtn} onClick={() => datos && setModal({ tipo: "crear" })}>
          <ion-icon name="add-outline" />
          Nueva compra
        </button>
      </div>

      <div className={s.filtrosCard}>
        <div className={s.filtrosGrid}>
          <div className={s.filtroGrupo}>
            <label className={s.filtroLabel}>Estado</label>
            <select className={s.filtroSelect} value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="completada">Completada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          {datos && (
            <div className={s.filtroGrupo}>
              <label className={s.filtroLabel}>Proveedor</label>
              <select className={s.filtroSelect} value={filtros.proveedor_id} onChange={e => setFiltros(p => ({ ...p, proveedor_id: e.target.value }))}>
                <option value="">Todos</option>
                {datos.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
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

      <div className={s.tabla}>
        <div className={s.tablaHead}>
          <span>#</span>
          <span>Proveedor</span>
          <span>Ítems</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span></span>
        </div>

        {cargando ? (
          [...Array(6)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : compras.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="bag-handle-outline" />
            <p>No hay compras registradas</p>
          </div>
        ) : compras.map(c => {
          const meta = ESTADO_META[c.estado] ?? ESTADO_META.pendiente
          return (
            <div key={c.id} className={s.tablaRow}>
              <span className={s.colId}>#{String(c.id).padStart(5, "0")}</span>
              <div className={s.colProveedor}>
                <span className={s.provNombre}>{c.proveedor?.nombre ?? <em className={s.sinProv}>Sin proveedor</em>}</span>
                {c.proveedor?.rnc && <span className={s.provRnc}>{c.proveedor.rnc}</span>}
              </div>
              <span className={s.colItems}>{c.items_count} ítem{c.items_count !== 1 ? "s" : ""}</span>
              <span className={s.colTotal}>{fmt(c.total)}</span>
              <span className={`${s.estadoBadge} ${s[meta.cls]}`}>{meta.label}</span>
              <span className={s.colFecha}>{fmtFecha(c.created_at)}</span>
              <div className={s.colAcciones}>
                <button className={s.accionBtn} title="Ver detalle" onClick={() => router.push(`/pos/compras/ver/${c.id}`)}>
                  <ion-icon name="eye-outline" />
                </button>
                <button className={s.accionBtn} title="Editar estado" onClick={() => datos && setModal({ tipo: "editar", compra: c })}>
                  <ion-icon name="pencil-outline" />
                </button>
                {c.estado !== "completada" && (
                  <button className={`${s.accionBtn} ${s.accionEliminar}`} title="Eliminar" onClick={() => setConfirmEliminar(c)}>
                    <ion-icon name="trash-outline" />
                  </button>
                )}
              </div>
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

      {modal && datos && (
        <ModalCompra
          datos={datos}
          inicial={modal.tipo === "editar" ? modal.compra : null}
          onClose={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
          mostrarAlerta={mostrarAlerta}
        />
      )}

      {confirmEliminar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setConfirmEliminar(null)}>
          <div className={s.modalConfirm}>
            <div className={s.confirmIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.confirmTitle}>¿Eliminar compra?</div>
            <p className={s.confirmDesc}>
              Esta acción no se puede deshacer. Solo se pueden eliminar compras no completadas.
            </p>
            <div className={s.modalAcciones}>
              <button className={s.cancelarBtn} onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button className={`${s.confirmarBtn} ${s.confirmarBtnDanger}`} onClick={handleEliminar} disabled={eliminando}>
                {eliminando ? <span className={s.spinner} /> : <><ion-icon name="trash-outline" />Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}