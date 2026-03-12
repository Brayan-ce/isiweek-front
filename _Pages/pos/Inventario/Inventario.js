"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./Inventario.module.css"

const LIMITE = 20
const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function imgSrc(imagen) {
  if (!imagen) return null
  if (imagen.startsWith("http://") || imagen.startsWith("https://")) return imagen
  return `${API}${imagen.startsWith("/") ? "" : "/"}${imagen}`
}

async function getInventario(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(`${API}/api/pos/inventario/lista/${empresaId}?${params}`)
    if (!res.ok) return { productos: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch {
    return { productos: [], total: 0, paginas: 1, pagina: 1 }
  }
}

async function getCategoriasMarcas(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/inventario/filtros/${empresaId}`)
    if (!res.ok) return { categorias: [], marcas: [] }
    return await res.json()
  } catch {
    return { categorias: [], marcas: [] }
  }
}

async function ajustarStock(empresaId, productoId, body) {
  try {
    const res = await fetch(`${API}/api/pos/inventario/ajustar/${empresaId}/${productoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: body.cantidad }),
    })
    return await res.json()
  } catch {
    return { error: "No se pudo conectar con el servidor" }
  }
}

function ModalAjuste({ producto, onClose, onGuardado, mostrarAlerta, empresaId }) {
  const [nuevoStock, setNuevoStock] = useState(String(producto.stock))
  const [cargando, setCargando]     = useState(false)

  async function handleGuardar() {
    const val = Number(nuevoStock)
    if (nuevoStock === "" || isNaN(val) || val < 0)
      return mostrarAlerta("error", "Ingresa un número válido mayor o igual a 0")
    setCargando(true)
    const res = await ajustarStock(empresaId, producto.id, { tipo: "ajuste", cantidad: val })
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Stock actualizado correctamente")
    onGuardado()
  }

  const val      = Number(nuevoStock)
  const colorNum = isNaN(val) ? "" : val <= 0 ? s.resultadoZero : val <= 5 ? s.resultadoBajo : s.resultadoOk

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.modalTitle}>Ajustar stock</div>
        <div className={s.modalBody}>
          <div className={s.productoInfo}>
            <div className={s.productoNombre}>{producto.nombre}</div>
            {producto.codigo && <div className={s.productoCodigo}>Código: {producto.codigo}</div>}
            <div className={s.stockActual}>Stock actual: <strong>{producto.stock}</strong> unidades</div>
          </div>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Nuevo stock</label>
            <input
              className={`${s.formInput} ${s.formInputGrande}`}
              type="number" min="0" placeholder="0"
              value={nuevoStock}
              onChange={e => setNuevoStock(e.target.value)}
              onFocus={e => e.target.select()}
              autoFocus
            />
          </div>
          {nuevoStock !== "" && !isNaN(val) && val !== producto.stock && (
            <div className={s.resultadoWrap}>
              <span className={s.resultadoLabel}>{val > producto.stock ? "+" : ""}{val - producto.stock} unidades</span>
              <span className={s.resultadoSep}>→</span>
              <span className={`${s.resultadoNum} ${colorNum}`}>{val}</span>
              <span className={s.resultadoLabel}>en total</span>
            </div>
          )}
        </div>
        <div className={s.modalAcciones}>
          <button className={s.cancelarBtn} onClick={onClose}>Cancelar</button>
          <button className={s.confirmarBtn} onClick={handleGuardar} disabled={cargando}>
            {cargando ? <span className={s.spinner} /> : <><ion-icon name="checkmark-circle-outline" />Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Inventario() {
  const router = useRouter()
  const [empresaId, setEmpresaId]     = useState(null)
  const [productos, setProductos]     = useState([])
  const [total, setTotal]             = useState(0)
  const [paginas, setPaginas]         = useState(1)
  const [pagina, setPagina]           = useState(1)
  const [busqueda, setBusqueda]       = useState("")
  const [inputVal, setInputVal]       = useState("")
  const [categorias, setCategorias]   = useState([])
  const [marcas, setMarcas]           = useState([])
  const [categoriaId, setCategoriaId] = useState("")
  const [marcaId, setMarcaId]         = useState("")
  const [stockFiltro, setStockFiltro] = useState("")
  const [cargando, setCargando]       = useState(true)
  const [alerta, setAlerta]           = useState(null)
  const [modalAjuste, setModalAjuste] = useState(null)
  const debounceRef                   = useRef(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (opts = {}) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getInventario(empresaId, {
      busqueda:     opts.busqueda     ?? busqueda,
      categoria_id: opts.categoria_id ?? categoriaId,
      marca_id:     opts.marca_id     ?? marcaId,
      stock_filtro: opts.stock_filtro ?? stockFiltro,
      pagina:       opts.pagina       ?? pagina,
      limite:       LIMITE,
    })
    setProductos(res.productos ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId, busqueda, categoriaId, marcaId, stockFiltro, pagina])

  useEffect(() => {
    if (!empresaId) return
    cargar()
    getCategoriasMarcas(empresaId).then(r => {
      setCategorias(r.categorias ?? [])
      setMarcas(r.marcas ?? [])
    })
  }, [empresaId])

  function handleBusqueda(val) {
    setInputVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBusqueda(val); setPagina(1); cargar({ busqueda: val, pagina: 1 })
    }, 400)
  }

  function handleFiltro(campo, val) {
    setPagina(1)
    if (campo === "categoria_id") { setCategoriaId(val); cargar({ categoria_id: val, pagina: 1 }) }
    if (campo === "marca_id")     { setMarcaId(val);     cargar({ marca_id: val,     pagina: 1 }) }
    if (campo === "stock_filtro") { setStockFiltro(val); cargar({ stock_filtro: val, pagina: 1 }) }
  }

  function limpiarFiltros() {
    setInputVal(""); setBusqueda("")
    setCategoriaId(""); setMarcaId(""); setStockFiltro("")
    setPagina(1)
    cargar({ busqueda: "", categoria_id: "", marca_id: "", stock_filtro: "", pagina: 1 })
  }

  const hayFiltros = inputVal || categoriaId || marcaId || stockFiltro

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function irPagina(p) { setPagina(p); cargar({ pagina: p }) }

  const paginasArr = () => {
    if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1)
    const arr = []
    if (pagina <= 4)                arr.push(1, 2, 3, 4, 5, "...", paginas)
    else if (pagina >= paginas - 3) arr.push(1, "...", paginas - 4, paginas - 3, paginas - 2, paginas - 1, paginas)
    else                            arr.push(1, "...", pagina - 1, pagina, pagina + 1, "...", paginas)
    return arr
  }

  function stockTag(stock) {
    if (stock <= 0) return <span className={`${s.stockTag} ${s.stockTagCero}`}>Sin stock</span>
    if (stock <= 5) return <span className={`${s.stockTag} ${s.stockTagBajo}`}>Bajo</span>
    return <span className={`${s.stockTag} ${s.stockTagOk}`}>OK</span>
  }

  if (!empresaId || cargando) return <div className={s.page}><div className={s.skeletonRow} /></div>

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar por nombre, código, barcode..."
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
          <span className={s.conteo}>{total} producto{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className={s.filtrosBar}>
        <select className={s.select} value={categoriaId} onChange={e => handleFiltro("categoria_id", e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className={s.select} value={marcaId} onChange={e => handleFiltro("marca_id", e.target.value)}>
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select className={s.select} value={stockFiltro} onChange={e => handleFiltro("stock_filtro", e.target.value)}>
          <option value="">Todo el stock</option>
          <option value="sin_stock">Sin stock</option>
          <option value="bajo_stock">Stock bajo (1-5)</option>
          <option value="con_stock">Con stock (+5)</option>
        </select>
        {hayFiltros && (
          <button className={s.limpiarBtn} onClick={limpiarFiltros}>
            <ion-icon name="close-circle-outline" /> Limpiar
          </button>
        )}
      </div>

      <div className={s.tabla}>
        <div className={s.tablaHeader}>
          <div className={s.colProducto}>Producto</div>
          <div className={s.colCategoria}>Categoría</div>
          <div className={s.colMarca}>Marca</div>
          <div className={s.colCodigo}>Código</div>
          <div className={s.colPrecio}>Precio venta</div>
          <div className={s.colCosto}>Costo</div>
          <div className={s.colStock}>Stock</div>
          <div className={s.colEstado}>Estado</div>
          <div className={s.colAcciones}></div>
        </div>

        <div className={s.tablaBody}>
          {productos.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="cube-outline" />
              <p>{hayFiltros ? "Sin resultados con los filtros aplicados" : "No hay productos en inventario"}</p>
              {hayFiltros && <button className={s.limpiarFiltroEmpty} onClick={limpiarFiltros}>Limpiar filtros</button>}
            </div>
          ) : productos.map((p, idx) => (
            <div key={p.id} className={`${s.fila} ${idx % 2 === 1 ? s.filaAlterna : ""} ${p.stock <= 0 ? s.filaSinStock : ""}`}>
              <div className={s.colProducto}>
                <div className={s.productoWrap}>
                  {imgSrc(p.imagen)
                    ? <img src={imgSrc(p.imagen)} className={s.productoImg} alt={p.nombre} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex" }} />
                    : null
                  }
                  <div className={s.productoImgPlaceholder} style={{ display: imgSrc(p.imagen) ? "none" : "flex" }}>
                    <ion-icon name="cube-outline" />
                  </div>
                  <span className={s.productoNombre}>{p.nombre}</span>
                </div>
              </div>
              <div className={s.colCategoria}>
                <span className={p.categoria ? s.tagNeutro : s.sinDato}>{p.categoria?.nombre || "—"}</span>
              </div>
              <div className={s.colMarca}>
                <span className={p.marca ? s.tagNeutro : s.sinDato}>{p.marca?.nombre || "—"}</span>
              </div>
              <div className={s.colCodigo}>
                <span className={p.codigo ? s.codigoText : s.sinDato}>{p.codigo || "—"}</span>
              </div>
              <div className={s.colPrecio}>
                <span className={s.precioText}>{Number(p.precio).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={s.colCosto}>
                <span className={s.costoText}>{Number(p.precio_costo).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={s.colStock}>
                <span className={`${s.stockNum} ${p.stock <= 0 ? s.stockNumCero : p.stock <= 5 ? s.stockNumBajo : ""}`}>{p.stock}</span>
              </div>
              <div className={s.colEstado}>{stockTag(p.stock)}</div>
              <div className={s.colAcciones}>
                <button className={s.ajustarBtn} title="Ajustar stock" onClick={() => setModalAjuste(p)}>
                  <ion-icon name="swap-vertical-outline" /> Ajustar
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
              <span key={`dots-${i}`} className={s.paginaDots}>…</span>
            ) : (
              <button key={item} className={item === pagina ? s.paginaActiva : s.paginaBtn}
                onClick={() => item !== pagina && irPagina(item)}>
                {item}
              </button>
            )
          )}
          <button disabled={pagina === paginas} onClick={() => irPagina(pagina + 1)}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modalAjuste && (
        <ModalAjuste
          producto={modalAjuste}
          empresaId={empresaId}
          onClose={() => setModalAjuste(null)}
          onGuardado={() => { setModalAjuste(null); cargar() }}
          mostrarAlerta={mostrarAlerta}
        />
      )}
    </div>
  )
}