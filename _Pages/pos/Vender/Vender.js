"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Vender.module.css"

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

async function getDatosVender(empresaId, usuarioId) {
  try {
    const res = await apiFetch(`/api/pos/vender/datos/${empresaId}/${usuarioId}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function fetchProductos(empresaId, busqueda = "", pagina = 1, limite = 24) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await apiFetch(`/api/pos/vender/productos/${empresaId}?${params}`)
    if (!res.ok) return { productos: [], total: 0, paginas: 1 }
    return res.json()
  } catch { return { productos: [], total: 0, paginas: 1 } }
}

async function getProductoPorCodigo(empresaId, codigo) {
  try {
    const res = await apiFetch(`/api/pos/vender/codigo/${empresaId}/${encodeURIComponent(codigo)}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function crearClienteRapido(empresaId, nombre) {
  try {
    const res = await apiFetch(`/api/pos/vender/cliente-rapido/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function actualizarStock(empresaId, productoId, stock) {
  try {
    const res = await apiFetch(`/api/pos/vender/stock/${empresaId}/${productoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Number(stock) }),
    })
    return res.json()
  } catch { return { error: "No se pudo actualizar el stock" } }
}

async function crearVenta(empresaId, usuarioId, body) {
  try {
    const res = await apiFetch(`/api/pos/vender/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

function getMetodoIcon(nombre) {
  const n = (nombre ?? "").toLowerCase()
  if (n.includes("efectivo") || n.includes("cash")) return "cash-outline"
  if (n.includes("tarjeta") || n.includes("credito") || n.includes("crédito") || n.includes("debito") || n.includes("débito")) return "card-outline"
  if (n.includes("transfer")) return "swap-horizontal-outline"
  if (n.includes("cheque")) return "document-text-outline"
  return "wallet-outline"
}

function getMetodoColor(nombre) {
  const n = (nombre ?? "").toLowerCase()
  if (n.includes("efectivo") || n.includes("cash"))      return { bg: "#dcfce7", color: "#16a34a", border: "#86efac" }
  if (n.includes("tarjeta") && n.includes("cr"))         return { bg: "#f3e8ff", color: "#7c3aed", border: "#d8b4fe" }
  if (n.includes("credito") || n.includes("crédito"))    return { bg: "#fef3c7", color: "#d97706", border: "#fde68a" }
  if (n.includes("debito")  || n.includes("débito"))     return { bg: "#dbeafe", color: "#2563eb", border: "#93c5fd" }
  if (n.includes("transfer"))                           return { bg: "#e0f2fe", color: "#0284c7", border: "#7dd3fc" }
  if (n.includes("cheque"))                              return { bg: "#fef9c3", color: "#ca8a04", border: "#fde047" }
  return                                                        { bg: "#e0e7ff", color: "#4f46e5", border: "#a5b4fc" }
}

export default function Vender() {
  const [empresaId, setEmpresaId]           = useState(null)
  const [usuarioId, setUsuarioId]           = useState(null)
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
  const [modalCliente, setModalCliente]     = useState(false)
  const [busqCliente, setBusqCliente]       = useState("")
  const [nuevoNombre, setNuevoNombre]       = useState("")
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [modoCrear, setModoCrear]           = useState(false)
  const [modalClienteRapido, setModalClienteRapido] = useState(false)
  const [cargando, setCargando]             = useState(false)
  const [alerta, setAlerta]                 = useState(null)
  const [loadingProds, setLoadingProds]     = useState(false)
  const [pagoMixto, setPagoMixto]           = useState(false)
  const [pagos, setPagos]                   = useState([{ metodo_pago_id: "", monto: "" }])
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false)
  const [editandoStock, setEditandoStock]   = useState(null)
  const [stockEditorProd, setStockEditorProd] = useState(null)
  const [nuevoStock, setNuevoStock]         = useState("")
  const [guardandoStock, setGuardandoStock] = useState(false)
  const router     = useRouter()
  const scanBuffer = useRef("")
  const scanTimer  = useRef(null)
  const clienteStripRef = useRef(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!empresaId || !usuarioId) return
    getDatosVender(empresaId, usuarioId).then(d => {
      if (!d) return
      setDatos(d)
      const sm = localStorage.getItem("vender_metodo_pago")
      const sc = localStorage.getItem("vender_comprobante")
      if (sm) setMetodoPagoId(sm)
      else if (d.metodosPago?.[0]) setMetodoPagoId(String(d.metodosPago[0].id))
      if (sc) setComprobanteId(sc)
    })
  }, [empresaId, usuarioId])

  const cargarProductos = useCallback(async (q = "", p = 1) => {
    if (!empresaId) return
    setLoadingProds(true)
    const data = await fetchProductos(empresaId, q, p, 24)
    setProductos(data.productos ?? [])
    setTotalPags(data.paginas ?? 1)
    setLoadingProds(false)
  }, [empresaId])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  useEffect(() => {
    const t = setTimeout(() => { cargarProductos(busqueda, 1); setPagina(1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargarProductos])

  useEffect(() => {
    const closeClienteDropdown = (e) => {
      if (!clienteStripRef.current) return
      if (!clienteStripRef.current.contains(e.target)) setClienteDropdownOpen(false)
    }
    document.addEventListener("mousedown", closeClienteDropdown)
    return () => document.removeEventListener("mousedown", closeClienteDropdown)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (modalCobrar || modalCliente || editandoStock) return
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
  }, [modalCobrar, modalCliente, editandoStock])

  async function agregarPorCodigo(codigo) {
    const prod = await getProductoPorCodigo(empresaId, codigo)
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
    mostrarAlerta("ok", `${prod.nombre} agregado`)
  }

  function cambiarCantidad(id, val) {
    setCarrito(prev => prev.map(i => {
      if (i.id !== id) return i
      return { ...i, cantidad: Math.max(1, Math.min(Number(val) || 1, i.stock)) }
    }))
  }

  function quitarItem(id) { setCarrito(prev => prev.filter(i => i.id !== id)) }

  function toggleItbisCarrito(id) {
    setCarrito(prev => prev.map(i => i.id === id ? { ...i, itbis_habilitado: !i.itbis_habilitado } : i))
  }

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
    setTimeout(() => setAlerta(null), 2500)
  }

  function guardarPreferencias() {
    localStorage.setItem("vender_metodo_pago", metodoPagoId)
    localStorage.setItem("vender_comprobante", comprobanteId)
    const metodo = datos?.metodosPago?.find(m => String(m.id) === String(metodoPagoId))
    mostrarAlerta("ok", `✓ "${metodo?.nombre ?? "Método"}" guardado como predeterminado`)
  }

  function seleccionarCliente(c) {
    setClienteId(String(c.id)); setClienteNombre(c.nombre)
    setModalCliente(false); setBusqCliente(""); setModoCrear(false); setNuevoNombre("")
    setClienteDropdownOpen(false)
  }

  function quitarCliente() {
    setClienteId("")
    setClienteNombre("")
    setBusqCliente("")
    setModoCrear(false)
    setNuevoNombre("")
    setClienteDropdownOpen(false)
  }

  async function handleCrearCliente() {
    if (!nuevoNombre.trim()) return
    setCreandoCliente(true)
    const res = await crearClienteRapido(empresaId, nuevoNombre.trim())
    setCreandoCliente(false)
    if (res.error) return mostrarAlerta("error", res.error)
    datos.clientes.unshift(res)
    seleccionarCliente(res)
    setModalClienteRapido(false)
    mostrarAlerta("ok", `Cliente "${res.nombre}" creado`)
  }

  function abrirEditarStock(e, prod) {
    e.stopPropagation()
    setEditandoStock(prod.id)
    setStockEditorProd(prod)
    setNuevoStock(String(prod.stock))
  }

  async function handleGuardarStock(prodId) {
    const val = Number(nuevoStock)
    if (isNaN(val) || val < 0) return mostrarAlerta("error", "Stock inválido")
    setGuardandoStock(true)
    const res = await actualizarStock(empresaId, prodId, val)
    setGuardandoStock(false)
    if (res.error) return mostrarAlerta("error", res.error)
    setProductos(prev => prev.map(p => p.id === prodId ? { ...p, stock: val } : p))
    setEditandoStock(null)
    setStockEditorProd(null)
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
    setEfectivo("")
    setModalCobrar(true)
  }

  const simbolo      = (datos?.moneda?.simbolo && String(datos.moneda.simbolo).trim()) || "RD$"
  const cajaDePrevioDia = datos?.cajaActiva?.abierta_at
    ? new Date(datos.cajaActiva.abierta_at).toDateString() !== new Date().toDateString()
    : false
  const subtotal     = carrito.reduce((a, i) => a + Number(i.precio) * i.cantidad, 0)
  const itbis        = carrito.reduce((a, i) => a + (i.itbis_habilitado ? Number(i.precio) * i.cantidad * (Number(i.itbis_pct) / 100) : 0), 0)
  const desc         = Number(descuento) || 0
  const total        = subtotal + itbis - desc
  const totalPagado  = pagoMixto ? pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0) : Number(efectivo) || 0
  const faltaMixto   = pagoMixto ? total - totalPagado : 0
  const cambioSimple = !pagoMixto && Number(efectivo) > 0 ? Number(efectivo) - total : 0
  const pagarRojo  = carrito.length > 0 && (pagoMixto ? faltaMixto > 0.01 : (Number(efectivo) > 0 && cambioSimple < 0))
  const pagarVerde = carrito.length > 0 && (pagoMixto ? Math.abs(faltaMixto) <= 0.01 && pagos.some(p => Number(p.monto) > 0) : (Number(efectivo) > 0 && cambioSimple >= 0))

  async function handleCobrar() {
    if (!carrito.length)    return mostrarAlerta("error", "Agrega productos al ticket")
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
      // Verificar en tiempo real que la caja sigue abierta
      const datosActuales = await getDatosVender(empresaId, usuarioId)
      if (!datosActuales?.cajaActiva) {
        setDatos(prev => ({ ...prev, cajaActiva: null }))
        mostrarAlerta("error", "La caja fue cerrada. Abre una caja para continuar.")
        return
      }
      const cajaId = datosActuales.cajaActiva.id

      const body = {
        cliente_id:        clienteId     ? Number(clienteId)     : null,
        comprobante_id:    comprobanteId ? Number(comprobanteId) : null,
        metodo_pago_id:    pagoMixto ? null : Number(metodoPagoId),
        pagos:             pagoMixto
          ? pagos.filter(p => p.metodo_pago_id && Number(p.monto) > 0)
                 .map(p => ({ metodo_pago_id: Number(p.metodo_pago_id), monto: Number(p.monto) }))
          : [],
        caja_sesion_id:    cajaId,
        efectivo_recibido: pagoMixto ? null : (Number(efectivo) || total),
        descuento_global:  desc,
        items: carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad, itbis_habilitado: i.itbis_habilitado ?? true })),
      }
      const venta = await crearVenta(empresaId, usuarioId, body)
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

  if (!empresaId || !datos) return (
    <div className={s.loading}>
      <div className={s.loadingInner}>
        <span className={s.spinner} />
        <p>Cargando POS...</p>
      </div>
    </div>
  )

  const clientesFiltrados = datos.clientes.filter(c =>
    !busqCliente ||
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    (c.cedula_rnc ?? "").includes(busqCliente)
  ).slice(0, 8)

  return (
    <div className={s.page}>

      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={
            alerta.tipo === "error" ? "alert-circle-outline"
            : alerta.tipo === "ok"  ? "checkmark-circle-outline"
            : "warning-outline"
          } />
          {alerta.msg}
        </div>
      )}

      <div className={s.left}>

        <div className={s.searchArea}>
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
          <div className={s.scanHint}>
            <ion-icon name="barcode-outline" />
            <span>Escanear</span>
          </div>
        </div>

        <div className={s.leftBody}>
        <div className={s.prodSection}>
        <div className={s.prodGrid}>
          {loadingProds
            ? [...Array(12)].map((_, i) => <div key={i} className={s.skeleton} />)
            : productos.length === 0
            ? (
              <div className={s.emptyGrid}>
                <ion-icon name="cube-outline" />
                <p>Sin productos</p>
              </div>
            )
            : productos.map(p => {
                const sinStock = p.stock === 0
                const stockBajo = p.stock > 0 && p.stock <= 5
                const editando = editandoStock === p.id
                return (
                  <div
                    key={p.id}
                    className={`${s.prodCard} ${sinStock ? s.prodCardOff : ""}`}
                    onClick={() => !sinStock && !editando && agregarAlCarrito(p)}
                  >
                    <div className={s.prodImgWrap}>
                      {p.imagen
                        ? <img src={`${API}${p.imagen}`} alt={p.nombre} className={s.prodImg} />
                        : <div className={s.prodImgVacio}><ion-icon name="cube-outline" /></div>
                      }
                    </div>
                    <div className={s.prodBody}>
                      <span className={s.prodNombre}>{p.nombre}</span>
                      <div className={s.prodMeta}>
                        <span className={`${s.stockPill} ${sinStock ? s.badgeCero : stockBajo ? s.badgeBajo : s.badgeOk}`}>
                          {sinStock ? "Sin stock" : `${p.stock} unidades`}
                        </span>
                        <span className={s.prodPrecio}>{fmt(p.precio, simbolo)}</span>
                      </div>
                      <div className={s.prodActions} onClick={e => e.stopPropagation()}>
                        <button
                          className={s.editStockBtn}
                          onClick={e => abrirEditarStock(e, p)}
                          title="Editar stock"
                        >
                          <ion-icon name="pencil-outline" />
                        </button>
                        {!sinStock && (
                          <button className={s.addBtn} onClick={() => agregarAlCarrito(p)}>
                            <ion-icon name="add-outline" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
          }
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

        <div className={s.clienteStrip} ref={clienteStripRef}>
          <div className={s.clienteStripHeader}>
            <ion-icon name="person-outline" />
            <span>Cliente</span>
            {clienteId && (
              <button className={s.limpiarBtn} onClick={quitarCliente}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>
          <div className={s.clienteStripBody}>
            <div className={s.clienteSearchRow}>
              <div className={s.clienteSearchBox}>
                <ion-icon name="search-outline" />
                <input
                  className={s.clienteSearchInput}
                  placeholder="Buscar cliente..."
                  value={busqCliente}
                  onFocus={() => setClienteDropdownOpen(true)}
                  onChange={e => { setBusqCliente(e.target.value); setClienteDropdownOpen(true) }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && clientesFiltrados.length > 0) seleccionarCliente(clientesFiltrados[0])
                  }}
                />
              </div>
              <button
                className={s.clienteRapidoBtn}
                onClick={() => {
                  setModalClienteRapido(true)
                  setNuevoNombre(busqCliente.trim())
                }}
              >
                <ion-icon name="person-add-outline" />
                Rápido
              </button>
            </div>

            {clienteId && (
              <div className={s.clienteSeleccionadoInline}>
                <ion-icon name="checkmark-circle-outline" />
                <span>{clienteNombre}</span>
              </div>
            )}

            {clienteDropdownOpen && busqCliente.trim() && (
              <div className={s.clienteResultadosFlotante}>
                {clientesFiltrados.length === 0 ? (
                  <div className={s.clienteResultadoVacio}>Sin coincidencias</div>
                ) : (
                  clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      className={s.clienteResultadoItem}
                      onClick={() => seleccionarCliente(c)}
                    >
                      <div className={s.clienteResultadoAvatar}>{c.nombre.charAt(0).toUpperCase()}</div>
                      <div className={s.clienteResultadoInfo}>
                        <span>{c.nombre}</span>
                        {c.cedula_rnc && <small>{c.cedula_rnc}</small>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className={s.carritoStrip}>
          <div className={s.carritoStripHeader}>
            <ion-icon name="cart-outline" />
            <span>Carrito</span>
            {carrito.length > 0 && <span className={s.ticketCount}>{carrito.length}</span>}
            {carrito.length > 0 && (
              <button className={s.limpiarBtn} onClick={limpiarVenta}>
                <ion-icon name="trash-outline" />
              </button>
            )}
          </div>
          <div className={s.carritoStripItems}>
            {carrito.length === 0 ? (
              <div className={s.carritoVacioH}>
                <ion-icon name="cart-outline" />
                <span>Agrega productos al carrito</span>
              </div>
            ) : (
              carrito.map(item => (
                <div key={item.id} className={s.carritoChip}>
                  <div className={s.carritoChipTop}>
                    <div className={s.carritoChipImg}>
                      {item.imagen
                        ? <img src={`${API}${item.imagen}`} alt={item.nombre} className={s.carritoChipThumb} />
                        : <ion-icon name="cube-outline" />
                      }
                    </div>
                    <span className={s.carritoChipNombre}>{item.nombre}</span>
                    <span className={s.carritoChipTotal}>{fmt(Number(item.precio) * item.cantidad, simbolo)}</span>
                  </div>
                  <div className={s.carritoChipBot}>
                    <div className={s.itbisWrap} onClick={() => toggleItbisCarrito(item.id)} title={item.itbis_habilitado ? "Desactivar ITBIS" : "Activar ITBIS"}>
                      <span className={`${s.itbisSwitch} ${item.itbis_habilitado ? s.itbisSwitchOn : ""}`}>
                        <span className={s.itbisSwitchThumb} />
                      </span>
                      <span className={`${s.itbisLabel} ${item.itbis_habilitado ? s.itbisLabelOn : s.itbisLabelOff}`}>
                        ITBIS {item.itbis_habilitado ? `${Number(item.itbis_pct).toFixed(0)}%` : "off"}
                      </span>
                    </div>
                    <span className={s.carritoChipPrecio}>{fmt(item.precio, simbolo)}</span>
                    <div className={s.carritoChipControls}>
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}>
                        <ion-icon name="remove-outline" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.cantidad}
                        onChange={e => cambiarCantidad(item.id, e.target.value)}
                        className={s.cantInput}
                      />
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}>
                        <ion-icon name="add-outline" />
                      </button>
                      <button className={s.deleteBtn} onClick={() => quitarItem(item.id)}>
                        <ion-icon name="trash-outline" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>

      <div className={s.right}>

        <div className={s.ticketHeader}>
          <ion-icon name="receipt-outline" />
          <span className={s.ticketTitle}>Resumen</span>
          <div className={s.ticketHeaderSep} />
          {datos.cajaActiva ? (
            <div className={`${s.cajaChipHead} ${cajaDePrevioDia ? s.cajaChipHeadVieja : ""}`}>
              {cajaDePrevioDia
                ? <ion-icon name="warning-outline" />
                : <span className={s.cajaChipDot} />
              }
              {datos.cajaActiva.caja?.numero_usuario != null ? `Caja ${datos.cajaActiva.caja.numero_usuario}` : "Caja activa"}
            </div>
          ) : (
            <div className={s.cajaChipHeadOff}>
              <ion-icon name="warning-outline" />
              Sin caja
            </div>
          )}
        </div>

        {/* ── Banner caja vieja / sin caja ── */}
        {cajaDePrevioDia && (
          <div className={s.alertaCajaVieja}>
            <ion-icon name="warning-outline" />
            <div className={s.alertaCajaViejaInfo}>
              <strong>Caja antigua</strong>
              <span>Abierta el {new Date(datos.cajaActiva.abierta_at).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })}. Se recomienda cerrarla e iniciar una nueva sesión.</span>
            </div>
            <button className={s.alertaCajaViejaBtn} onClick={() => router.push("/pos/cajas")}>
              <ion-icon name="arrow-forward-outline" /> Ir a cajas
            </button>
          </div>
        )}

        {!datos.cajaActiva && (
          <div className={s.sinCajaBlock}>
            <div className={s.sinCajaBlockIcon}><ion-icon name="wallet-outline" /></div>
            <strong>No tienes caja abierta</strong>
            <span>Necesitas abrir una caja para poder vender</span>
            <button className={s.sinCajaBlockBtn} onClick={() => router.push("/pos/cajas")}>
              <ion-icon name="add-circle-outline" /> Abrir caja
            </button>
          </div>
        )}

        {/* ── Selector tipo de pago ── */}
        <div className={s.tipoPagoBar}>
          <button
            className={`${s.tipoPagoBtn} ${!pagoMixto ? s.tipoPagoBtnActivo : ""}`}
            onClick={() => { setPagoMixto(false); setPagos([{ metodo_pago_id: metodoPagoId, monto: "" }]); setEfectivo("") }}
          >
            <ion-icon name="cash-outline" />
            Pago fijo
          </button>
          <button
            className={`${s.tipoPagoBtn} ${pagoMixto ? s.tipoPagoBtnActivo : ""}`}
            onClick={() => { setPagoMixto(true); setPagos([{ metodo_pago_id: metodoPagoId, monto: "" }, { metodo_pago_id: "", monto: "" }]) }}
          >
            <ion-icon name="git-merge-outline" />
            Pago mixto
          </button>
        </div>


        {!pagoMixto ? (
          <>
            <div className={s.ticketConfig}>
              <div className={s.configRow}>
                <span className={s.configLabel}>
                  <ion-icon name="document-text-outline" />
                  Comprobante
                </span>
                <select className={s.select} value={comprobanteId} onChange={e => setComprobanteId(e.target.value)}>
                  <option value="">Sin comprobante</option>
                  {datos.comprobantes.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className={s.configRow}>
                <span className={s.configLabel}>
                  <ion-icon name="card-outline" />
                  Método de pago
                </span>
                <div className={s.configRowInline}>
                  <select className={s.select} value={metodoPagoId} onChange={e => setMetodoPagoId(e.target.value)}>
                    <option value="">Seleccionar método</option>
                    {datos.metodosPago.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                  <button
                    className={s.prefBtnStar}
                    onClick={guardarPreferencias}
                    title="Guardar como método predeterminado"
                  >
                    <ion-icon name="bookmark-outline" />
                  </button>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className={s.pagosMixtoWrap}>
            {pagos.map((p, idx) => (
              <div key={idx} className={s.pagoRow}>
                <select
                  className={s.select}
                  value={p.metodo_pago_id}
                  onChange={e => actualizarPago(idx, "metodo_pago_id", e.target.value)}
                >
                  <option value="">Método de pago</option>
                  {datos.metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={p.monto}
                  onChange={e => actualizarPago(idx, "monto", e.target.value)}
                  className={s.pagoMontoInput}
                />
                {pagos.length > 2 && (
                  <button className={s.pagoQuitarBtn} onClick={() => quitarPago(idx)}>
                    <ion-icon name="close-outline" />
                  </button>
                )}
              </div>
            ))}
            <button className={s.pagoAgregarBtn} onClick={agregarPago}>
              <ion-icon name="add-outline" />
              Agregar método
            </button>
            <div className={s.mixtoResumen}>
              <div className={s.mixtoResumenRow}>
                <span>Total de venta</span>
                <span>{fmt(total, simbolo)}</span>
              </div>
              <div className={s.mixtoResumenRow}>
                <span>Total ingresado</span>
                <span>{fmt(totalPagado, simbolo)}</span>
              </div>
              <div className={`${s.mixtoResumenRow} ${s.mixtoResumenFinal} ${Math.abs(faltaMixto) < 0.01 ? s.mixtoOk : faltaMixto > 0 ? s.mixtoFalta : s.mixtoSobra}`}>
                <span>{faltaMixto > 0.01 ? "⚠️ Falta" : faltaMixto < -0.01 ? "✔️ Sobrante" : "✔️ Exacto"}</span>
                <span>{fmt(Math.abs(faltaMixto), simbolo)}</span>
              </div>
            </div>
          </div>
        )}

        <div className={s.totalesWrap}>
          <div className={s.totalRow}><span>Subtotal</span><span>{fmt(subtotal, simbolo)}</span></div>
          <div className={s.totalRow}><span>ITBIS</span><span>{fmt(itbis, simbolo)}</span></div>
          <div className={s.totalRow}>
            <span>Descuento</span>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className={s.descInput}
            />
          </div>
        </div>

        {!pagoMixto && (
          <div className={s.efectivoSection}>
            <label className={s.efectivoLabel}>Efectivo recibido</label>
            <input
              type="number"
              placeholder={String(total.toFixed(2))}
              value={efectivo}
              onChange={e => setEfectivo(e.target.value)}
              className={s.efectivoInput}
            />
            {Number(efectivo) > 0 && (
              <div className={`${s.cambioRow} ${cambioSimple < 0 ? s.cambioNeg : s.cambioOk}`}>
                <span>Cambio</span>
                <span>{fmt(Math.abs(cambioSimple), simbolo)}{cambioSimple < 0 ? " (falta)" : ""}</span>
              </div>
            )}
          </div>
        )}

        <div className={s.pagarRow}>
          <div className={s.totalAPagarInfo}>
            <span className={s.totalAPagarLabel}>Total a Pagar</span>
            <span className={`${s.totalAPagarMonto} ${pagarRojo ? s.totalAPagarRojo : pagarVerde ? s.totalAPagarVerde : s.totalAPagarAzul}`}>
              {fmt(total, simbolo)}
            </span>
          </div>
          <button
            className={s.pagarBtn}
            disabled={!carrito.length || !datos.cajaActiva || cargando}
            onClick={handleCobrar}
          >
            {cargando ? <span className={s.spinner} /> : <ion-icon name="cash-outline" />}
            Pagar
          </button>
        </div>

      </div>

      {editandoStock && stockEditorProd && (
        <div className={s.stockOverlay} onClick={() => { setEditandoStock(null); setStockEditorProd(null) }}>
          <div className={s.stockModal} onClick={e => e.stopPropagation()}>
            <div className={s.stockModalHeader}>
              <ion-icon name="pencil-outline" />
              <span>Editar cantidad de unidades</span>
              <button className={s.stockModalClose} onClick={() => { setEditandoStock(null); setStockEditorProd(null) }}>
                <ion-icon name="close-outline" />
              </button>
            </div>
            <p className={s.stockModalProd}>{stockEditorProd.nombre}</p>
            <div className={s.stockModalBody}>
              <input
                autoFocus
                type="number"
                min="0"
                className={s.stockInput}
                value={nuevoStock}
                onChange={e => setNuevoStock(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleGuardarStock(stockEditorProd.id)
                  if (e.key === "Escape") { setEditandoStock(null); setStockEditorProd(null) }
                }}
                placeholder="0"
              />
              <button className={s.stockSave} onClick={() => handleGuardarStock(stockEditorProd.id)} disabled={guardandoStock}>
                {guardandoStock ? <span className={s.spinnerSm} /> : <ion-icon name="checkmark-outline" />}
              </button>
              <button className={s.stockCancel} onClick={() => { setEditandoStock(null); setStockEditorProd(null) }}>
                <ion-icon name="close-outline" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modalClienteRapido && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && (setModalClienteRapido(false), setNuevoNombre(""))}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => { setModalClienteRapido(false); setNuevoNombre("") }}>
              <ion-icon name="close-outline" />
            </button>
            <h2 className={s.modalTitle}>Cliente Rápido</h2>
            <p className={s.clienteRapidoMsg}>Crea un cliente con solo el nombre. Podrás completar sus datos más tarde.</p>
            <label className={s.clienteRapidoLabel}>Nombre del cliente *</label>
            <input
              autoFocus
              className={s.modalSearchInput}
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCrearCliente()}
              placeholder="Ej: Juan Pérez"
            />
            <div className={s.modalBtns}>
              <button className={s.btnCancelar} onClick={() => { setModalClienteRapido(false); setNuevoNombre("") }}>
                Cancelar
              </button>
              <button className={s.btnConfirmar} onClick={handleCrearCliente} disabled={creandoCliente || !nuevoNombre.trim()}>
                {creandoCliente
                  ? <span className={s.spinner} />
                  : <><ion-icon name="person-add-outline" /><span>Crear cliente</span></>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCliente && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalCliente(false)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalCliente(false)}>
              <ion-icon name="close-outline" />
            </button>
            <h2 className={s.modalTitle}>Seleccionar cliente</h2>

            {modoCrear ? (
              <div className={s.crearClienteWrap}>
                <input
                  autoFocus
                  className={s.modalSearchInput}
                  placeholder="Nombre del cliente"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCrearCliente()}
                />
                <div className={s.modalBtns}>
                  <button className={s.btnCancelar} onClick={() => setModoCrear(false)}>Cancelar</button>
                  <button className={s.btnConfirmar} onClick={handleCrearCliente} disabled={creandoCliente || !nuevoNombre.trim()}>
                    {creandoCliente ? <span className={s.spinner} /> : "Crear y seleccionar"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={s.modalSearchRow}>
                  <div className={s.modalSearchBox}>
                    <ion-icon name="search-outline" />
                    <input
                      autoFocus
                      className={s.modalSearchInput}
                      placeholder="Buscar por nombre o cédula..."
                      value={busqCliente}
                      onChange={e => setBusqCliente(e.target.value)}
                    />
                  </div>
                  <button className={s.nuevoClienteBtn} onClick={() => setModoCrear(true)}>
                    <ion-icon name="person-add-outline" />
                    Nuevo
                  </button>
                </div>
                <div className={s.clienteLista}>
                  <button className={s.clienteItem} onClick={() => { quitarCliente(); setModalCliente(false) }}>
                    <div className={s.clienteAvatar} style={{ background: "var(--color-bg-muted)" }}>
                      <ion-icon name="person-outline" />
                    </div>
                    <span className={s.clienteItemNombre}>Consumidor final</span>
                  </button>
                  {clientesFiltrados.map(c => (
                    <button
                      key={c.id}
                      className={`${s.clienteItem} ${clienteId === String(c.id) ? s.clienteItemActivo : ""}`}
                      onClick={() => seleccionarCliente(c)}
                    >
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

    </div>
  )
}