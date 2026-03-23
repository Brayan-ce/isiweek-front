"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./Categorias.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getCategorias(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await apiFetch(`/api/pos/categorias/${empresaId}?${params}`)
    if (!res.ok) return { categorias: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { categorias: [], total: 0, paginas: 1 } }
}

async function crearCategoria(empresaId, nombre) {
  try {
    const res = await apiFetch(`/api/pos/categorias/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarCategoria(id, nombre) {
  try {
    const res = await apiFetch(`/api/pos/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function eliminarCategoria(id) {
  try {
    const res = await apiFetch(`/api/pos/categorias/${id}`, {
      method: "DELETE",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function Categorias() {
  const router = useRouter()
  const [empresaId,   setEmpresaId]   = useState(null)
  const [categorias,  setCategorias]  = useState([])
  const [total,       setTotal]       = useState(0)
  const [pagina,      setPagina]      = useState(1)
  const [paginas,     setPaginas]     = useState(1)
  const [busqueda,    setBusqueda]    = useState("")
  const [cargando,    setCargando]    = useState(true)
  const [alerta,      setAlerta]      = useState(null)
  const [procesando,  setProcesando]  = useState(false)
  const [modal,       setModal]       = useState(null)
  const [nombre,      setNombre]      = useState("")
  const [modalElim,   setModalElim]   = useState(null)
  const [editInline,  setEditInline]  = useState(null)
  const [editNombre,  setEditNombre]  = useState("")
  const searchRef                     = useRef()

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (q = "", p = 1) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getCategorias(empresaId, q, p, 20)
    setCategorias(res.categorias ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar("", 1) }, [cargar])

  useEffect(() => {
    if (!empresaId) return
    const t = setTimeout(() => { setPagina(1); cargar(busqueda, 1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargar, empresaId])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function limpiarBusqueda() {
    setBusqueda("")
    searchRef.current?.focus()
  }

  function abrirCrear() {
    setNombre("")
    setModal("crear")
  }

  async function handleGuardar() {
    if (!empresaId) return
    if (!nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    setProcesando(true)
    const res = modal === "crear"
      ? await crearCategoria(empresaId, nombre)
      : await editarCategoria(modal.id, nombre)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", modal === "crear" ? "Categoria creada" : "Categoria actualizada")
    setModal(null)
    cargar(busqueda, pagina)
  }

  async function handleGuardarInline(cat) {
    if (!editNombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (editNombre.trim() === cat.nombre) { setEditInline(null); return }
    setProcesando(true)
    const res = await editarCategoria(cat.id, editNombre)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, nombre: res.nombre } : c))
    setEditInline(null)
    mostrarAlerta("ok", "Categoria actualizada")
  }

  async function handleEliminar() {
    if (!modalElim) return
    setProcesando(true)
    const res = await eliminarCategoria(modalElim.id)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Categoria eliminada")
    setModalElim(null)
    cargar(busqueda, pagina)
  }

  function irPagina(p) { setPagina(p); cargar(busqueda, p) }

  if (!empresaId || cargando) return (
    <div className={s.page}>
      {[...Array(6)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
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
        <div className={s.topBarLeft}>
          <span className={s.subtitulo}>{total} categoria{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</span>
        </div>
        <div className={s.topBarRight}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" class={s.searchIcon} />
            <input
              ref={searchRef}
              className={s.searchInput}
              placeholder="Buscar categoria..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onMouseDown={e => { e.preventDefault(); limpiarBusqueda() }}>
                <ion-icon name="close-circle" />
              </button>
            )}
          </div>
          <button className={s.btnNuevo} onClick={abrirCrear}>
            <ion-icon name="add-outline" />
            <span>Nueva categoria</span>
          </button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span>Nombre</span>
          <span className={s.colProductos}>Productos</span>
          <span></span>
        </div>

        {categorias.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="pricetags-outline" />
            <p>{busqueda ? `Sin resultados para "${busqueda}"` : "Sin categorias registradas"}</p>
            {!busqueda && (
              <button className={s.btnNuevoEmpty} onClick={abrirCrear}>
                <ion-icon name="add-outline" /> Crear primera categoria
              </button>
            )}
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat.id} className={s.tableRow}>
              <div className={s.nombreCell}>
                {editInline === cat.id ? (
                  <div className={s.inlineEditWrap}>
                    <input
                      autoFocus
                      className={s.inlineInput}
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleGuardarInline(cat)
                        if (e.key === "Escape") setEditInline(null)
                      }}
                    />
                    <button className={s.inlineSave} onClick={() => handleGuardarInline(cat)} disabled={procesando}>
                      {procesando ? <span className={s.spinnerSm} /> : <ion-icon name="checkmark-outline" />}
                    </button>
                    <button className={s.inlineCancel} onClick={() => setEditInline(null)}>
                      <ion-icon name="close-outline" />
                    </button>
                  </div>
                ) : (
                  <span className={s.catNombre}>{cat.nombre}</span>
                )}
              </div>

              <div className={`${s.countCell} ${s.colProductos}`}>
                <span className={`${s.countBadge} ${cat._count.productos === 0 ? s.countCero : ""}`}>
                  <ion-icon name="cube-outline" />
                  <span>{cat._count.productos}</span>
                </span>
              </div>

              <div className={s.acciones}>
                <button
                  className={s.btnEdit}
                  onClick={() => { setEditInline(cat.id); setEditNombre(cat.nombre) }}
                  title="Editar"
                >
                  <ion-icon name="pencil-outline" />
                </button>
                <button
                  className={s.btnDel}
                  onClick={() => setModalElim(cat)}
                  title={cat._count.productos > 0 ? "Tiene productos asignados" : "Eliminar"}
                  disabled={cat._count.productos > 0}
                >
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
              <ion-icon name="pricetag-outline" />
              {modal === "crear" ? "Nueva categoria" : "Editar categoria"}
            </div>
            <div className={s.modalField}>
              <label>Nombre *</label>
              <input
                autoFocus
                className={s.modalInput}
                placeholder="Ej: Electronica, Ropa, Alimentos..."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuardar()}
              />
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnCancelar} onClick={() => setModal(null)}>Cancelar</button>
              <button className={s.btnConfirmar} onClick={handleGuardar} disabled={procesando || !nombre.trim()}>
                {procesando ? <span className={s.spinner} /> : modal === "crear" ? "Crear categoria" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalElim && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalElim(null)}>
          <div className={s.modalElim}>
            <div className={s.elimIcono}><ion-icon name="warning-outline" /></div>
            <div className={s.elimTitulo}>Eliminar categoria</div>
            <div className={s.elimSub}>
              Seguro que deseas eliminar <strong>{modalElim.nombre}</strong>? Esta accion no se puede deshacer.
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnCancelar} onClick={() => setModalElim(null)}>Cancelar</button>
              <button className={s.btnEliminar} onClick={handleEliminar} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}