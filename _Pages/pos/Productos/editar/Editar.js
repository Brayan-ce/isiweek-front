"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./Editar.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}
function getItbisPref() {
  try { return JSON.parse(localStorage.getItem("prod_itbis_pref") ?? "null") } catch { return null }
}
function setItbisPref(v) { localStorage.setItem("prod_itbis_pref", JSON.stringify(v)) }

export default function Editar({ productoId }) {
  const router = useRouter()

  const [empresaId,    setEmpresaId]    = useState(null)
  const [usuarioId,    setUsuarioId]    = useState(null)
  const [moneda,       setMoneda]       = useState({ simbolo: "RD$", codigo: "DOP" })
  const [datosForm,    setDatosForm]    = useState({ categorias: [], marcas: [] })
  const [form,         setForm]         = useState(null)
  const [imgPreview,   setImgPreview]   = useState(null)
  const [imgFile,      setImgFile]      = useState(null)
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [subiendoImg,  setSubiendoImg]  = useState(false)
  const [codigoEstado, setCodigoEstado] = useState(null)
  const [alerta,       setAlerta]       = useState(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  const imgRef           = useRef()
  const codigoManualRef  = useRef(false)

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!empresaId || !usuarioId || !productoId) return
    inicializar()
  }, [empresaId, usuarioId, productoId])

  async function inicializar() {
    setCargando(true)
    const [datos, header, producto] = await Promise.all([
      apiFetch(`/api/pos/productos/formulario/${empresaId}`)
        .then(r => r.ok ? r.json() : { categorias: [], marcas: [] })
        .catch(() => ({ categorias: [], marcas: [] })),
      apiFetch(`/api/pos/header/${usuarioId}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
      apiFetch(`/api/pos/productos/detalle/${productoId}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])

    setDatosForm(datos ?? { categorias: [], marcas: [] })
    if (header?.empresa?.moneda) setMoneda(header.empresa.moneda)

    if (!producto) { setNoEncontrado(true); setCargando(false); return }

    codigoManualRef.current = !!producto.codigo
    setCodigoEstado(producto.codigo ? "ok" : null)
    if (producto.imagen) setImgPreview(`${API}${producto.imagen}`)

    setForm({
      nombre:           producto.nombre ?? "",
      descripcion:      producto.descripcion ?? "",
      codigo:           producto.codigo ?? "",
      precio:           String(producto.precio ?? ""),
      precio_costo:     String(producto.precio_costo ?? ""),
      stock:            String(producto.stock ?? "0"),
      itbis_pct:        String(producto.itbis_pct ?? "18"),
      itbis_habilitado: producto.itbis_habilitado ?? true,
      categoria_id:     String(producto.categoria_id ?? ""),
      marca_id:         String(producto.marca_id ?? ""),
      activo:           producto.activo ?? true,
    })
    setCargando(false)
  }

  function onPickImg(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 3 * 1024 * 1024) { mostrarAlerta("error", "La imagen no puede superar 3 MB"); return }
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  function guardarPreferenciaItbis() {
    setItbisPref({ itbis_pct: form.itbis_pct, itbis_habilitado: form.itbis_habilitado })
    mostrarAlerta("ok", "Preferencia de ITBIS guardada")
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (!form.precio)        return mostrarAlerta("error", "El precio de venta es obligatorio")
    setGuardando(true)

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

    const r = await apiFetch(`/api/pos/productos/${productoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const res = await r.json()

    if (res.error) { setGuardando(false); return mostrarAlerta("error", res.error) }

    if (imgFile) {
      setSubiendoImg(true)
      const fd = new FormData()
      fd.append("file", imgFile)
      await apiFetch(`/api/pos/productos/${productoId}/imagen`, { method: "POST", body: fd }).catch(() => {})
      setSubiendoImg(false)
    }

    setGuardando(false)
    router.push(`/pos/productos/${productoId}/ver`)
  }

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        {[...Array(5)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  if (noEncontrado || !form) return (
    <div className={s.page}>
      <div className={s.noEncontrado}>
        <ion-icon name="alert-circle-outline" />
        <p>Producto no encontrado</p>
        <button className={s.btnVolver} onClick={() => router.push("/pos/productos")}>
          Volver a productos
        </button>
      </div>
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

      <div className={s.topBar}>
        <button className={s.backBtn} onClick={() => router.push(`/pos/productos/${productoId}/ver`)}>
          <ion-icon name="arrow-back-outline" /><span>Volver</span>
        </button>
        <div className={s.topBarTitle}>
          <div className={s.titleIcon}><ion-icon name="pencil-outline" /></div>
          <div>
            <div className={s.titulo}>Editar producto</div>
            <div className={s.subtitulo}>Actualiza la información del producto</div>
          </div>
        </div>
      </div>

      {/* grid: formulario izquierda | imagen derecha */}
      <div className={s.contenido}>

        {/* ── columna formulario ─────────────────────── */}
        <div className={s.formWrap}>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="cube-outline" />Información básica</div>
            <div className={s.formGrid}>
              <div className={`${s.field} ${s.spanFull}`}>
                <label>Nombre <span className={s.req}>*</span></label>
                <input
                  className={s.input}
                  placeholder="Nombre del producto"
                  value={form.nombre}
                  onChange={e => setF("nombre", e.target.value)}
                  autoFocus
                />
              </div>
              <div className={`${s.field} ${s.spanFull}`}>
                <label>Descripción</label>
                <textarea
                  className={`${s.input} ${s.textarea}`}
                  placeholder="Descripción opcional..."
                  value={form.descripcion}
                  onChange={e => setF("descripcion", e.target.value)}
                  rows={3}
                />
              </div>
              <div className={`${s.field} ${s.spanFull}`}>
                <label>Código / Referencia</label>
                <div className={s.codigoWrap}>
                  <input
                    className={`${s.input} ${codigoEstado === "ok" ? s.inputOk : ""}`}
                    placeholder="SKU, código de barras, referencia..."
                    value={form.codigo}
                    onChange={e => { codigoManualRef.current = true; setCodigoEstado(null); setF("codigo", e.target.value) }}
                  />
                  {codigoEstado === "ok" && (
                    <span className={`${s.codigoBadge} ${s.codigoBadgeOk}`}>
                      <ion-icon name="checkmark-circle-outline" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="cash-outline" />Precios y Stock</div>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label>Precio de venta <span className={s.req}>*</span></label>
                <div className={s.prefixInput}>
                  <span className={s.prefix}>{moneda.simbolo}</span>
                  <input className={s.inputPrefix} type="number" min="0" step="0.01" placeholder="0.00" value={form.precio} onChange={e => setF("precio", e.target.value)} />
                </div>
              </div>
              <div className={s.field}>
                <label>Precio de costo</label>
                <div className={s.prefixInput}>
                  <span className={s.prefix}>{moneda.simbolo}</span>
                  <input className={s.inputPrefix} type="number" min="0" step="0.01" placeholder="0.00" value={form.precio_costo} onChange={e => setF("precio_costo", e.target.value)} />
                </div>
              </div>
              <div className={s.field}>
                <label>Stock</label>
                <input className={s.input} type="number" min="0" placeholder="0" value={form.stock} onChange={e => setF("stock", e.target.value)} />
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="pricetag-outline" />Clasificación
              <span className={s.opcionalBadge}>Opcional</span>
            </div>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label>Categoría</label>
                <select className={s.input} value={form.categoria_id} onChange={e => setF("categoria_id", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {datosForm?.categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label>Marca</label>
                <select className={s.input} value={form.marca_id} onChange={e => setF("marca_id", e.target.value)}>
                  <option value="">Sin marca</option>
                  {datosForm?.marcas?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="receipt-outline" />ITBIS</div>
            <div className={s.itbisRow}>
              <button
                type="button"
                className={`${s.itbisToggle} ${form.itbis_habilitado ? s.itbisOn : s.itbisOff}`}
                onClick={() => setF("itbis_habilitado", !form.itbis_habilitado)}
              >
                <ion-icon name={form.itbis_habilitado ? "checkmark-circle-outline" : "close-circle-outline"} />
                {form.itbis_habilitado ? "Habilitado" : "Exento de ITBIS"}
              </button>
              <button type="button" className={s.itbisPrefBtn} onClick={guardarPreferenciaItbis}>
                <ion-icon name="bookmark-outline" />Guardar preferencia
              </button>
            </div>
            {form.itbis_habilitado && (
              <div className={s.itbisInputRow}>
                <input
                  className={s.input}
                  type="number" min="0" max="100" step="0.5" placeholder="18"
                  value={form.itbis_pct}
                  onChange={e => setF("itbis_pct", e.target.value)}
                  style={{ width: 80 }}
                />
                <span className={s.pctLabel}>%</span>
                <div className={s.presets}>
                  {["0", "16", "18"].map(v => (
                    <button key={v} type="button"
                      className={`${s.presetBtn} ${form.itbis_pct === v ? s.presetActivo : ""}`}
                      onClick={() => setF("itbis_pct", v)}
                    >{v}%</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Estado — fix: color correcto en activo/inactivo */}
          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="pulse-outline" />Estado</div>
            <div className={s.toggleRow}>
              <button
                type="button"
                className={`${s.toggleBtn} ${form.activo === true ? s.toggleActivo : ""}`}
                onClick={() => setF("activo", true)}
              >
                <ion-icon name="checkmark-circle-outline" />Activo
              </button>
              <button
                type="button"
                className={`${s.toggleBtn} ${form.activo === false ? s.toggleInactivo : ""}`}
                onClick={() => setF("activo", false)}
              >
                <ion-icon name="pause-circle-outline" />Inactivo
              </button>
            </div>
          </div>

          <div className={s.acciones}>
            <button className={s.btnCancelar} onClick={() => router.push(`/pos/productos/${productoId}/ver`)}>Cancelar</button>
            <button className={s.btnGuardar} onClick={handleGuardar} disabled={guardando || subiendoImg}>
              {guardando || subiendoImg
                ? <><span className={s.spinnerBtn} />{subiendoImg ? "Subiendo imagen..." : "Guardando..."}</>
                : <><ion-icon name="save-outline" />Guardar cambios</>
              }
            </button>
          </div>

        </div>

        {/* ── columna imagen (DERECHA) ──────────────── */}
        <div className={s.imagenCard}>
          <div className={s.cardTitulo}><ion-icon name="image-outline" />Imagen del producto</div>
          <div className={s.imgArea} onClick={() => imgRef.current?.click()}>
            {imgPreview
              ? <img src={imgPreview} alt="preview" className={s.imgPreviewImg} />
              : <div className={s.imgPlaceholder}>
                  <ion-icon name="camera-outline" />
                  <span>Haz clic para subir</span>
                  <span className={s.imgHint}>PNG, JPG, WEBP — máx 3 MB</span>
                </div>
            }
          </div>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickImg} />
          {imgPreview && (
            <button className={s.quitarImgBtn} onClick={() => { setImgPreview(null); setImgFile(null) }}>
              <ion-icon name="trash-outline" />Quitar imagen
            </button>
          )}
          <div className={s.imgInfo}>
            <ion-icon name="information-circle-outline" />
            <span>La imagen será visible en tu catálogo y punto de venta</span>
          </div>
        </div>

      </div>
    </div>
  )
}
