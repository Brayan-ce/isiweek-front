"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { getDatosCuota, getProductos, getProductoPorCodigo, crearVentaCuotas, crearClienteRapido } from "./servidor"
import s from "./NuevaCuota.module.css"

const EMPRESA_ID = 1
const USUARIO_ID = 2
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmt(n) {
  return Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function NuevaCuota() {
  const router = useRouter()
  const [datos, setDatos] = useState(null)
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)
  const [totalPags, setTotalPags] = useState(1)
  const [loadingProds, setLoadingProds] = useState(false)
  const [carrito, setCarrito] = useState([])
  const [clienteId, setClienteId] = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [busqCliente, setBusqCliente] = useState("")
  const [modalCliente, setModalCliente] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [concepto, setConcepto] = useState("")
  const [cantCuotas, setCantCuotas] = useState(2)
  const [cuotas, setCuotas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [alerta, setAlerta] = useState(null)

  const scanBuffer = useRef("")
  const scanTimer = useRef(null)

  const simbolo = datos?.moneda?.simbolo ?? "RD$"

  const montoTotal = carrito.reduce((a, i) => a + Number(i.precio) * i.cantidad, 0)

  useEffect(() => {
    getDatosCuota(EMPRESA_ID).then(d => { if (d) setDatos(d) })
  }, [])

  const cargarProductos = useCallback(async (q = "", p = 1) => {
    setLoadingProds(true)
    const data = await getProductos(EMPRESA_ID, q, p, 20)
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
      if (modalCliente) return
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
  }, [modalCliente])

  useEffect(() => {
    if (!montoTotal || !cantCuotas) { setCuotas([]); return }
    const base = Math.floor((montoTotal / cantCuotas) * 100) / 100
    const resto = Number((montoTotal - base * cantCuotas).toFixed(2))
    setCuotas(Array.from({ length: cantCuotas }, (_, i) => ({
      numero: i + 1,
      monto: i === cantCuotas - 1 ? String((base + resto).toFixed(2)) : String(base.toFixed(2)),
    })))
  }, [montoTotal, cantCuotas])

  async function agregarPorCodigo(codigo) {
    const prod = await getProductoPorCodigo(EMPRESA_ID, codigo)
    if (!prod || prod.error) return mostrarAlerta("error", prod?.error ?? "Producto no encontrado")
    if (prod.stock === 0) return mostrarAlerta("warn", `"${prod.nombre}" sin stock`)
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
    setCarrito(prev => prev.map(i => i.id !== id ? i : { ...i, cantidad: Math.max(1, Math.min(Number(val) || 1, i.stock)) }))
  }

  function quitarItem(id) { setCarrito(prev => prev.filter(i => i.id !== id)) }

  function actualizarCuota(idx, val) {
    setCuotas(prev => prev.map((c, i) => i === idx ? { ...c, monto: val } : c))
  }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function seleccionarCliente(c) {
    setClienteId(String(c.id))
    setClienteNombre(c.nombre)
    setModalCliente(false)
    setBusqCliente("")
    setModoCrear(false)
    setNuevoNombre("")
  }

  async function handleCrearCliente() {
    if (!nuevoNombre.trim()) return
    setCreandoCliente(true)
    const res = await crearClienteRapido(EMPRESA_ID, nuevoNombre.trim())
    setCreandoCliente(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    datos.clientes.unshift(res)
    seleccionarCliente(res)
    mostrarAlerta("ok", `Cliente "${res.nombre}" creado`)
  }

  const sumaCuotas = cuotas.reduce((a, c) => a + (Number(c.monto) || 0), 0)
  const diferencia = montoTotal - sumaCuotas

  async function handleCrear() {
    if (!clienteId) return mostrarAlerta("error", "Selecciona un cliente")
    if (!concepto.trim()) return mostrarAlerta("error", "Escribe un concepto")
    if (!carrito.length) return mostrarAlerta("error", "Agrega al menos un producto")
    if (!cuotas.length) return mostrarAlerta("error", "Define las cuotas")
    if (Math.abs(diferencia) > 0.01) return mostrarAlerta("error", `La suma de cuotas no coincide con el total`)
    setCargando(true)
    const res = await crearVentaCuotas(EMPRESA_ID, USUARIO_ID, {
      cliente_id: Number(clienteId),
      concepto: concepto.trim(),
      monto_total: montoTotal,
      items: carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad, precio_unitario: Number(i.precio) })),
      cuotas: cuotas.map(c => ({ monto: Number(c.monto) })),
    })
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Venta a crédito creada")
    setTimeout(() => router.push("/pos/cuotas"), 1000)
  }

  if (!datos) return <div className={s.loading}><span className={s.spinnerDark} /></div>

  const clientesFiltrados = datos.clientes.filter(c =>
    !busqCliente ||
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    (c.cedula_rnc ?? "").includes(busqCliente)
  )

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.header}>
        <button className={s.backBtn} onClick={() => router.push("/pos/cuotas")}>
          <ion-icon name="arrow-back-outline" />
        </button>
      </div>

      <div className={s.layout}>
        <div className={s.leftCol}>
          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="search-outline" />Productos</div>
            <div className={s.searchWrap}>
              <ion-icon name="search-outline" />
              <input
                className={s.searchInput}
                placeholder="Buscar por nombre, código..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && <button className={s.clearBtn} onClick={() => setBusqueda("")}><ion-icon name="close-outline" /></button>}
            </div>
            <div className={s.prodList}>
              {loadingProds ? (
                [...Array(5)].map((_, i) => <div key={i} className={s.skeletonRow} />)
              ) : productos.length === 0 ? (
                <div className={s.empty}><ion-icon name="cube-outline" /><span>Sin productos</span></div>
              ) : productos.map(p => {
                const sinStock = p.stock === 0
                return (
                  <div
                    key={p.id}
                    className={`${s.prodRow} ${sinStock ? s.prodRowSinStock : ""}`}
                    onClick={() => !sinStock && agregarAlCarrito(p)}
                  >
                    <div className={s.prodThumb}>
                      {p.imagen ? <img src={`${BACKEND}${p.imagen}`} alt={p.nombre} /> : <ion-icon name="cube-outline" />}
                    </div>
                    <div className={s.prodTexts}>
                      <span className={s.prodNombre}>{p.nombre}</span>
                      {p.codigo && <span className={s.prodCodigo}>{p.codigo}</span>}
                    </div>
                    <span className={s.prodPrecio}>{simbolo} {fmt(p.precio)}</span>
                    <span className={`${s.stockBadge} ${sinStock ? s.stockCero : p.stock <= 5 ? s.stockBajo : s.stockOk}`}>
                      {sinStock ? "Sin stock" : p.stock}
                    </span>
                    <button className={s.addBtn} disabled={sinStock} onClick={e => { e.stopPropagation(); agregarAlCarrito(p) }}>
                      <ion-icon name="add-outline" />
                    </button>
                  </div>
                )
              })}
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
        </div>

        <div className={s.rightCol}>
          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="person-outline" />Cliente</div>
            <button className={s.clienteBtn} onClick={() => setModalCliente(true)}>
              {clienteId ? (
                <>
                  <div className={s.clienteAvatar}>{clienteNombre.charAt(0).toUpperCase()}</div>
                  <span className={s.clienteNombreSeleccionado}>{clienteNombre}</span>
                </>
              ) : (
                <><ion-icon name="person-add-outline" /><span className={s.clientePlaceholder}>Seleccionar cliente</span></>
              )}
              <ion-icon name="chevron-forward-outline" />
            </button>
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="document-text-outline" />Concepto</div>
            <input
              className={s.input}
              placeholder="Ej: Televisor Samsung 55 pulgadas"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
            />
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="cart-outline" />Carrito</div>
            {carrito.length === 0 ? (
              <div className={s.carritoVacio}><ion-icon name="cart-outline" /><span>Agrega productos</span></div>
            ) : (
              <>
                {carrito.map(item => (
                  <div key={item.id} className={s.carritoItem}>
                    <div className={s.carritoTexts}>
                      <span className={s.carritoNombre}>{item.nombre}</span>
                      <span className={s.carritoPrecio}>{simbolo} {fmt(item.precio)}</span>
                    </div>
                    <div className={s.carritoControls}>
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}><ion-icon name="remove-outline" /></button>
                      <input type="number" min="1" max={item.stock} value={item.cantidad} onChange={e => cambiarCantidad(item.id, e.target.value)} className={s.cantInput} />
                      <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}><ion-icon name="add-outline" /></button>
                      <button className={s.deleteBtn} onClick={() => quitarItem(item.id)}><ion-icon name="trash-outline" /></button>
                    </div>
                    <span className={s.carritoSub}>{simbolo} {fmt(Number(item.precio) * item.cantidad)}</span>
                  </div>
                ))}
                <div className={s.totalRow}>
                  <span>Total</span>
                  <span className={s.totalMonto}>{simbolo} {fmt(montoTotal)}</span>
                </div>
              </>
            )}
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="albums-outline" />Cuotas</div>
            <div className={s.cantCuotasRow}>
              <span className={s.label}>Cantidad de cuotas</span>
              <div className={s.cantControles}>
                <button className={s.cantBtn} onClick={() => setCantCuotas(p => Math.max(1, p - 1))}><ion-icon name="remove-outline" /></button>
                <span className={s.cantNum}>{cantCuotas}</span>
                <button className={s.cantBtn} onClick={() => setCantCuotas(p => Math.min(24, p + 1))}><ion-icon name="add-outline" /></button>
              </div>
            </div>
            {cuotas.length > 0 && (
              <div className={s.cuotasWrap}>
                <div className={s.cuotasHead}><span>Cuota</span><span>Monto</span></div>
                {cuotas.map((c, i) => (
                  <div key={i} className={s.cuotaRow}>
                    <div className={s.cuotaNumero}>
                      <span className={s.cuotaBadge}>{c.numero}</span>
                      <span className={s.cuotaLabel}>Cuota {c.numero}</span>
                    </div>
                    <input
                      className={s.cuotaInput}
                      type="number"
                      min="0"
                      value={c.monto}
                      onChange={e => actualizarCuota(i, e.target.value)}
                    />
                  </div>
                ))}
                <div className={`${s.sumaRow} ${Math.abs(diferencia) > 0.01 ? s.sumaError : s.sumaOk}`}>
                  <span>Total cuotas</span>
                  <span>{simbolo} {fmt(sumaCuotas)}</span>
                </div>
                {Math.abs(diferencia) > 0.01 && (
                  <div className={s.diferenciaAlert}>
                    <ion-icon name="warning-outline" />
                    {diferencia > 0 ? `Faltan ${simbolo} ${fmt(diferencia)}` : `Sobran ${simbolo} ${fmt(Math.abs(diferencia))}`}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={s.acciones}>
            <button className={s.cancelarBtn} onClick={() => router.push("/pos/cuotas")}>Cancelar</button>
            <button className={s.crearBtn} onClick={handleCrear} disabled={cargando}>
              {cargando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" />Crear venta a crédito</>}
            </button>
          </div>
        </div>
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
                  <button className={s.cancelarBtn} onClick={() => setModoCrear(false)}>Cancelar</button>
                  <button className={s.crearBtn} onClick={handleCrearCliente} disabled={creandoCliente || !nuevoNombre.trim()}>
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
                  {clientesFiltrados.length === 0 ? (
                    <div className={s.sinResultados}>Sin resultados</div>
                  ) : clientesFiltrados.map(c => (
                    <button key={c.id} className={`${s.clienteItem} ${clienteId === String(c.id) ? s.clienteItemActivo : ""}`} onClick={() => seleccionarCliente(c)}>
                      <div className={s.clienteAvatarSm}>{c.nombre.charAt(0).toUpperCase()}</div>
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