"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./CatalogoOnline.module.css"

const API          = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const BASE_URL_CAT = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/catalogo/`

const CONFIG_VACIA = {
  nombre: "", descripcion: "", url_slug: "", whatsapp: "",
  horario: "", direccion: "", color_primario: "#1d6fce",
  color_secundario: "#0ea5e9", activo: true, logo: null,
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n, simbolo = "RD$") {
  const simboloSeguro = (simbolo && String(simbolo).trim()) || "RD$"
  return `${simboloSeguro} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function getConfigCatalogo(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/config/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function guardarConfigCatalogo(empresaId, body) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/config/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function getProductosCatalogo(empresaId) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/productos/${empresaId}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function toggleProductoCatalogo(empresaId, productoId, campo, valor) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/productos/${empresaId}/${productoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function subirLogoCatalogo(empresaId, formData) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/logo/${empresaId}`, {
      method: "POST",
      body: formData,
    })
    return await res.json()
  } catch { return { error: "No se pudo subir el logo" } }
}

async function generarQR(url) {
  try {
    const res = await apiFetch(`/api/pos/ventas-online/catalogo/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    return await res.json()
  } catch { return { error: "No se pudo generar el QR" } }
}

function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export default function CatalogoOnline() {
  const router                        = useRouter()
  const [empresaId, setEmpresaId]     = useState(null)
  const [usuarioId, setUsuarioId]     = useState(null)
  const [tab, setTab]                 = useState("config")
  const [config, setConfig]           = useState(CONFIG_VACIA)
  const [productos, setProductos]     = useState([])
  const [simbolo, setSimbolo]         = useState("RD$")
  const [cargando, setCargando]       = useState(true)
  const [guardando, setGuardando]     = useState(false)
  const [alerta, setAlerta]           = useState(null)
  const [qrData, setQrData]           = useState(null)
  const [generandoQR, setGenerandoQR] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile]       = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const fileRef                       = useRef(null)

  const urlCompleta = `${BASE_URL_CAT}${config.url_slug}`
  const simboloMoneda = (simbolo && String(simbolo).trim()) || "RD$"

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    apiFetch(`/api/pos/header/${usuarioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSimbolo(d?.empresa?.moneda?.simbolo || "RD$"))
      .catch(() => {})
  }, [usuarioId])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    const [cfg, prods] = await Promise.all([
      getConfigCatalogo(empresaId),
      getProductosCatalogo(empresaId),
    ])
    if (cfg) {
      setConfig(cfg)
      if (cfg.logo) setLogoPreview(`${API}${cfg.logo}`)
    }
    setProductos(prods)
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function set(campo, val) { setConfig(p => ({ ...p, [campo]: val })) }

  function handleGenerarSlug() {
    if (!config.nombre.trim()) return mostrarAlerta("error", "Escribe el nombre primero")
    set("url_slug", generarSlug(config.nombre))
  }

  async function handleGuardar() {
    if (!config.nombre.trim())   return mostrarAlerta("error", "El nombre es obligatorio")
    if (!config.url_slug.trim()) return mostrarAlerta("error", "La URL del catalogo es obligatoria")
    setGuardando(true)

    let logoUrl = config.logo
    if (logoFile) {
      const fd = new FormData()
      fd.append("logo", logoFile)
      const r = await subirLogoCatalogo(empresaId, fd)
      if (r?.url) logoUrl = r.url
    }

    const res = await guardarConfigCatalogo(empresaId, { ...config, logo: logoUrl })
    setGuardando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Cambios guardados correctamente")
    cargar()
  }

  async function handleToggleProducto(productoId, campo, valorActual) {
    const nuevoValor = !valorActual
    setProductos(p => p.map(pr => pr.id === productoId ? { ...pr, [campo]: nuevoValor } : pr))
    const res = await toggleProductoCatalogo(empresaId, productoId, campo, nuevoValor)
    if (res?.error) {
      mostrarAlerta("error", res.error)
      setProductos(p => p.map(pr => pr.id === productoId ? { ...pr, [campo]: valorActual } : pr))
    }
  }

  async function handleGenerarQR() {
    setGenerandoQR(true)
    const res = await generarQR(urlCompleta)
    setGenerandoQR(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    setQrData(res.qr)
  }

  function handleLogoChange(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return mostrarAlerta("error", "El logo no puede superar 2MB")
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = e => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const visibles   = productos.filter(p => p.visible).length
  const destacados = productos.filter(p => p.destacado).length

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHeader} />
      <div className={s.skeletonBody} />
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
        <div className={s.topRight}>
          {config.url_slug && (
            <a href={urlCompleta} target="_blank" rel="noreferrer" className={s.vistaBtn}>
              <ion-icon name="eye-outline" />
              Vista Previa
            </a>
          )}
          <button className={s.guardarBtn} onClick={handleGuardar} disabled={guardando}>
            {guardando
              ? <span className={s.spinner} />
              : <><ion-icon name="save-outline" />Guardar Cambios</>
            }
          </button>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={`${s.statCard} ${config.activo ? s.statActivo : s.statInactivo}`}>
          <ion-icon name={config.activo ? "radio-button-on-outline" : "radio-button-off-outline"} />
          <div>
            <span className={s.statLabel}>Estado</span>
            <span className={s.statVal}>{config.activo ? "Catalogo publicado" : "Catalogo oculto"}</span>
          </div>
        </div>
        <div className={s.statCard}>
          <ion-icon name="cube-outline" />
          <div>
            <span className={s.statLabel}>Productos</span>
            <span className={s.statVal}>{visibles} visibles</span>
          </div>
        </div>
        <div className={s.statCard}>
          <ion-icon name="star-outline" />
          <div>
            <span className={s.statLabel}>Destacados</span>
            <span className={s.statVal}>{destacados} productos</span>
          </div>
        </div>
        <div className={s.statCard}>
          <ion-icon name="analytics-outline" />
          <div>
            <span className={s.statLabel}>Visitas</span>
            <span className={s.statVal}>— ultimos 7 dias</span>
          </div>
        </div>
      </div>

      <div className={s.tabs}>
        <button className={`${s.tab} ${tab === "config" ? s.tabActivo : ""}`} onClick={() => setTab("config")}>
          <ion-icon name="settings-outline" />
          Configuracion
        </button>
        <button className={`${s.tab} ${tab === "productos" ? s.tabActivo : ""}`} onClick={() => setTab("productos")}>
          <ion-icon name="cube-outline" />
          Productos ({visibles} visibles)
        </button>
      </div>

      {tab === "config" && (
        <div className={s.configGrid}>
          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="information-circle-outline" />Informacion Basica</div>
            <div className={s.formGrupo}>
              <label className={s.label}>Nombre del Catalogo *</label>
              <input className={s.input} value={config.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Mi Tienda" />
            </div>
            <div className={s.formGrupo}>
              <label className={s.label}>Descripcion Corta</label>
              <textarea className={s.textarea} value={config.descripcion ?? ""} onChange={e => set("descripcion", e.target.value)} placeholder="Descripcion corta del catalogo" rows={2} />
            </div>
            <div className={s.formGrupo}>
              <label className={s.label}>URL del Catalogo</label>
              <div className={s.slugRow}>
                <span className={s.slugBase}>{BASE_URL_CAT}</span>
                <input
                  className={s.slugInput}
                  value={config.url_slug ?? ""}
                  onChange={e => set("url_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="mi-tienda"
                />
                <button className={s.slugGenBtn} onClick={handleGenerarSlug} title="Generar desde nombre">
                  <ion-icon name="refresh-outline" />
                  Generar
                </button>
              </div>
              <span className={s.slugHint}>Solo letras minusculas, numeros y guiones</span>
            </div>
            <div className={s.formGrupo}>
              <label className={s.label}>WhatsApp</label>
              <input className={s.input} value={config.whatsapp ?? ""} onChange={e => set("whatsapp", e.target.value)} placeholder="Ej: 18091234567" />
            </div>
            <div className={s.formGrupo}>
              <label className={s.label}>Horario</label>
              <input className={s.input} value={config.horario ?? ""} onChange={e => set("horario", e.target.value)} placeholder="Lun-Vie: 9AM-6PM" />
            </div>
            <div className={s.formGrupo}>
              <label className={s.label}>Direccion</label>
              <input className={s.input} value={config.direccion ?? ""} onChange={e => set("direccion", e.target.value)} placeholder="Calle Principal" />
            </div>
          </div>

          <div className={s.colDerecha}>
            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="color-palette-outline" />Apariencia</div>
              <div className={s.formGrupo}>
                <label className={s.label}>Logo del Negocio</label>
                <div
                  className={`${s.dropZone} ${dragOver ? s.dropZoneOver : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleLogoChange(e.dataTransfer.files[0]) }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="logo" className={s.logoPreview} />
                  ) : (
                    <>
                      <ion-icon name="image-outline" />
                      <span>Arrastra tu logo aqui o haz clic para subir</span>
                      <span className={s.dropHint}>PNG, JPG hasta 2MB</span>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoChange(e.target.files[0])} />
                </div>
              </div>
              <div className={s.coloresRow}>
                <div className={s.formGrupo}>
                  <label className={s.label}>Color Primario</label>
                  <div className={s.colorRow}>
                    <input type="color" className={s.colorPicker} value={config.color_primario} onChange={e => set("color_primario", e.target.value)} />
                    <input className={s.colorInput} value={config.color_primario} onChange={e => set("color_primario", e.target.value)} maxLength={7} />
                  </div>
                </div>
                <div className={s.formGrupo}>
                  <label className={s.label}>Color Secundario</label>
                  <div className={s.colorRow}>
                    <input type="color" className={s.colorPicker} value={config.color_secundario} onChange={e => set("color_secundario", e.target.value)} />
                    <input className={s.colorInput} value={config.color_secundario} onChange={e => set("color_secundario", e.target.value)} maxLength={7} />
                  </div>
                </div>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="megaphone-outline" />Publicacion</div>
              <div className={s.toggleRow}>
                <div>
                  <span className={s.toggleLabel}>Estado del Catalogo</span>
                  <span className={s.toggleSub}>{config.activo ? "Tu catalogo esta visible publicamente" : "Tu catalogo esta oculto"}</span>
                </div>
                <button className={`${s.toggle} ${config.activo ? s.toggleOn : ""}`} onClick={() => set("activo", !config.activo)}>
                  <span className={s.toggleThumb} />
                </button>
              </div>
              {config.url_slug && (
                <>
                  <div className={s.formGrupo} style={{ marginTop: "14px" }}>
                    <label className={s.label}>Compartir Catalogo</label>
                    <div className={s.shareRow}>
                      <span className={s.shareUrl}>{urlCompleta}</span>
                      <button className={s.copyBtn} onClick={() => { navigator.clipboard.writeText(urlCompleta); mostrarAlerta("ok", "URL copiada") }}>
                        <ion-icon name="copy-outline" />
                      </button>
                    </div>
                  </div>
                  <div className={s.shareAcciones}>
                    <button className={s.qrBtn} onClick={handleGenerarQR} disabled={generandoQR}>
                      {generandoQR ? <span className={s.spinner} /> : <><ion-icon name="qr-code-outline" />Generar Codigo QR</>}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(urlCompleta)}`}
                      target="_blank" rel="noreferrer"
                      className={s.waBtn}
                    >
                      <ion-icon name="logo-whatsapp" />
                      Compartir por WhatsApp
                    </a>
                  </div>
                  {qrData && (
                    <div className={s.qrWrap}>
                      <img src={qrData} alt="QR" className={s.qrImg} />
                      <a href={qrData} download="qr-catalogo.png" className={s.qrDescargar}>
                        <ion-icon name="download-outline" />
                        Descargar QR
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="bulb-outline" />Consejo</div>
              <p className={s.consejoText}>
                Activa productos destacados para mostrarlos en la portada. Los productos con ofertas atraen mas atencion de los clientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "productos" && (
        <div className={s.productosWrap}>
          <div className={s.tabla}>
            <div className={s.tablaScroll}>
            <div className={s.tablaHeader}>
              <div className={s.colImagen} />
              <div className={s.colNombre}>Producto</div>
              <div className={s.colPrecio}>Precio</div>
              <div className={s.colStock}>Stock</div>
              <div className={s.colVisible}>Visible</div>
              <div className={s.colDestacado}>Destacado</div>
            </div>
            <div className={s.tablaBody}>
              {productos.length === 0 ? (
                <div className={s.empty}>
                  <ion-icon name="cube-outline" />
                  <p>No hay productos disponibles</p>
                </div>
              ) : productos.map((p, i) => (
                <div key={p.id} className={`${s.fila} ${i % 2 === 1 ? s.filaAlterna : ""}`}>
                  <div className={s.colImagen}>
                    {p.imagen
                      ? <img src={`${API}${p.imagen}`} alt={p.nombre} className={s.prodImg} />
                      : <div className={s.prodImgVacio}><ion-icon name="image-outline" /></div>
                    }
                  </div>
                  <div className={s.colNombre}>
                    <span className={s.prodNombre}>{p.nombre}</span>
                    {p.codigo && <span className={s.prodCodigo}>{p.codigo}</span>}
                  </div>
                  <div className={s.colPrecio}><span className={s.prodPrecio}>{fmt(p.precio, simboloMoneda)}</span></div>
                  <div className={s.colStock}><span className={s.prodStock}>{p.stock}</span></div>
                  <div className={s.colVisible}>
                    <button
                      className={`${s.toggleSmall} ${p.visible ? s.toggleSmallOn : ""}`}
                      onClick={() => handleToggleProducto(p.id, "visible", p.visible)}
                    >
                      <span className={s.toggleSmallThumb} />
                    </button>
                  </div>
                  <div className={s.colDestacado}>
                    <button
                      className={`${s.starBtn} ${p.destacado ? s.starBtnOn : ""}`}
                      onClick={() => handleToggleProducto(p.id, "destacado", p.destacado)}
                      title={p.destacado ? "Quitar destacado" : "Marcar como destacado"}
                    >
                      <ion-icon name={p.destacado ? "star" : "star-outline"} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}