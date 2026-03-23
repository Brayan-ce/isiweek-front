"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Productos.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function getItbisPref() {
  try { return JSON.parse(localStorage.getItem("prod_itbis_pref") ?? "null") } catch { return null }
}
function setItbisPref(v) { localStorage.setItem("prod_itbis_pref", JSON.stringify(v)) }

const FORM_VACIO = {
  nombre: "", descripcion: "", codigo: "", precio: "", precio_costo: "",
  stock: "", itbis_pct: "18", itbis_habilitado: true, categoria_id: "", marca_id: "", activo: true,
}

async function getEmpresa(empresaId) {
  try {
    const res = await apiFetch(`/api/superadmin/empresas/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getProductos(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await apiFetch(`/api/pos/productos/${empresaId}?${params}`)
    if (!res.ok) return { productos: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { productos: [], total: 0, paginas: 1 } }
}

async function getDatosFormulario(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/productos/formulario/${empresaId}`)
    if (!res.ok) return { categorias: [], marcas: [] }
    return await res.json()
  } catch { return { categorias: [], marcas: [] } }
}

async function crearProducto(empresaId, data) {
  try {
    const res = await apiFetch(`/api/pos/productos/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarProducto(id, data) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function generarBarcode(id) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}/barcode`, { method: "POST" })
    return await res.json()
  } catch { return { error: "No se pudo generar el código de barras" } }
}

