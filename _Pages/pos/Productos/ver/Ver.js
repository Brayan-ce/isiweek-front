"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./Ver.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function descargarBlob(url, nombre) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = nombre
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {}
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

export default function Ver({ productoId }) {
  const router = useRouter()
  const [producto,       setProducto]       = useState(null)
  const [moneda,         setMoneda]         = useState({ simbolo: "RD$", codigo: "DOP" })
  const [cargando,       setCargando]       = useState(true)
  const [generando,      setGenerando]      = useState(false)
  const [eliminando,     setEliminando]     = useState(false)
  const [confirmarElim,  setConfirmarElim]  = useState(false)
  const [alerta,         setAlerta]         = useState(null)

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function fmt(n) {
    return `${moneda.simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    Promise.all([
      apiFetch(`/api/pos/productos/detalle/${productoId}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch(`/api/pos/header/${payload.id}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(async ([prod, header]) => {
      if (header?.empresa?.moneda) setMoneda(header.empresa.moneda)
      setProducto(prod)
      setCargando(false)
      // auto-generar barcode si no existe
      if (prod && !prod.barcode) {
        setGenerando(true)
        try {
          const res = await apiFetch(`/api/pos/productos/${productoId}/barcode`, { method: "POST" })
          const data = await res.json()
          if (!data.error) {
            setProducto(p => ({ ...p, barcode: data.barcode, codigo: data.codigo ?? p.codigo }))
          }
        } catch {}
        setGenerando(false)
      }
    })
  }, [productoId])

  async function handleGenerarBarcode() {
    setGenerando(true)
    try {
      const res = await apiFetch(`/api/pos/productos/${productoId}/barcode`, { method: "POST" })
      const data = await res.json()
      if (data.error) { mostrarAlerta("error", data.error); return }
      setProducto(p => ({ ...p, barcode: data.barcode, codigo: data.codigo ?? p.codigo }))
      mostrarAlerta("ok", "Código de barras generado")
    } catch { mostrarAlerta("error", "No se pudo generar el código de barras") }
    finally { setGenerando(false) }
  }

  async function handleEliminar() {
    setEliminando(true)
    try {
      const res = await apiFetch(`/api/pos/productos/${productoId}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) { mostrarAlerta("error", data.error); return }
      router.push("/pos/productos")
    } catch { mostrarAlerta("error", "No se pudo eliminar el producto") }
    finally { setEliminando(false) }
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        {[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  if (!producto) return (
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
        <button className={s.backBtn} onClick={() => router.push("/pos/productos")}>
          <ion-icon name="arrow-back-outline" /><span>Volver</span>
        </button>
        <div className={s.topAcciones}>
          <button className={s.btnEditar} onClick={() => router.push(`/pos/productos/${productoId}/editar`)}>
            <ion-icon name="pencil-outline" />Editar
          </button>
          <button className={s.btnEliminar} onClick={() => setConfirmarElim(true)} title="Eliminar producto">
            <ion-icon name="trash-outline" />
          </button>
        </div>
      </div>

      <div className={s.contenido}>

        <div className={s.izquierda}>
          <div className={s.imagenCard}>
            {producto.imagen
              ? <img src={`${API}${producto.imagen}`} alt={producto.nombre} className={s.imagenProd} />
              : <div className={s.imagenPlaceholder}><ion-icon name="cube-outline" /></div>
            }
          </div>
          <div className={`${s.estadoBadge} ${producto.activo ? s.estadoActivo : s.estadoInactivo}`}>
            <ion-icon name={producto.activo ? "checkmark-circle-outline" : "pause-circle-outline"} />
            {producto.activo ? "Activo" : "Inactivo"}
          </div>
          {(producto.categoria || producto.marca) && (
            <div className={s.chipsWrap}>
              {producto.categoria && (
                <span className={s.chip}>
                  <ion-icon name="pricetag-outline" />{producto.categoria.nombre}
                </span>
              )}
              {producto.marca && (
                <span className={s.chip}>
                  <ion-icon name="ribbon-outline" />{producto.marca.nombre}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={s.derecha}>

          <div className={s.card}>
            <div className={s.nombreProd}>{producto.nombre}</div>
            {producto.descripcion && <p className={s.descProd}>{producto.descripcion}</p>}
          </div>

          <div className={s.preciosGrid}>
            <div className={s.precioCard}>
              <div className={s.precioLabel}>Precio de venta</div>
              <div className={s.precioValor}>{fmt(producto.precio)}</div>
            </div>
            <div className={s.precioCard}>
              <div className={s.precioLabel}>Precio de costo</div>
              <div className={s.precioValorGris}>{fmt(producto.precio_costo)}</div>
            </div>
            <div className={s.precioCard}>
              <div className={s.precioLabel}>Stock disponible</div>
              <div className={`${s.precioValor} ${producto.stock === 0 ? s.stockCero : Number(producto.stock) <= 5 ? s.stockBajo : ""}`}>
                {producto.stock} uds
              </div>
            </div>
            <div className={s.precioCard}>
              <div className={s.precioLabel}>ITBIS</div>
              <div className={s.precioValorGris}>
                {producto.itbis_habilitado ? `${producto.itbis_pct}%` : "Exento"}
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="barcode-outline" />Código de barras</div>
            {producto.codigo && (
              <div className={s.codigoText}>
                <ion-icon name="scan-outline" />{producto.codigo}
              </div>
            )}
            {producto.barcode ? (
              <div className={s.barcodeWrap}>
                <img src={`${API}${producto.barcode}`} alt="barcode" className={s.barcodeImg} />
                <button
                  onClick={() => descargarBlob(`${API}${producto.barcode}`, `barcode_${producto.codigo ?? productoId}.png`)}
                  className={s.btnDescargar}
                >
                  <ion-icon name="download-outline" />Descargar PNG
                </button>
              </div>
            ) : (
              <button className={s.btnGenerarBarcode} onClick={handleGenerarBarcode} disabled={generando}>
                {generando
                  ? <><span className={s.spinnerDark} />Generando...</>
                  : <><ion-icon name="barcode-outline" />Generar código de barras</>
                }
              </button>
            )}
          </div>

        </div>
      </div>

      {confirmarElim && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setConfirmarElim(false)}>
          <div className={s.modalElim}>
            <div className={s.elimIcono}><ion-icon name="warning-outline" /></div>
            <div className={s.elimTitulo}>Eliminar producto</div>
            <div className={s.elimSub}>
              ¿Seguro que deseas eliminar <strong>{producto.nombre}</strong>?
              Esta acción no se puede deshacer.
            </div>
            <div className={s.elimAcciones}>
              <button className={s.btnCancelar} onClick={() => setConfirmarElim(false)}>Cancelar</button>
              <button className={s.btnEliminarConfirm} onClick={handleEliminar} disabled={eliminando}>
                {eliminando ? <span className={s.spinner} /> : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
