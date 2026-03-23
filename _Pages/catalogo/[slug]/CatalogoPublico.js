"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import s from "./CatalogoPublico.module.css"

const POR_PAGINA = 12
const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function img(url) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${API}${url}`
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ModalProducto({ producto, config, onCerrar, onAgregar }) {
  return (
    <div className={s.modalOverlay} onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className={s.modal}>
        <div className={s.modalImgWrap}>
          {producto.imagen
            ? <img src={img(producto.imagen)} alt={producto.nombre} />
            : <div className={s.modalImgVacio}><ion-icon name="cube-outline" /></div>
          }
          <button className={s.modalClose} onClick={onCerrar}>
            <ion-icon name="close-outline" />
          </button>
        </div>
        <div className={s.modalBody}>
          <h2 className={s.modalNombre}>{producto.nombre}</h2>
          {producto.descripcion && <p className={s.modalDesc}>{producto.descripcion}</p>}
          <div className={s.modalFooter}>
            <span className={s.modalPrecio} style={{ color: config.color_primario }}>
              {fmt(producto.precio)}
            </span>
            <button
              className={s.modalBtn}
              style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}
              onClick={() => { onAgregar(producto); onCerrar() }}
            >
              <ion-icon name="bag-add-outline" />
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TarjetaProducto({ producto, config, onAgregar, onVerDetalle }) {
  return (
    <div className={s.tarjeta} onClick={() => onVerDetalle(producto)}>
      <div className={s.tarjetaImgWrap}>
        {producto.imagen
          ? <img src={img(producto.imagen)} alt={producto.nombre} />
          : <div className={s.tarjetaImgVacio}><ion-icon name="cube-outline" /></div>
        }
        {producto.destacado && (
          <span className={s.tarjetaBadge} style={{ background: config.color_primario }}>
            <ion-icon name="star" />Destacado
          </span>
        )}
      </div>
      <div className={s.tarjetaBody}>
        <h3 className={s.tarjetaNombre}>{producto.nombre}</h3>
        <span className={s.tarjetaPrecio} style={{ color: config.color_primario }}>
          {fmt(producto.precio)}
        </span>
        <button
          className={s.tarjetaAgregar}
          style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}
          onClick={e => { e.stopPropagation(); onAgregar(producto) }}
        >
          <ion-icon name="add-outline" />
          Agregar
        </button>
      </div>
    </div>
  )
}

function Paginacion({ pagina, total, porPagina, onCambiar, color }) {
  const totalPags = Math.ceil(total / porPagina)
  if (totalPags <= 1) return null

  const paginas = []
  for (let i = 1; i <= totalPags; i++) {
    if (i === 1 || i === totalPags || (i >= pagina - 1 && i <= pagina + 1)) {
      paginas.push(i)
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...")
    }
  }

  return (
    <div className={s.paginacion}>
      <button className={s.pagBtn} disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
        <ion-icon name="chevron-back-outline" />
      </button>
      {paginas.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className={s.pagEllipsis}>…</span>
        ) : (
          <button
            key={p}
            className={s.pagNum}
            style={p === pagina ? { background: color, color: "white", borderColor: color } : {}}
            onClick={() => onCambiar(p)}
          >
            {p}
          </button>
        )
      )}
      <button className={s.pagBtn} disabled={pagina === Math.ceil(total / porPagina)} onClick={() => onCambiar(pagina + 1)}>
        <ion-icon name="chevron-forward-outline" />
      </button>
    </div>
  )
}

function Footer({ config }) {
  return (
    <footer className={s.footer} style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}>
      <div className={s.footerInner}>
        <p className={s.footerCopy}>© {new Date().getFullYear()} {config.nombre}. Todos los derechos reservados.</p>
        {config.whatsapp && (
          <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className={s.footerWa}>
            <ion-icon name="logo-whatsapp" />{config.whatsapp}
          </a>
        )}
      </div>
    </footer>
  )
}

function CarritoDrawer({ items, onCerrar, onCambiarCant, onEliminar, onPedido, config }) {
  const total = items.reduce((a, i) => a + Number(i.precio) * i.cantidad, 0)
  const [form, setForm]       = useState({ nombre: "", telefono: "", direccion: "", notas: "" })
  const [paso, setPaso]       = useState(1)
  const [enviando, setEnviar] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleEnviar() {
    if (!form.nombre.trim() || !form.telefono.trim()) return
    setEnviar(true)
    await onPedido({ ...form, items, total })
    setEnviar(false)
    setEnviado(true)
  }

  return (
    <div className={s.drawerOverlay} onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className={s.drawer}>
        <div className={s.drawerHeader}>
          <span className={s.drawerTitulo}>
            <ion-icon name="bag-outline" />
            Tu pedido
            {items.length > 0 && <span className={s.drawerCount}>{items.length}</span>}
          </span>
          <button className={s.drawerClose} onClick={onCerrar}>
            <ion-icon name="close-outline" />
          </button>
        </div>

        {enviado ? (
          <div className={s.enviado}>
            <div className={s.enviadoIcon} style={{ color: config.color_primario }}>
              <ion-icon name="checkmark-circle-outline" />
            </div>
            <h3 className={s.enviadoTitulo}>Pedido enviado</h3>
            <p className={s.enviadoDesc}>Nos pondremos en contacto contigo pronto para confirmar tu pedido.</p>
            {config.whatsapp && (
              <a
                href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola, acabo de hacer un pedido en ${config.nombre}`)}`}
                target="_blank" rel="noreferrer"
                className={s.waConfirm}
              >
                <ion-icon name="logo-whatsapp" />
                Confirmar por WhatsApp
              </a>
            )}
            <button className={s.cerrarEnviado} onClick={onCerrar}>Cerrar</button>
          </div>
        ) : items.length === 0 ? (
          <div className={s.carritoVacio}>
            <ion-icon name="bag-outline" />
            <p>Tu carrito esta vacio</p>
          </div>
        ) : paso === 1 ? (
          <>
            <div className={s.drawerItems}>
              {items.map(item => (
                <div key={item.id} className={s.drawerItem}>
                  {item.imagen
                    ? <img src={img(item.imagen)} alt={item.nombre} className={s.drawerItemImg} />
                    : <div className={s.drawerItemImgVacio}><ion-icon name="cube-outline" /></div>
                  }
                  <div className={s.drawerItemInfo}>
                    <span className={s.drawerItemNombre}>{item.nombre}</span>
                    <span className={s.drawerItemPrecio}>{fmt(item.precio)}</span>
                  </div>
                  <div className={s.drawerItemCant}>
                    <button onClick={() => onCambiarCant(item.id, item.cantidad - 1)}>
                      <ion-icon name="remove-outline" />
                    </button>
                    <span>{item.cantidad}</span>
                    <button onClick={() => onCambiarCant(item.id, item.cantidad + 1)}>
                      <ion-icon name="add-outline" />
                    </button>
                  </div>
                  <button className={s.drawerItemDel} onClick={() => onEliminar(item.id)}>
                    <ion-icon name="trash-outline" />
                  </button>
                </div>
              ))}
            </div>
            <div className={s.drawerFooter}>
              <div className={s.drawerTotal}>
                <span>Total</span>
                <span className={s.drawerTotalVal} style={{ color: config.color_primario }}>{fmt(total)}</span>
              </div>
              <button
                className={s.drawerBtn}
                style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}
                onClick={() => setPaso(2)}
              >
                Continuar
                <ion-icon name="arrow-forward-outline" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={s.drawerForm}>
              <div className={s.formGrupo}>
                <label className={s.formLabel}>Nombre *</label>
                <input className={s.formInput} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Tu nombre completo" />
              </div>
              <div className={s.formGrupo}>
                <label className={s.formLabel}>Telefono *</label>
                <input className={s.formInput} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="Tu numero de telefono" />
              </div>
              <div className={s.formGrupo}>
                <label className={s.formLabel}>Direccion de entrega</label>
                <input className={s.formInput} value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Donde te lo enviamos?" />
              </div>
              <div className={s.formGrupo}>
                <label className={s.formLabel}>Notas del pedido</label>
                <textarea className={s.formTextarea} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Instrucciones especiales..." rows={3} />
              </div>
            </div>
            <div className={s.drawerFooter}>
              <button className={s.drawerBtnBack} onClick={() => setPaso(1)}>
                <ion-icon name="arrow-back-outline" />
                Volver
              </button>
              <button
                className={s.drawerBtn}
                style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}
                onClick={handleEnviar}
                disabled={enviando || !form.nombre.trim() || !form.telefono.trim()}
              >
                {enviando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-outline" />Enviar pedido</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SkeletonCatalogo() {
  return (
    <div className={s.root}>
      <div className={s.skeletonHeader} />
      <main className={s.main}>
        <div className={s.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={s.skeletonTarjeta} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default function CatalogoPublico() {
  const { slug } = useParams()

  const [config, setConfig]     = useState(null)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  const [carrito, setCarrito]     = useState([])
  const [drawerOpen, setDrawer]   = useState(false)
  const [busqueda, setBusqueda]   = useState("")
  const [alerta, setAlerta]       = useState(null)
  const [preview, setPreview]     = useState(null)
  const [paginaDest, setPagDest]  = useState(1)
  const [paginaResto, setPagResto] = useState(1)

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [resConfig, resProductos] = await Promise.all([
          fetch(`${API}/api/catalogo/${slug}/config`),
          fetch(`${API}/api/catalogo/${slug}/productos`),
        ])
        if (!resConfig.ok) { setError("Catalogo no encontrado"); return }
        const [dataConfig, dataProductos] = await Promise.all([
          resConfig.json(),
          resProductos.ok ? resProductos.json() : Promise.resolve([]),
        ])
        setConfig(dataConfig)
        setProductos(dataProductos)
      } catch {
        setError("No se pudo cargar el catalogo")
      } finally {
        setCargando(false)
      }
    }
    if (slug) cargarDatos()
  }, [slug])

  const visibles  = useMemo(() => productos.filter(p => p.visible), [productos])
  const filtrados = useMemo(() =>
    busqueda.trim()
      ? visibles.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      : visibles,
  [visibles, busqueda])

  const destacados = useMemo(() => filtrados.filter(p => p.destacado),  [filtrados])
  const resto      = useMemo(() => filtrados.filter(p => !p.destacado), [filtrados])

  const destPag  = useMemo(() => destacados.slice((paginaDest  - 1) * POR_PAGINA, paginaDest  * POR_PAGINA), [destacados, paginaDest])
  const restoPag = useMemo(() => resto.slice(     (paginaResto - 1) * POR_PAGINA, paginaResto * POR_PAGINA), [resto, paginaResto])

  const totalCarrito = carrito.reduce((a, i) => a + i.cantidad, 0)

  function cambiarPagDest(p)  { setPagDest(p);  window.scrollTo({ top: 0, behavior: "smooth" }) }
  function cambiarPagResto(p) { setPagResto(p); window.scrollTo({ top: 0, behavior: "smooth" }) }

  function mostrarAlerta(msg) {
    setAlerta(msg)
    setTimeout(() => setAlerta(null), 2000)
  }

  function agregarAlCarrito(prod) {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === prod.id)
      if (existe) return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { ...prod, cantidad: 1 }]
    })
    mostrarAlerta(`${prod.nombre} agregado`)
  }

  function cambiarCantidad(id, cantidad) {
    if (cantidad <= 0) return eliminarDelCarrito(id)
    setCarrito(prev => prev.map(i => i.id === id ? { ...i, cantidad } : i))
  }

  function eliminarDelCarrito(id) {
    setCarrito(prev => prev.filter(i => i.id !== id))
  }

  async function enviarPedido(datos) {
    try {
      await fetch(`${API}/api/catalogo/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id:     config.empresa_id,
          nombre_cliente: datos.nombre,
          telefono:       datos.telefono,
          direccion:      datos.direccion,
          notas:          datos.notas,
          total:          datos.total,
          items:          datos.items.map(i => ({
            producto_id:     i.id,
            nombre_producto: i.nombre,
            cantidad:        i.cantidad,
            precio:          i.precio,
            subtotal:        Number(i.precio) * i.cantidad,
          })),
        }),
      })
      setCarrito([])
    } catch {}
  }

  if (cargando) return <SkeletonCatalogo />

  if (error) {
    return (
      <div className={s.root}>
        <div className={s.empty}>
          <ion-icon name="alert-circle-outline" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={s.root} suppressHydrationWarning>
      <style>{`
        :root {
          --color-primario: ${config.color_primario};
          --color-secundario: ${config.color_secundario};
        }
      `}</style>

      {alerta && <div className={s.miniToast}>{alerta}</div>}

      <header className={s.header} style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}>
        <div className={s.headerTop}>
          <div className={s.headerLeft}>
            {config.logo
              ? <img src={img(config.logo)} alt={config.nombre} className={s.headerLogo} />
              : <div className={s.headerLogoVacio}><ion-icon name="storefront-outline" /></div>
            }
            <div>
              <h1 className={s.headerNombre}>{config.nombre}</h1>
              {config.descripcion && <p className={s.headerDesc}>{config.descripcion}</p>}
            </div>
          </div>
          <button className={s.carritoBtn} onClick={() => setDrawer(true)}>
            <ion-icon name="bag-outline" />
            {totalCarrito > 0 && <span className={s.carritoBadge}>{totalCarrito}</span>}
          </button>
        </div>

        {(config.horario || config.direccion) && (
          <div className={s.headerMeta}>
            {config.horario   && <span><ion-icon name="time-outline" />{config.horario}</span>}
            {config.direccion && <span><ion-icon name="location-outline" />{config.direccion}</span>}
          </div>
        )}

        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagDest(1); setPagResto(1) }}
          />
          {busqueda && (
            <button className={s.searchClear} onClick={() => { setBusqueda(""); setPagDest(1); setPagResto(1) }}>
              <ion-icon name="close-outline" />
            </button>
          )}
        </div>
      </header>

      <main className={s.main}>
        {filtrados.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="search-outline" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <>
            {destacados.length > 0 && !busqueda && (
              <section className={s.seccion}>
                <h2 className={s.seccionTitulo}>
                  <ion-icon name="star" style={{ color: config.color_primario }} />
                  Destacados
                  <span className={s.seccionCount}>{destacados.length}</span>
                </h2>
                <div className={s.grid}>
                  {destPag.map(p => (
                    <TarjetaProducto key={p.id} producto={p} config={config} onAgregar={agregarAlCarrito} onVerDetalle={setPreview} />
                  ))}
                </div>
                <Paginacion pagina={paginaDest} total={destacados.length} porPagina={POR_PAGINA} onCambiar={cambiarPagDest} color={config.color_primario} />
              </section>
            )}

            {(busqueda ? filtrados : resto).length > 0 && (
              <section className={s.seccion}>
                {destacados.length > 0 && !busqueda && (
                  <h2 className={s.seccionTitulo}>
                    <ion-icon name="grid-outline" style={{ color: config.color_primario }} />
                    Todos los productos
                    <span className={s.seccionCount}>{resto.length}</span>
                  </h2>
                )}
                <div className={s.grid}>
                  {(busqueda ? filtrados : restoPag).map(p => (
                    <TarjetaProducto key={p.id} producto={p} config={config} onAgregar={agregarAlCarrito} onVerDetalle={setPreview} />
                  ))}
                </div>
                {!busqueda && (
                  <Paginacion pagina={paginaResto} total={resto.length} porPagina={POR_PAGINA} onCambiar={cambiarPagResto} color={config.color_primario} />
                )}
              </section>
            )}
          </>
        )}
      </main>

      <Footer config={config} />

      {config.whatsapp && (
        <a
          href={`https://wa.me/${config.whatsapp}`}
          target="_blank" rel="noreferrer"
          className={s.waFloat}
          style={{ background: "#25d366" }}
        >
          <ion-icon name="logo-whatsapp" />
        </a>
      )}

      {totalCarrito > 0 && !drawerOpen && (
        <button
          className={s.carritoFloat}
          style={{ background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }}
          onClick={() => setDrawer(true)}
        >
          <ion-icon name="bag-outline" />
          Ver pedido ({totalCarrito})
        </button>
      )}

      {preview && (
        <ModalProducto
          producto={preview}
          config={config}
          onCerrar={() => setPreview(null)}
          onAgregar={agregarAlCarrito}
        />
      )}

      {drawerOpen && (
        <CarritoDrawer
          items={carrito}
          config={config}
          onCerrar={() => setDrawer(false)}
          onCambiarCant={cambiarCantidad}
          onEliminar={eliminarDelCarrito}
          onPedido={enviarPedido}
        />
      )}
    </div>
  )
}