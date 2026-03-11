"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import s from "./Marcas.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const EMPRESA_ID = 1

async function getMarcas(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await fetch(`${API}/api/pos/marcas/${empresaId}?${params}`)
    if (!res.ok) return { marcas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { marcas: [], total: 0, paginas: 1 } }
}

async function crearMarca(empresaId, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarMarca(id, nombre) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function eliminarMarca(id) {
  try {
    const res = await fetch(`${API}/api/pos/marcas/${id}`, { method: "DELETE" })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function Marcas() {
  const [marcas, setMarcas]         = useState([])
  const [total, setTotal]           = useState(0)
  const [pagina, setPagina]         = useState(1)
  const [paginas, setPaginas]       = useState(1)
  const [busqueda, setBusqueda]     = useState("")
  const [cargando, setCargando]     = useState(true)
  const [alerta, setAlerta]         = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [modal, setModal]           = useState(null)
  const [nombre, setNombre]         = useState("")
  const [modalElim, setModalElim]   = useState(null)
  const [editInline, setEditInline] = useState(null)
  const [editNombre, setEditNombre] = useState("")
  const searchRef                   = useRef()

  const cargar = useCallback(async (q = "", p = 1) => {
    setCargando(true)
    const res = await getMarcas(EMPRESA_ID, q, p, 20)
    setMarcas(res.marcas ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [])

  useEffect(() => { cargar("", 1) }, [cargar])

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); cargar(busqueda, 1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function limpiarBusqueda() {
    setBusqueda("")
    searchRef.current?.focus()
  }

  async function handleGuardar() {
    if (!nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    setProcesando(true)
    const res = modal === "crear"
      ? await crearMarca(EMPRESA_ID, nombre)
      : await editarMarca(modal.id, nombre)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", modal === "crear" ? "Marca creada" : "Marca actualizada")
    setModal(null)
    cargar(busqueda, pagina)
  }

  async function handleGuardarInline(marca) {
    if (!editNombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (editNombre.trim() === marca.nombre) { setEditInline(null); return }
    setProcesando(true)
    const res = await editarMarca(marca.id, editNombre)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    setMarcas(prev => prev.map(m => m.id === marca.id ? { ...m, nombre: res.nombre } : m))
    setEditInline(null)
    mostrarAlerta("ok", "Marca actualizada")
  }

  async function handleEliminar() {
    if (!modalElim) return
    setProcesando(true)
    const res = await eliminarMarca(modalElim.id)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Marca eliminada")
    setModalElim(null)
    cargar(busqueda, pagina)
  }

  function irPagina(p) { setPagina(p); cargar(busqueda, p) }

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
          <span className={s.subtitulo}>{total} marca{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</span>
        </div>
        <div className={s.topBarRight}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" class={s.searchIcon} />
            <input
              ref={searchRef}
              className={s.searchInput}
              placeholder="Buscar marca..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onMouseDown={e => { e.preventDefault(); limpiarBusqueda() }}>
                <ion-icon name="close-circle" />
              </button>
            )}
          </div>
          <button className={s.btnNuevo} onClick={() => { setNombre(""); setModal("crear") }}>
            <ion-icon name="add-outline" />
            <span>Nueva marca</span>
          </button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span>Nombre</span>
          <span className={s.colProductos}>Productos</span>
          <span></span>
        </div>

        {cargando ? (
          [...Array(6)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : marcas.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="ribbon-outline" />
            <p>{busqueda ? `Sin resultados para "${busqueda}"` : "Sin marcas registradas"}</p>
            {!busqueda && (
              <button className={s.btnNuevoEmpty} onClick={() => { setNombre(""); setModal("crear") }}>
                <ion-icon name="add-outline" /> Crear primera marca
              </button>
            )}
          </div>
        ) : (
          marcas.map(marca => (
            <div key={marca.id} className={s.tableRow}>
              <div className={s.nombreCell}>
                {editInline === marca.id ? (
                  <div className={s.inlineEditWrap}>
                    <input
                      autoFocus
                      className={s.inlineInput}
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleGuardarInline(marca)
                        if (e.key === "Escape") setEditInline(null)
                      }}
                    />
                    <button className={s.inlineSave} onClick={() => handleGuardarInline(marca)} disabled={procesando}>
                      {procesando ? <span className={s.spinnerSm} /> : <ion-icon name="checkmark-outline" />}
                    </button>
                    <button className={s.inlineCancel} onClick={() => setEditInline(null)}>
                      <ion-icon name="close-outline" />
                    </button>
                  </div>
                ) : (
                  <span className={s.marcaNombre}>{marca.nombre}</span>
                )}
              </div>

              <div className={`${s.countCell} ${s.colProductos}`}>
                <span className={`${s.countBadge} ${marca._count.productos === 0 ? s.countCero : ""}`}>
                  <ion-icon name="cube-outline" />
                  <span>{marca._count.productos}</span>
                </span>
              </div>

              <div className={s.acciones}>
                <button
                  className={s.btnEdit}
                  onClick={() => { setEditInline(marca.id); setEditNombre(marca.nombre) }}
                  title="Editar"
                >
                  <ion-icon name="pencil-outline" />
                </button>
                <button
                  className={s.btnDel}
                  onClick={() => setModalElim(marca)}
                  title={marca._count.productos > 0 ? "Tiene productos asignados" : "Eliminar"}
                  disabled={marca._count.productos > 0}
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
              <ion-icon name="ribbon-outline" />
              {modal === "crear" ? "Nueva marca" : "Editar marca"}
            </div>
            <div className={s.modalField}>
              <label>Nombre *</label>
              <input
                autoFocus
                className={s.modalInput}
                placeholder="Ej: Nike, Samsung, Apple..."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuardar()}
              />
            </div>
            <div className={s.modalAcciones}>
              <button className={s.btnCancelar} onClick={() => setModal(null)}>Cancelar</button>
              <button className={s.btnConfirmar} onClick={handleGuardar} disabled={procesando || !nombre.trim()}>
                {procesando ? <span className={s.spinner} /> : modal === "crear" ? "Crear marca" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalElim && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalElim(null)}>
          <div className={s.modalElim}>
            <div className={s.elimIcono}><ion-icon name="warning-outline" /></div>
            <div className={s.elimTitulo}>Eliminar marca</div>
            <div className={s.elimSub}>
              ¿Seguro que deseas eliminar <strong>{modalElim.nombre}</strong>? Esta accion no se puede deshacer.
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