async function subirImagenProducto(id, formData) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}/imagen`, {
      method: "POST",
      body: formData,
    })
    return await res.json()
  } catch { return { error: "No se pudo subir la imagen" } }
}

async function getSiguienteCodigo(empresaId, nombre = "") {
  try {
    const params = new URLSearchParams({ nombre })
    const res = await apiFetch(`/api/pos/productos/siguiente-codigo/${empresaId}?${params}`)
    if (!res.ok) return { codigo: null }
    return await res.json()
  } catch { return { codigo: null } }
}

async function eliminarProducto(id) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}`, { method: "DELETE" })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function Productos() {
  const router = useRouter()
  const [empresaId, setEmpresaId]       = useState(null)
  const [productos, setProductos]       = useState([])
  const [total, setTotal]               = useState(0)
  const [pagina, setPagina]             = useState(1)
  const [paginas, setPaginas]           = useState(1)
  const [busqueda, setBusqueda]         = useState("")
  const [cargando, setCargando]         = useState(true)
  const [alerta, setAlerta]             = useState(null)
  const [procesando, setProcesando]     = useState(false)
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState(FORM_VACIO)
  const [datosForm, setDatosForm]       = useState(null)
  const [modalElim, setModalElim]       = useState(null)
  const [modalBarcode, setModalBarcode] = useState(null)
  const [generando, setGenerando]       = useState(false)
  const [imgPreview, setImgPreview]     = useState(null)
  const [imgFile, setImgFile]           = useState(null)
  const [subiendoImg, setSubiendoImg]   = useState(false)
  const [codigoEstado, setCodigoEstado] = useState(null)
  const [moneda, setMoneda]             = useState({ simbolo: "RD$", codigo: "DOP" })
  const imgRef           = useRef()
  const codigoManualRef  = useRef(false)
  const codigoTimeoutRef = useRef(null)
  const modalRef         = useRef(null)

  function fmt(n) {
    return `${moneda.simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (q, p) => {
    if (!empresaId) return
    const query   = q !== undefined ? q : ""
    const paginaN = p !== undefined ? p : 1
    setCargando(true)
    const res = await getProductos(empresaId, query, paginaN, 20)
    setProductos(res.productos ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) return
    cargar("", 1)
    getDatosFormulario(empresaId).then(setDatosForm)
    getEmpresa(empresaId).then(e => { if (e?.moneda) setMoneda(e.moneda) })
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) return
    const t = setTimeout(() => { setPagina(1); cargar(busqueda, 1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargar, empresaId])

  useEffect(() => {
    if (!empresaId) return
    if (codigoManualRef.current || !form.nombre.trim()) return
    clearTimeout(codigoTimeoutRef.current)
    setCodigoEstado("verificando")
    codigoTimeoutRef.current = setTimeout(async () => {
      const res = await getSiguienteCodigo(empresaId, form.nombre)
      if (!res.codigo) { setCodigoEstado(null); return }
      setF("codigo", res.codigo)
      setCodigoEstado("ok")
    }, 600)
    return () => clearTimeout(codigoTimeoutRef.current)
  }, [form.nombre, empresaId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function abrirCrear() {
    const pref = getItbisPref()
    setForm({ ...FORM_VACIO, itbis_pct: pref?.itbis_pct ?? "18", itbis_habilitado: pref?.itbis_habilitado ?? true })
    codigoManualRef.current = false
    setCodigoEstado(null)
    modalRef.current = "crear"
    setImgPreview(null)
    setImgFile(null)
    setModal("crear")
  }

  function abrirEditar(p) {
    setForm({
      nombre:           p.nombre ?? "",
      descripcion:      p.descripcion ?? "",
      codigo:           p.codigo ?? "",
      precio:           String(p.precio ?? ""),
      precio_costo:     String(p.precio_costo ?? ""),
      stock:            String(p.stock ?? ""),
      itbis_pct:        String(p.itbis_pct ?? "18"),
      itbis_habilitado: p.itbis_habilitado ?? true,
      categoria_id:     String(p.categoria_id ?? ""),
      marca_id:         String(p.marca_id ?? ""),
      activo:           p.activo ?? true,
    })
    codigoManualRef.current = !!p.codigo
    setCodigoEstado(p.codigo ? "ok" : null)
    modalRef.current = { tipo: "editar", id: p.id }
    setImgPreview(p.imagen ? `${API}${p.imagen}` : null)
    setImgFile(null)
    setModal({ tipo: "editar", id: p.id })
  }

  async function abrirBarcode(p) {
    setModalBarcode({ ...p, cargando: !p.barcode })
    if (!p.barcode) {
      setGenerando(true)
      const res = await generarBarcode(p.id)
      setGenerando(false)
      if (res.error) { mostrarAlerta("error", res.error); setModalBarcode(null); return }
      const actualizado = { ...p, codigo: res.codigo, barcode: res.barcode, cargando: false }
      setModalBarcode(actualizado)
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, codigo: res.codigo, barcode: res.barcode } : x))
    }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function guardarPreferenciaItbis() {
    setItbisPref({ itbis_pct: form.itbis_pct, itbis_habilitado: form.itbis_habilitado })
    mostrarAlerta("ok", "Preferencia de ITBIS guardada")
  }

  function onPickImg(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (!form.precio)        return mostrarAlerta("error", "El precio es obligatorio")
    setProcesando(true)

    const payload = {
      nombre:           form.nombre.trim(),
      descripcion:      form.descripcion.trim() || null,
      codigo:           form.codigo.trim() || null,
      precio:           Number(form.precio),
      precio_costo:     Number(form.precio_costo) || 0,
      stock:            Number(form.stock) || 0,
      itbis_pct:        Number(form.itbis_pct) || 18,
      itbis_habilitado: form.itbis_habilitado,
      categoria_id:     form.categoria_id ? Number(form.categoria_id) : null,
      marca_id:         form.marca_id     ? Number(form.marca_id)     : null,
      activo:           form.activo,
    }

    const res = modal === "crear"
      ? await crearProducto(empresaId, payload)
      : await editarProducto(modal.id, payload)

    if (res.error) { setProcesando(false); return mostrarAlerta("error", res.error) }

    if (imgFile) {
      setSubiendoImg(true)
      const fd = new FormData()
      fd.append("file", imgFile)
      await subirImagenProducto(res.id, fd)
      setSubiendoImg(false)
    }

    setProcesando(false)
    mostrarAlerta("ok", modal === "crear" ? "Producto creado" : "Producto actualizado")
    setModal(null)
    cargar(busqueda, pagina)
  }

  async function handleEliminar() {
    if (!modalElim) return
    setProcesando(true)
    const res = await eliminarProducto(modalElim.id)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Producto eliminado")
    setModalElim(null)
    cargar(busqueda, pagina)
  }

  function irPagina(p) { setPagina(p); cargar(busqueda, p) }

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
        <div className={s.topBarLeft}>
          <div className={s.titleWrap}>
            <div>
              <div className={s.subtitulo}>{total} producto{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>
        <div className={s.topBarRight}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              className={s.searchInput}
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onClick={() => setBusqueda("")}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>
          <button className={s.btnNuevo} onClick={abrirCrear}>
            <ion-icon name="add-outline" /> Nuevo producto
          </button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span>Producto</span>
          <span>Código</span>
          <span>Categoría</span>
          <span>Precio</span>
          <span>Costo</span>
          <span>Stock</span>
          <span>ITBIS</span>
          <span>Estado</span>
          <span></span>
        </div>

        {productos.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="cube-outline" />
            <p>Sin productos registrados</p>
          </div>
        ) : (
          productos.map(p => (
            <div key={p.id} className={s.tableRow}>
              <div className={s.prodCell}>
                <div className={s.prodImg}>
                  {p.imagen
                    ? <img src={`${API}${p.imagen}`} alt={p.nombre} />
                    : <ion-icon name="cube-outline" />
                  }
                </div>
                <div>
                  <div className={s.prodNombre}>{p.nombre}</div>
                  {p.marca && <div className={s.prodMarca}>{p.marca.nombre}</div>}
                </div>
              </div>
              <div className={s.codigoCell}>
                <button className={s.barcodeBtn} onClick={() => abrirBarcode(p)} title="Ver código de barras">
                  <ion-icon name="barcode-outline" />
                  <span>{p.codigo ?? "Generar"}</span>
                </button>
              </div>
              <span className={s.cellGris}>{p.categoria?.nombre ?? "—"}</span>
              <span className={s.cellPrecio}>{fmt(p.precio)}</span>
              <span className={s.cellGris}>{fmt(p.precio_costo)}</span>
              <span className={`${s.cellStock} ${p.stock === 0 ? s.stockCero : p.stock <= 5 ? s.stockBajo : ""}`}>
                {p.stock}
              </span>
              <span className={s.cellGris}>{p.itbis_habilitado ? `${p.itbis_pct}%` : "Exento"}</span>
              <span className={`${s.badge} ${p.activo ? s.badgeActivo : s.badgeInactivo}`}>
                {p.activo ? "Activo" : "Inactivo"}
              </span>
              <div className={s.acciones}>
                <button className={s.btnEdit} onClick={() => abrirEditar(p)}>
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={s.btnDel} onClick={() => setModalElim(p)}>
                  <ion-icon name="trash-outline" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => irPagina(pagina - 1)}>
            <ion-icon name="chevron-back-outline" />
          </button>
          <span>{pagina} / {paginas}</span>
          <button disabled={pagina === paginas} onClick={() => irPagina(pagina + 1)}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModal(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="cube-outline" />
              {modal === "crear" ? "Nuevo producto" : "Editar producto"}
            </div>

            <div className={s.imgUploadWrap}>
              <div className={s.imgPreview} onClick={() => imgRef.current?.click()}>
                {imgPreview
                  ? <img src={imgPreview} alt="preview" />
                  : <><ion-icon name="camera-outline" /><span>Subir imagen</span></>
                }
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickImg} />
              {imgPreview && (
                <button className={s.imgQuitarBtn} onClick={() => { setImgPreview(null); setImgFile(null) }}>
                  <ion-icon name="close-outline" /> Quitar imagen
                </button>
              )}
            </div>

            <div className={s.modalGrid}>
              <div className={`${s.modalField} ${s.spanFull}`}>
                <label>Nombre *</label>
                <input className={s.modalInput} placeholder="Nombre del producto" value={form.nombre} onChange={e => setF("nombre", e.target.value)} autoFocus />
              </div>
              <div className={`${s.modalField} ${s.spanFull}`}>
                <label>Descripción</label>
                <input className={s.modalInput} placeholder="Descripción opcional" value={form.descripcion} onChange={e => setF("descripcion", e.target.value)} />
              </div>
              <div className={`${s.modalField} ${s.spanFull}`}>
                <label>Código / Referencia</label>
                <div className={s.codigoInputWrap}>
                  <input
                    className={`${s.modalInput} ${codigoEstado === "ok" ? s.inputOk : ""}`}
                    placeholder="Código de barras, SKU, referencia..."
                    value={form.codigo}
                    onChange={e => {
                      codigoManualRef.current = true
                      setCodigoEstado(null)
                      setF("codigo", e.target.value)
                    }}
                  />
                  {codigoEstado === "verificando" && <span className={s.codigoBadge}><span className={s.spinnerDark} /></span>}
                  {codigoEstado === "ok" && <span className={`${s.codigoBadge} ${s.codigoBadgeOk}`}><ion-icon name="checkmark-outline" /></span>}
                </div>
                {!codigoManualRef.current && form.nombre.trim() && (
                  <span className={s.codigoHint}>Generando desde el nombre automáticamente</span>
                )}
              </div>
              <div className={s.modalField}>
                <label>Precio de venta *</label>
                <input className={s.modalInput} type="number" min="0" placeholder="0.00" value={form.precio} onChange={e => setF("precio", e.target.value)} />
              </div>
              <div className={s.modalField}>
                <label>Precio de costo</label>
                <input className={s.modalInput} type="number" min="0" placeholder="0.00" value={form.precio_costo} onChange={e => setF("precio_costo", e.target.value)} />
              </div>
              <div className={s.modalField}>
                <label>Stock</label>
                <input className={s.modalInput} type="number" min="0" placeholder="0" value={form.stock} onChange={e => setF("stock", e.target.value)} />
              </div>
              <div className={s.modalField}>
                <label>Categoría</label>
                <select className={s.modalInput} value={form.categoria_id} onChange={e => setF("categoria_id", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {datosForm?.categorias?.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={s.modalField}>
                <label>Marca</label>
                <select className={s.modalInput} value={form.marca_id} onChange={e => setF("marca_id", e.target.value)}>
                  <option value="">Sin marca</option>
                  {datosForm?.marcas?.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={`${s.modalField} ${s.spanFull}`}>
                <div className={s.itbisHeader}>
                  <label>ITBIS</label>
                  <div className={s.itbisActions}>
                    <button
                      type="button"
                      className={`${s.itbisToggle} ${form.itbis_habilitado ? s.itbisOn : s.itbisOff}`}
                      onClick={() => setF("itbis_habilitado", !form.itbis_habilitado)}
                    >
                      <ion-icon name={form.itbis_habilitado ? "checkmark-circle-outline" : "close-circle-outline"} />
                      {form.itbis_habilitado ? "Habilitado" : "Exento"}
                    </button>
                    <button type="button" className={s.itbisGuardar} onClick={guardarPreferenciaItbis}>
                      <ion-icon name="bookmark-outline" /> Guardar elección
                    </button>
                  </div>
                </div>
                {form.itbis_habilitado && (
                  <div className={s.itbisInputRow}>
                    <input
                      className={s.modalInput}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="18"
                      value={form.itbis_pct}
                      onChange={e => setF("itbis_pct", e.target.value)}
                    />
                    <span className={s.itbisPct}>%</span>
                    <div className={s.itbisPresets}>
                      {["0", "16", "18"].map(v => (
                        <button
                          key={v}
                          type="button"
                          className={`${s.presetBtn} ${form.itbis_pct === v ? s.presetActivo : ""}`}
                          onClick={() => setF("itbis_pct", v)}
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${s.modalField} ${s.spanFull}`}>
                <label>Estado</label>
                <div className={s.toggleRow}>
                  <button type="button" className={`${s.toggleBtn} ${form.activo ? s.toggleActivo : ""}`} onClick={() => setF("activo", true)}>Activo</button>
                  <button type="button" className={`${s.toggleBtn} ${!form.activo ? s.toggleInactivo : ""}`} onClick={() => setF("activo", false)}>Inactivo</button>
                </div>
              </div>
            </div>

            <div className={s.modalAcciones}>
              <button className={s.btnSecundario} onClick={() => setModal(null)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleGuardar} disabled={procesando || subiendoImg}>
                {procesando || subiendoImg
                  ? <span className={s.spinner} />
                  : modal === "crear" ? "Crear producto" : "Guardar cambios"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {modalElim && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalElim(null)}>
          <div className={s.modalElim}>
            <div className={s.elimIcono}><ion-icon name="warning-outline" /></div>
            <div className={s.elimTitulo}>Eliminar producto</div>
            <div className={s.elimSub}>
              Seguro que deseas eliminar <strong>{modalElim.nombre}</strong>? Esta accion no se puede deshacer.
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnSecundario} onClick={() => setModalElim(null)}>Cancelar</button>
              <button className={s.btnEliminar} onClick={handleEliminar} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalBarcode && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalBarcode(null)}>
          <div className={s.modalBarcode}>
            <button className={s.modalClose} onClick={() => setModalBarcode(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="barcode-outline" /> Código de barras
            </div>
            <div className={s.barcodeProdNombre}>{modalBarcode.nombre}</div>
            {generando ? (
              <div className={s.barcodeGenerando}>
                <span className={s.spinnerDark} />
                <span>Generando código...</span>
              </div>
            ) : (
              <>
                <div className={s.barcodeWrap}>
                  <img
                    src={`${API}${modalBarcode.barcode}`}
                    alt={modalBarcode.codigo}
                    className={s.barcodeImg}
                  />
                </div>
                <div className={s.barcodeCodigo}>{modalBarcode.codigo}</div>
                <a
                  className={s.barcodeDescargar}
                  href={`${API}${modalBarcode.barcode}`}
                  download={`barcode_${modalBarcode.codigo}.png`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ion-icon name="download-outline" /> Descargar PNG
                </a>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}