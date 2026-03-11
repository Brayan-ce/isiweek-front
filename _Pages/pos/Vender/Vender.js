"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Vender.module.css"

const EMPRESA_ID = 1
const USUARIO_ID = 2
const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function getDatosVender(empresaId, usuarioId) {
  try {
    const res = await fetch(`${API}/api/pos/vender/datos/${empresaId}/${usuarioId}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function fetchProductos(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/vender/productos/${empresaId}?${params}`)
    if (!res.ok) return { productos: [], total: 0, paginas: 1 }
    return res.json()
  } catch { return { productos: [], total: 0, paginas: 1 } }
}

async function getProductoPorCodigo(empresaId, codigo) {
  try {
    const res = await fetch(`${API}/api/pos/vender/codigo/${empresaId}/${encodeURIComponent(codigo)}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function crearClienteRapido(empresaId, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/vender/cliente-rapido/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function actualizarStock(empresaId, productoId, stock) {
  try {
    const res = await fetch(`${API}/api/pos/vender/stock/${empresaId}/${productoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Number(stock) }),
    })
    return res.json()
  } catch { return { error: "No se pudo actualizar el stock" } }
}

async function crearVenta(empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/vender/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function Vender() {
  const [datos, setDatos]                   = useState(null)
  const [productos, setProductos]           = useState([])
  const [busqueda, setBusqueda]             = useState("")
  const [pagina, setPagina]                 = useState(1)
  const [totalPags, setTotalPags]           = useState(1)
  const [carrito, setCarrito]               = useState([])
  const [clienteId, setClienteId]           = useState("")
  const [clienteNombre, setClienteNombre]   = useState("")
  const [comprobanteId, setComprobanteId]   = useState("")
  const [metodoPagoId, setMetodoPagoId]     = useState("")
  const [efectivo, setEfectivo]             = useState("")
  const [descuento, setDescuento]           = useState("")
  const [modalCobrar, setModalCobrar]       = useState(false)
  const [modalRecibo, setModalRecibo]       = useState(null)
  const [modalCliente, setModalCliente]     = useState(false)
  const [busqCliente, setBusqCliente]       = useState("")
  const [nuevoNombre, setNuevoNombre]       = useState("")
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [modoCrear, setModoCrear]           = useState(false)
  const [cargando, setCargando]             = useState(false)
  const [alerta, setAlerta]                 = useState(null)
  const [loadingProds, setLoadingProds]     = useState(false)
  const [pagoMixto, setPagoMixto]           = useState(false)
  const [pagos, setPagos]                   = useState([{ metodo_pago_id: "", monto: "" }])
  const [editandoStock, setEditandoStock]   = useState(null)
  const [nuevoStock, setNuevoStock]         = useState("")
  const [guardandoStock, setGuardandoStock] = useState(false)
  const router     = useRouter()
  const scanBuffer = useRef("")
  const scanTimer  = useRef(null)

  useEffect(() => {
    getDatosVender(EMPRESA_ID, USUARIO_ID).then(d => {
      if (!d) return
      setDatos(d)
      const sm = localStorage.getItem("vender_metodo_pago")
      const sc = localStorage.getItem("vender_comprobante")
      if (sm) setMetodoPagoId(sm)
      else if (d.metodosPago?.[0]) setMetodoPagoId(String(d.metodosPago[0].id))
      if (sc) setComprobanteId(sc)
    })
  }, [])

  const cargarProductos = useCallback(async (q = "", p = 1) => {
    setLoadingProds(true)
    const data = await fetchProductos(EMPRESA_ID, q, p, 20)
    setProductos(data.productos ?? [])
    setTotalPags(data.paginas ?? 1)
    setLoadingProds(false)
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  useEffect(() => {
    const t = setTimeout(() => { cargarProductos(busqueda, 1); setPagina(1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargarProductos])

  useEffect(() => {
    const handleKey = (e) => {
      if (modalCobrar || modalRecibo || modalCliente || editandoStock) return
      if (e.key === "Enter") {
        const code = scanBuffer.current.trim()
        scanBuffer.current = ""
        clearTimeout(scanTimer.current)
        if (code.length > 2) agregarPorCodigo(code)
        return
      }
      if (e.key.length === 1) {
        scanBuffer.current += e.key
        clearTimeout(scanTimer.current)
        scanTimer.current = setTimeout(() => { scanBuffer.current = "" }, 100)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [modalCobrar, modalRecibo, modalCliente, editandoStock])

  async function agregarPorCodigo(codigo) {
    const prod = await getProductoPorCodigo(EMPRESA_ID, codigo)
    if (!prod || prod.error) return mostrarAlerta("error", prod?.error ?? "Producto no encontrado")
    if (prod.stock === 0) return mostrarAlerta("warn", `"${prod.nombre}" no tiene stock`)
    agregarAlCarrito(prod)
  }

  function agregarAlCarrito(prod) {
    if (prod.stock === 0) return
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.id === prod.id)
      if (idx >= 0) {
        const next = [...prev]
        if (next[idx].cantidad >= prod.stock) { mostrarAlerta("warn", `Stock máximo: ${prod.stock}`); return prev }
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        return next
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
  }

  function cambiarCantidad(id, val) {
    setCarrito(prev => prev.map(i => {
      if (i.id !== id) return i
      return { ...i, cantidad: Math.max(1, Math.min(Number(val) || 1, i.stock)) }
    }))
  }

  function quitarItem(id) { setCarrito(prev => prev.filter(i => i.id !== id)) }

  function limpiarVenta() {
    setCarrito([])
    setClienteId(""); setClienteNombre(""); setComprobanteId("")
    setDescuento(""); setEfectivo("")
    setPagoMixto(false); setPagos([{ metodo_pago_id: "", monto: "" }])
    const sm = localStorage.getItem("vender_metodo_pago")
    const sc = localStorage.getItem("vender_comprobante")
    if (sm) setMetodoPagoId(sm)
    if (sc) setComprobanteId(sc)
  }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3000)
  }

  function guardarPreferencias() {
    localStorage.setItem("vender_metodo_pago", metodoPagoId)
    localStorage.setItem("vender_comprobante", comprobanteId)
    mostrarAlerta("ok", "Preferencias guardadas")
  }

  function seleccionarCliente(c) {
    setClienteId(String(c.id)); setClienteNombre(c.nombre)
    setModalCliente(false); setBusqCliente(""); setModoCrear(false); setNuevoNombre("")
  }

  function quitarCliente() { setClienteId(""); setClienteNombre("") }

  async function handleCrearCliente() {
    if (!nuevoNombre.trim()) return
    setCreandoCliente(true)
    const res = await crearClienteRapido(EMPRESA_ID, nuevoNombre.trim())
    setCreandoCliente(false)
    if (res.error) return mostrarAlerta("error", res.error)
    datos.clientes.unshift(res)
    seleccionarCliente(res)
    mostrarAlerta("ok", `Cliente "${res.nombre}" creado`)
  }

  function abrirEditarStock(e, prod) {
    e.stopPropagation()
    setEditandoStock(prod.id)
    setNuevoStock(String(prod.stock))
  }

  async function handleGuardarStock(prodId) {
    const val = Number(nuevoStock)
    if (isNaN(val) || val < 0) return mostrarAlerta("error", "Stock inválido")
    setGuardandoStock(true)
    const res = await actualizarStock(EMPRESA_ID, prodId, val)
    setGuardandoStock(false)
    if (res.error) return mostrarAlerta("error", res.error)
    setProductos(prev => prev.map(p => p.id === prodId ? { ...p, stock: val } : p))
    setEditandoStock(null)
    mostrarAlerta("ok", "Stock actualizado")
  }

  function agregarPago() { setPagos(prev => [...prev, { metodo_pago_id: "", monto: "" }]) }
  function quitarPago(idx) { setPagos(prev => prev.filter((_, i) => i !== idx)) }
  function actualizarPago(idx, campo, val) {
    setPagos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: val } : p))
  }

  function abrirModalCobrar() {
    setPagoMixto(false)
    setPagos([{ metodo_pago_id: metodoPagoId, monto: "" }])
    setEfectivo(""); setModalCobrar(true)
  }

  const simbolo      = datos?.moneda?.simbolo ?? "RD$"
  const subtotal     = carrito.reduce((a, i) => a + Number(i.precio) * i.cantidad, 0)
  const itbis        = carrito.reduce((a, i) => a + Number(i.precio) * i.cantidad * (Number(i.itbis_pct) / 100), 0)
  const desc         = Number(descuento) || 0
  const total        = subtotal + itbis - desc
  const totalPagado  = pagoMixto ? pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0) : Number(efectivo) || 0
  const faltaMixto   = pagoMixto ? total - totalPagado : 0
  const cambioSimple = !pagoMixto && Number(efectivo) > 0 ? Number(efectivo) - total : 0

  async function handleCobrar() {
    if (!carrito.length)    return mostrarAlerta("error", "Agrega productos")
    if (!datos?.cajaActiva) return mostrarAlerta("error", "No hay caja activa")
    if (pagoMixto) {
      const pc = pagos.filter(p => p.metodo_pago_id && Number(p.monto) > 0)
      if (pc.length < 2) return mostrarAlerta("error", "Agrega al menos 2 métodos de pago")
      const tp = pc.reduce((a, p) => a + Number(p.monto), 0)
      if (Math.abs(tp - total) > 0.01) return mostrarAlerta("error", `Total pagado (${fmt(tp, simbolo)}) no coincide`)
    } else {
      if (!metodoPagoId) return mostrarAlerta("error", "Selecciona un método de pago")
    }
    setCargando(true)
    try {
      const body = {
        cliente_id:        clienteId     ? Number(clienteId)     : null,
        comprobante_id:    comprobanteId ? Number(comprobanteId) : null,
        metodo_pago_id:    pagoMixto ? null : Number(metodoPagoId),
        pagos:             pagoMixto
          ? pagos.filter(p => p.metodo_pago_id && Number(p.monto) > 0)
                 .map(p => ({ metodo_pago_id: Number(p.metodo_pago_id), monto: Number(p.monto) }))
          : [],
        caja_sesion_id:    datos.cajaActiva.id,
        efectivo_recibido: pagoMixto ? null : (Number(efectivo) || total),
        descuento_global:  desc,
        items: carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad })),
      }
      const venta = await crearVenta(EMPRESA_ID, USUARIO_ID, body)
      if (venta.error) return mostrarAlerta("error", venta.error)
      setModalCobrar(false)
      limpiarVenta()
      router.push(`/pos/vender/imprimir/${venta.id}`)
    } catch {
      mostrarAlerta("error", "Error al procesar la venta")
    } finally {
      setCargando(false)
    }
  }

  if (!datos) return <div className={s.loading}><span className={s.spinner} /></div>

  const clientesFiltrados = datos.clientes.filter(c =>
    !busqCliente ||
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    (c.cedula_rnc ?? "").includes(busqCliente)
  )

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : alerta.tipo === "ok" ? "checkmark-circle-outline" : "warning-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.left}>
        <div className={s.searchRow}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              className={s.searchInput}
              placeholder="Buscar por nombre, código o categoría..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onClick={() => setBusqueda("")}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>
          <div className={s.scannerHint}>
            <ion-icon name="barcode-outline" />
            <span>Escanear</span>
          </div>
        </div>

        <div className={s.prodTableWrap}>
          <div className={s.prodTableHead}>
            <span>Producto</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Stock</span>
            <span></span>
          </div>

          {loadingProds ? (
            [...Array(8)].map((_, i) => <div key={i} className={s.skeletonRow} />)
          ) : productos.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="cube-outline" />
              <p>Sin productos</p>
            </div>
          ) : (
            productos.map(p => {
              const sinStock = p.stock === 0
              const editando = editandoStock === p.id
              return (
                <div
                  key={p.id}
                  className={`${s.prodRow} ${sinStock ? s.prodRowSinStock : ""}`}
                  onClick={() => !sinStock && !editando && agregarAlCarrito(p)}
                >
                  <div className={s.prodCellInfo}>
                    <div className={s.prodThumb}>
                      {p.imagen
                        ? <img src={`${API}${p.imagen}`} alt={p.nombre} />
                        : <ion-icon name="cube-outline" />
                      }
                    </div>
                    <div className={s.prodTextos}>
                      <span className={s.prodNombre}>{p.nombre}</span>
                      {p.marca && <span className={s.prodMarca}>{p.marca.nombre}</span>}
                      {p.codigo && <span className={s.prodCodigo}>{p.codigo}</span>}
                    </div>
                  </div>

                  <span className={s.prodCategoria}>{p.categoria?.nombre ?? "—"}</span>
                  <span className={s.prodPrecio}>{fmt(p.precio, simbolo)}</span>

                  <div className={s.stockCell}>
                    {editando ? (
                      <div className={s.stockEditWrap} onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          className={s.stockEditInput}
                          value={nuevoStock}
                          onChange={e => setNuevoStock(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleGuardarStock(p.id)
                            if (e.key === "Escape") setEditandoStock(null)
                          }}
                        />
                        <button className={s.stockSaveBtn} onClick={() => handleGuardarStock(p.id)} disabled={guardandoStock}>
                          {guardandoStock ? <span className={s.spinnerSm} /> : <ion-icon name="checkmark-outline" />}
                        </button>
                        <button className={s.stockCancelBtn} onClick={() => setEditandoStock(null)}>
                          <ion-icon name="close-outline" />
                        </button>
                      </div>
                    ) : (
                      <div className={s.stockInfo}>
                        <span className={`${s.stockBadge} ${sinStock ? s.stockCero : p.stock <= 5 ? s.stockBajo : s.stockOk}`}>
                          {sinStock ? "Sin stock" : p.stock}
                        </span>
                        <button className={s.stockEditBtn} onClick={e => abrirEditarStock(e, p)} title="Editar stock">
                          <ion-icon name="pencil-outline" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={s.prodAccion}>
                    {sinStock ? (
                      <div className={s.sinStockIcon}><ion-icon name="alert-circle-outline" /></div>
                    ) : (
                      <button className={s.addBtn} onClick={e => { e.stopPropagation(); agregarAlCarrito(p) }}>
                        <ion-icon name="add-outline" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {totalPags > 1 && (
          <div className={s.paginacion}>
            <button disabled={pagina === 1} onClick={() => { const p = pagina - 1; setPagina(p); cargarProductos(busqueda, p) }}>
              <ion-icon name="chevron-back-outline" />
            </button>
            <span>{pagina} / {totalPags}</span>
            <button disabled={pagina === totalPags} onClick={() => { const p = pagina + 1; setPagina(p); cargarProductos(busqueda, p) }}>
              <ion-icon name="chevron-forward-outline" />
            </button>
          </div>
        )}
      </div>

      <div className={s.right}>
        <div className={s.ticketHeader}>
          <ion-icon name="receipt-outline" />
          <span>Ticket de venta</span>
          {carrito.length > 0 && (
            <button className={s.limpiarBtn} onClick={limpiarVenta}>
              <ion-icon name="trash-outline" />
            </button>
          )}
        </div>

        {!datos.cajaActiva && (
          <div className={s.sinCaja}>
            <ion-icon name="warning-outline" />
            <span>No hay caja activa</span>
          </div>
        )}

        <div className={s.ticketFields}>
          <button className={s.clienteBtn} onClick={() => setModalCliente(true)}>
            <ion-icon name="person-outline" />
            <span className={clienteId ? s.clienteSeleccionado : s.clientePlaceholder}>
              {clienteNombre || "Consumidor final"}
            </span>
            {clienteId ? (
              <span className={s.clienteQuitar} onClick={e => { e.stopPropagation(); quitarCliente() }}>
                <ion-icon name="close-circle-outline" />
              </span>
            ) : (
              <ion-icon name="chevron-forward-outline" />
            )}
          </button>
          <div className={s.selectRow}>
            <select className={s.select} value={comprobanteId} onChange={e => setComprobanteId(e.target.value)}>
              <option value="">Sin comprobante</option>
              {datos.comprobantes.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.descripcion}</option>)}
            </select>
            <select className={s.select} value={metodoPagoId} onChange={e => setMetodoPagoId(e.target.value)}>
              <option value="">Método de pago</option>
              {datos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button className={s.guardarPrefBtn} onClick={guardarPreferencias}>
              <ion-icon name="bookmark-outline" /><span>Guardar elección</span>
            </button>
          </div>
        </div>

        <div className={s.carritoWrap}>
          {carrito.length === 0 ? (
            <div className={s.carritoVacio}>
              <ion-icon name="cart-outline" />
              <p>Agrega productos</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} className={s.carritoItem}>
                <div className={s.carritoItemInfo}>
                  <span className={s.carritoNombre}>{item.nombre}</span>
                  <span className={s.carritoPrecio}>{fmt(item.precio, simbolo)}</span>
                </div>
                <div className={s.carritoControls}>
                  <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}><ion-icon name="remove-outline" /></button>
                  <input type="number" min="1" max={item.stock} value={item.cantidad} onChange={e => cambiarCantidad(item.id, e.target.value)} className={s.cantInput} />
                  <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}><ion-icon name="add-outline" /></button>
                  <button className={s.deleteBtn} onClick={() => quitarItem(item.id)}><ion-icon name="trash-outline" /></button>
                </div>
                <span className={s.carritoSubtotal}>{fmt(Number(item.precio) * item.cantidad, simbolo)}</span>
              </div>
            ))
          )}
        </div>

        <div className={s.totales}>
          <div className={s.totalRow}><span>Subtotal</span><span>{fmt(subtotal, simbolo)}</span></div>
          <div className={s.totalRow}><span>ITBIS</span><span>{fmt(itbis, simbolo)}</span></div>
          <div className={s.totalRow}>
            <span>Descuento</span>
            <input type="number" min="0" placeholder="0.00" value={descuento} onChange={e => setDescuento(e.target.value)} className={s.descInput} />
          </div>
          <div className={`${s.totalRow} ${s.totalFinal}`}><span>Total</span><span>{fmt(total, simbolo)}</span></div>
        </div>

        <button className={s.cobrarBtn} disabled={!carrito.length || !datos.cajaActiva} onClick={abrirModalCobrar}>
          <ion-icon name="cash-outline" />
          Cobrar {fmt(total, simbolo)}
        </button>
      </div>

      {modalCliente && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalCliente(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalCliente(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitle}>Seleccionar cliente</div>
            {modoCrear ? (
              <div className={s.clienteCrearWrap}>
                <input autoFocus className={s.clienteSearchInput} placeholder="Nombre del cliente" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCrearCliente()} />
                <div className={s.clienteCrearBtns}>
                  <button className={s.modalCancelar} onClick={() => setModoCrear(false)}>Cancelar</button>
                  <button className={s.modalConfirmar} onClick={handleCrearCliente} disabled={creandoCliente || !nuevoNombre.trim()}>
                    {creandoCliente ? <span className={s.spinner} /> : "Crear y seleccionar"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={s.clienteSearchRow}>
                  <div className={s.clienteSearch}>
                    <ion-icon name="search-outline" />
                    <input autoFocus className={s.clienteSearchInput} placeholder="Buscar por nombre o cédula..." value={busqCliente} onChange={e => setBusqCliente(e.target.value)} />
                  </div>
                  <button className={s.clienteNuevoBtn} onClick={() => setModoCrear(true)}>
                    <ion-icon name="person-add-outline" /><span>Nuevo</span>
                  </button>
                </div>
                <div className={s.clienteLista}>
                  <button className={s.clienteItem} onClick={() => { quitarCliente(); setModalCliente(false) }}>
                    <ion-icon name="person-outline" />
                    <span className={s.clienteItemNombre}>Consumidor final</span>
                  </button>
                  {clientesFiltrados.map(c => (
                    <button key={c.id} className={`${s.clienteItem} ${clienteId === String(c.id) ? s.clienteItemActivo : ""}`} onClick={() => seleccionarCliente(c)}>
                      <div className={s.clienteAvatar}>{c.nombre.charAt(0).toUpperCase()}</div>
                      <div className={s.clienteItemInfo}>
                        <span className={s.clienteItemNombre}>{c.nombre}</span>
                        {c.cedula_rnc && <span className={s.clienteItemCedula}>{c.cedula_rnc}</span>}
                      </div>
                      {clienteId === String(c.id) && <ion-icon name="checkmark-circle" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalCobrar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalCobrar(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalCobrar(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitle}>Confirmar cobro</div>
            <div className={s.modalTotal}>{fmt(total, simbolo)}</div>
            <div className={s.pagoMixtoToggle}>
              <span>Pago mixto</span>
              <button className={`${s.switchBtn} ${pagoMixto ? s.switchOn : ""}`} onClick={() => {
                const next = !pagoMixto
                setPagoMixto(next)
                if (next) setPagos([{ metodo_pago_id: metodoPagoId, monto: "" }, { metodo_pago_id: "", monto: "" }])
                else { setPagos([{ metodo_pago_id: metodoPagoId, monto: "" }]); setEfectivo("") }
              }} type="button">
                <span className={s.switchThumb} />
              </button>
            </div>
            {pagoMixto ? (
              <div className={s.pagosWrap}>
                {pagos.map((p, idx) => (
                  <div key={idx} className={s.pagoRow}>
                    <select className={`${s.select} ${s.pagoSelect}`} value={p.metodo_pago_id} onChange={e => actualizarPago(idx, "metodo_pago_id", e.target.value)}>
                      <option value="">Método</option>
                      {datos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                    <input type="number" min="0" placeholder="0.00" value={p.monto} onChange={e => actualizarPago(idx, "monto", e.target.value)} className={`${s.modalInput} ${s.pagoMonto}`} />
                    {pagos.length > 2 && <button className={s.pagoQuitarBtn} onClick={() => quitarPago(idx)}><ion-icon name="close-outline" /></button>}
                  </div>
                ))}
                <button className={s.pagoAgregarBtn} onClick={agregarPago}><ion-icon name="add-outline" /> Agregar método</button>
                <div className={`${s.cambioRow} ${Math.abs(faltaMixto) < 0.01 ? s.cambioPos : faltaMixto > 0 ? s.cambioNeg : s.cambioPos}`}>
                  <span>{faltaMixto > 0.01 ? "Falta" : faltaMixto < -0.01 ? "Sobrante" : "Exacto"}</span>
                  <span>{fmt(Math.abs(faltaMixto), simbolo)}</span>
                </div>
              </div>
            ) : (
              <div className={s.modalField}>
                <label>Efectivo recibido</label>
                <input type="number" placeholder={String(total.toFixed(2))} value={efectivo} onChange={e => setEfectivo(e.target.value)} className={s.modalInput} autoFocus />
                {Number(efectivo) > 0 && (
                  <div className={`${s.cambioRow} ${cambioSimple < 0 ? s.cambioNeg : s.cambioPos}`}>
                    <span>Cambio</span>
                    <span>{fmt(Math.abs(cambioSimple), simbolo)}{cambioSimple < 0 ? " (faltan)" : ""}</span>
                  </div>
                )}
              </div>
            )}
            <div className={s.modalAcciones}>
              <button className={s.modalCancelar} onClick={() => setModalCobrar(false)}>Cancelar</button>
              <button className={s.modalConfirmar} onClick={handleCobrar} disabled={cargando}>
                {cargando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" /> Completar venta</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRecibo && <ModalRecibo data={modalRecibo} onClose={() => setModalRecibo(null)} />}
    </div>
  )
}

function ModalRecibo({ data, onClose }) {
  const { venta, simbolo } = data
  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${s.modal} ${s.modalRecibo}`}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.reciboWrap} id="recibo-print">
          <div className={s.reciboHeader}>
            <div className={s.reciboTitulo}>RECIBO DE VENTA</div>
            <div className={s.reciboSub}>#{String(venta.id).padStart(6, "0")}</div>
            <div className={s.reciboFecha}>{new Date(venta.created_at).toLocaleString("es-DO")}</div>
          </div>
          {venta.cliente && (
            <div className={s.reciboCliente}>
              <span>Cliente:</span> {venta.cliente.nombre}
              {venta.cliente.cedula_rnc && <span> · {venta.cliente.cedula_rnc}</span>}
            </div>
          )}
          {venta.comprobante && <div className={s.reciboComprobante}>{venta.comprobante.codigo} — {venta.comprobante.descripcion}</div>}
          <div className={s.reciboItems}>
            <div className={s.reciboItemHeader}><span>Producto</span><span>Cant</span><span>Precio</span><span>Sub</span></div>
            {venta.venta_detalles.map(d => (
              <div key={d.id} className={s.reciboItem}>
                <span>{d.nombre_producto}</span><span>{d.cantidad}</span>
                <span>{fmt(d.precio_unitario, simbolo)}</span><span>{fmt(d.subtotal, simbolo)}</span>
              </div>
            ))}
          </div>
          <div className={s.reciboTotales}>
            <div className={s.reciboRow}><span>Subtotal</span><span>{fmt(venta.subtotal, simbolo)}</span></div>
            <div className={s.reciboRow}><span>ITBIS</span><span>{fmt(venta.itbis, simbolo)}</span></div>
            {Number(venta.descuento) > 0 && <div className={s.reciboRow}><span>Descuento</span><span>-{fmt(venta.descuento, simbolo)}</span></div>}
            <div className={`${s.reciboRow} ${s.reciboTotal}`}><span>Total</span><span>{fmt(venta.total, simbolo)}</span></div>
            {venta.es_pago_mixto && venta.venta_pagos?.length > 0 ? (
              venta.venta_pagos.map((p, i) => <div key={i} className={s.reciboRow}><span>{p.metodo_pago.nombre}</span><span>{fmt(p.monto, simbolo)}</span></div>)
            ) : (
              <>
                <div className={s.reciboRow}><span>Método</span><span>{venta.metodo_pago?.nombre}</span></div>
                {Number(venta.efectivo_recibido) > 0 && <div className={s.reciboRow}><span>Efectivo</span><span>{fmt(venta.efectivo_recibido, simbolo)}</span></div>}
                {Number(venta.efectivo_recibido) > Number(venta.total) && (
                  <div className={s.reciboRow}><span>Cambio</span><span>{fmt(Number(venta.efectivo_recibido) - Number(venta.total), simbolo)}</span></div>
                )}
              </>
            )}
          </div>
          <div className={s.reciboFooter}>Gracias por su compra</div>
        </div>
        <div className={s.reciboAcciones}>
          <button className={s.imprimirBtn} onClick={() => window.print()}><ion-icon name="print-outline" /> Imprimir</button>
          <button className={s.modalCancelar} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}