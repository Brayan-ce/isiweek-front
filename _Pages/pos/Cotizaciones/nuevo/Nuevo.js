"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./Nuevo.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getDatos(empresaId, usuarioId) {
  try {
    const res = await apiFetch(`/api/pos/cotizaciones/datos/${empresaId}/${usuarioId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function crearCotizacion(empresaId, usuarioId, body) {
  try {
    const res = await apiFetch(`/api/pos/cotizaciones/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Nuevo() {
  const router = useRouter()

  const [empresaId,     setEmpresaId]     = useState(null)
  const [usuarioId,     setUsuarioId]     = useState(null)
  const [datos,         setDatos]         = useState(null)
  const [cargando,      setCargando]      = useState(true)
  const [guardando,     setGuardando]     = useState(false)
  const [alerta,        setAlerta]        = useState(null)
  const [clienteId,     setClienteId]     = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [notas,         setNotas]         = useState("")
  const [descuento,     setDescuento]     = useState("")
  const [items,         setItems]         = useState([])
  const [modalCliente,  setModalCliente]  = useState(false)
  const [busqCliente,   setBusqCliente]   = useState("")
  const [modalProd,     setModalProd]     = useState(false)
  const [busqProd,      setBusqProd]      = useState("")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!empresaId || !usuarioId) return
    getDatos(empresaId, usuarioId).then(d => { setDatos(d); setCargando(false) })
  }, [empresaId, usuarioId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function seleccionarCliente(c) {
    setClienteId(String(c.id))
    setClienteNombre(c.nombre)
    setModalCliente(false)
    setBusqCliente("")
  }

  function agregarProducto(prod) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.producto_id === prod.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        return next
      }
      return [...prev, {
        producto_id:     prod.id,
        nombre_producto: prod.nombre,
        cantidad:        1,
        precio_unitario: Number(prod.precio),
        descuento:       0,
      }]
    })
    setModalProd(false)
    setBusqProd("")
  }

  function actualizarItem(idx, campo, val) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, [campo]: campo === "cantidad" ? Math.max(1, Number(val) || 1) : Number(val) || 0 }
    }))
  }

  function quitarItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const simbolo  = datos?.moneda?.simbolo ?? "RD$"
  const subtotal = items.reduce((a, i) => a + i.precio_unitario * i.cantidad, 0)
  const itbis    = items.reduce((a, i) => a + i.precio_unitario * i.cantidad * 0.18, 0)
  const desc     = Number(descuento) || 0
  const total    = subtotal + itbis - desc

  async function handleGuardar() {
    if (!items.length) return mostrarAlerta("error", "Agrega al menos un producto")
    setGuardando(true)
    const res = await crearCotizacion(empresaId, usuarioId, {
      cliente_id:       clienteId ? Number(clienteId) : null,
      notas,
      descuento_global: desc,
      items: items.map(i => ({
        producto_id:     i.producto_id ?? null,
        nombre_producto: i.nombre_producto,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario,
        descuento:       i.descuento,
      })),
    })
    setGuardando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    router.push("/pos/cotizaciones")
  }

  if (!empresaId || cargando) return <div className={s.loading}><span className={s.spinner} /></div>

  const clientesFiltrados = (datos?.clientes ?? []).filter(c =>
    !busqCliente ||
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    (c.cedula_rnc ?? "").includes(busqCliente)
  )

  const productosFiltrados = (datos?.productos ?? []).filter(p =>
    !busqProd ||
    p.nombre.toLowerCase().includes(busqProd.toLowerCase()) ||
    (p.codigo ?? "").toLowerCase().includes(busqProd.toLowerCase())
  )

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.back()}>
          <ion-icon name="arrow-back-outline" /> Volver
        </button>
        <h1 className={s.titulo}>Nueva cotizacion</h1>
      </div>

      <div className={s.layout}>
        <div className={s.izq}>
          <div className={s.card}>
            <div className={s.cardTitulo}>Cliente</div>
            <button className={s.clienteBtn} onClick={() => setModalCliente(true)}>
              <ion-icon name="person-outline" />
              <span className={clienteId ? s.clienteSeleccionado : s.clientePlaceholder}>
                {clienteNombre || "Seleccionar cliente (opcional)"}
              </span>
              {clienteId ? (
                <span onClick={e => { e.stopPropagation(); setClienteId(""); setClienteNombre("") }} className={s.clienteQuitar}>
                  <ion-icon name="close-circle-outline" />
                </span>
              ) : (
                <ion-icon name="chevron-forward-outline" />
              )}
            </button>
          </div>

          <div className={s.card}>
            <div className={s.cardTituloRow}>
              <span className={s.cardTitulo}>Productos</span>
              <button className={s.btnAgregarProd} onClick={() => setModalProd(true)}>
                <ion-icon name="add-outline" /> Agregar
              </button>
            </div>
            {items.length === 0 ? (
              <div className={s.itemsVacio}>
                <ion-icon name="cube-outline" />
                <p>Sin productos</p>
              </div>
            ) : (
              <div className={s.itemsWrap}>
                <div className={s.itemsHead}>
                  <span>Producto</span>
                  <span>Cant</span>
                  <span>Precio</span>
                  <span>Total</span>
                  <span></span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className={s.itemRow}>
                    <span className={s.itemNombre}>{item.nombre_producto}</span>
                    <div className={s.itemCtrls}>
                      <input type="number" min="1" className={s.itemInput} value={item.cantidad}
                        onChange={e => actualizarItem(idx, "cantidad", e.target.value)} />
                      <input type="number" min="0" className={s.itemInput} value={item.precio_unitario}
                        onChange={e => actualizarItem(idx, "precio_unitario", e.target.value)} />
                      <span className={s.itemTotal}>{fmt(item.precio_unitario * item.cantidad, simbolo)}</span>
                      <button className={s.itemQuitarBtn} onClick={() => quitarItem(idx)}>
                        <ion-icon name="trash-outline" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}>Notas</div>
            <textarea className={s.textarea} placeholder="Observaciones, condiciones, validez..." value={notas}
              onChange={e => setNotas(e.target.value)} rows={3} />
          </div>
        </div>

        <div className={s.der}>
          <div className={s.card}>
            <div className={s.cardTitulo}>Resumen</div>
            <div className={s.totalRow}><span>Subtotal</span><span>{fmt(subtotal, simbolo)}</span></div>
            <div className={s.totalRow}><span>ITBIS (18%)</span><span>{fmt(itbis, simbolo)}</span></div>
            <div className={s.totalRow}>
              <span>Descuento</span>
              <input type="number" min="0" className={s.descInput} placeholder="0.00"
                value={descuento} onChange={e => setDescuento(e.target.value)} />
            </div>
            <div className={`${s.totalRow} ${s.totalFinal}`}>
              <span>Total</span><span>{fmt(total, simbolo)}</span>
            </div>
            <button className={s.btnGuardar} onClick={handleGuardar} disabled={guardando || !items.length}>
              {guardando
                ? <span className={s.spinner} />
                : <><ion-icon name="checkmark-circle-outline" /> Crear cotizacion</>}
            </button>
          </div>
        </div>
      </div>

      {modalCliente && (
        <div className={s.overlay} onClick={() => setModalCliente(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <button className={s.modalClose} onClick={() => setModalCliente(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitulo}>Seleccionar cliente</div>
            <div className={s.modalSearch}>
              <ion-icon name="search-outline" />
              <input autoFocus className={s.modalSearchInput} placeholder="Buscar por nombre o cedula..."
                value={busqCliente} onChange={e => setBusqCliente(e.target.value)} />
            </div>
            <div className={s.lista}>
              {clientesFiltrados.map(c => (
                <button key={c.id} className={`${s.listaItem} ${clienteId === String(c.id) ? s.listaItemActivo : ""}`}
                  onClick={() => seleccionarCliente(c)}>
                  <div className={s.avatar}>{c.nombre.charAt(0).toUpperCase()}</div>
                  <div className={s.listaItemInfo}>
                    <span className={s.listaItemNombre}>{c.nombre}</span>
                    {c.cedula_rnc && <span className={s.listaItemSub}>{c.cedula_rnc}</span>}
                  </div>
                  {clienteId === String(c.id) && <ion-icon name="checkmark-circle" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalProd && (
        <div className={s.overlay} onClick={() => setModalProd(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <button className={s.modalClose} onClick={() => setModalProd(false)}><ion-icon name="close-outline" /></button>
            <div className={s.modalTitulo}>Agregar producto</div>
            <div className={s.modalSearch}>
              <ion-icon name="search-outline" />
              <input autoFocus className={s.modalSearchInput} placeholder="Buscar producto..."
                value={busqProd} onChange={e => setBusqProd(e.target.value)} />
            </div>
            <div className={s.lista}>
              {productosFiltrados.length === 0 ? (
                <div className={s.listaVacia}><ion-icon name="cube-outline" /><p>Sin resultados</p></div>
              ) : productosFiltrados.map(p => (
                <button key={p.id} className={s.listaItem} onClick={() => agregarProducto(p)}>
                  <div className={s.listaItemInfo}>
                    <span className={s.listaItemNombre}>{p.nombre}</span>
                    {p.categoria && <span className={s.listaItemSub}>{p.categoria.nombre}</span>}
                  </div>
                  <span className={s.listaItemPrecio}>{fmt(p.precio, simbolo)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}