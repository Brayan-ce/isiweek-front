"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Productos.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
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

async function generarBarcode(id) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}/barcode`, { method: "POST" })
    return await res.json()
  } catch { return { error: "No se pudo generar el codigo de barras" } }
}

async function eliminarProducto(id) {
  try {
    const res = await apiFetch(`/api/pos/productos/${id}`, { method: "DELETE" })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

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

export default function Productos() {
  const router = useRouter()
  const [empresaId,    setEmpresaId]    = useState(null)
  const [usuarioId,    setUsuarioId]    = useState(null)
  const [productos,    setProductos]    = useState([])
  const [total,        setTotal]        = useState(0)
  const [pagina,       setPagina]       = useState(1)
  const [paginas,      setPaginas]      = useState(1)
  const [busqueda,     setBusqueda]     = useState("")
  const [cargando,     setCargando]     = useState(true)
  const [alerta,       setAlerta]       = useState(null)
  const [procesando,   setProcesando]   = useState(false)
  const [moneda,       setMoneda]       = useState({ simbolo: "RD$", codigo: "DOP" })
  const [modalElim,    setModalElim]    = useState(null)
  const [modalBarcode, setModalBarcode] = useState(null)
  const [generando,    setGenerando]    = useState(false)
  const simboloMoneda = (moneda?.simbolo && String(moneda.simbolo).trim()) || "RD$"

  function fmt(n) {
    return `${simboloMoneda} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!empresaId || !usuarioId) return
    apiFetch(`/api/pos/header/${usuarioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresa?.moneda) setMoneda(d.empresa.moneda) })
      .catch(() => {})
  }, [empresaId, usuarioId])

  const cargar = useCallback(async (q, p) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getProductos(empresaId, q ?? "", p ?? 1, 20)
    setProductos(res.productos ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId])

  useEffect(() => {
    if (empresaId) cargar("", 1)
  }, [empresaId, cargar])

  useEffect(() => {
    if (!empresaId) return
    const t = setTimeout(() => { setPagina(1); cargar(busqueda, 1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargar, empresaId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  async function abrirBarcode(p) {
    setModalBarcode({ ...p })
    if (!p.barcode) {
      setGenerando(true)
      const res = await generarBarcode(p.id)
      setGenerando(false)
      if (res.error) { mostrarAlerta("error", res.error); setModalBarcode(null); return }
      const actualizado = { ...p, codigo: res.codigo, barcode: res.barcode }
      setModalBarcode(actualizado)
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, codigo: res.codigo, barcode: res.barcode } : x))
    }
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
          <div className={s.subtitulo}>{total} producto{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</div>
        </div>
        <div className={s.topBarRight}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              className={s.searchInput}
              placeholder="Buscar por nombre o codigo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onClick={() => setBusqueda("")}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>
          <button className={s.btnNuevo} onClick={() => router.push("/pos/productos/nuevo")}>
            <ion-icon name="add-outline" /> Nuevo producto
          </button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span>Producto</span>
          <span>Cód. de barras</span>
          <span>Categoria</span>
          <span>Precio</span>
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
                <button className={s.barcodeBtn} onClick={() => abrirBarcode(p)}>
                  <ion-icon name="barcode-outline" />
                  <span className={s.barcodeBtnInner}>
                    <span className={s.barcodeBtnLabel}>Ver código</span>
                    {p.codigo && <span className={s.barcodeBtnCode}>{p.codigo}</span>}
                  </span>
                </button>
              </div>
              <span className={s.cellGris}>{p.categoria?.nombre ?? "—"}</span>
              <span className={s.cellPrecio}>{fmt(p.precio)}</span>
              <span className={`${s.cellStock} ${p.stock === 0 ? s.stockCero : p.stock <= 5 ? s.stockBajo : ""}`}>
                {p.stock}
              </span>
              <span className={s.cellGris}>{p.itbis_habilitado ? `${p.itbis_pct}%` : "Exento"}</span>
              <span className={`${s.badge} ${p.activo ? s.badgeActivo : s.badgeInactivo}`}>
                {p.activo ? "Activo" : "Inactivo"}
              </span>
              <div className={s.acciones}>
                <button className={s.btnVer}  title="Ver detalle" onClick={() => router.push(`/pos/productos/${p.id}/ver`)}>
                  <ion-icon name="eye-outline" />
                </button>
                <button className={s.btnEdit} title="Editar"      onClick={() => router.push(`/pos/productos/${p.id}/editar`)}>
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={s.btnDel}  title="Eliminar"    onClick={() => setModalElim(p)}>
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
              <ion-icon name="barcode-outline" /> Codigo de barras
            </div>
            <div className={s.barcodeProdNombre}>{modalBarcode.nombre}</div>
            {generando ? (
              <div className={s.barcodeGenerando}>
                <span className={s.spinnerDark} />
                <span>Generando codigo...</span>
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
                <button
                  className={s.barcodeDescargar}
                  onClick={() => descargarBlob(`${API}${modalBarcode.barcode}`, `barcode_${modalBarcode.codigo}.png`)}
                >
                  <ion-icon name="download-outline" /> Descargar PNG
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
