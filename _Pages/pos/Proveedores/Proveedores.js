"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getProveedores, crearProveedor, editarProveedor, eliminarProveedor } from "./servidor"
import s from "./Proveedores.module.css"

const EMPRESA_ID = 1
const LIMITE = 15
const FORM_VACIO = { nombre: "", rnc: "", telefono: "", email: "", direccion: "" }

function ModalProveedor({ inicial, onClose, onGuardado, mostrarAlerta }) {
  const esEditar = !!inicial
  const [form, setForm] = useState(
    inicial
      ? {
          nombre:    inicial.nombre    ?? "",
          rnc:       inicial.rnc       ?? "",
          telefono:  inicial.telefono  ?? "",
          email:     inicial.email     ?? "",
          direccion: inicial.direccion ?? "",
        }
      : { ...FORM_VACIO }
  )
  const [cargando, setCargando] = useState(false)

  function set(campo, val) { setForm(p => ({ ...p, [campo]: val })) }

  async function handleGuardar() {
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    setCargando(true)
    const res = esEditar
      ? await editarProveedor(EMPRESA_ID, inicial.id, form)
      : await crearProveedor(EMPRESA_ID, form)
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", esEditar ? "Proveedor actualizado" : "Proveedor creado")
    onGuardado()
  }

  function handleKey(e) { if (e.key === "Enter") handleGuardar() }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.modalTitle}>{esEditar ? "Editar proveedor" : "Nuevo proveedor"}</div>

        <div className={s.modalBody}>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Nombre *</label>
            <input
              className={s.formInput}
              placeholder="Nombre del proveedor"
              value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>
          <div className={s.formFila}>
            <div className={s.formGrupo}>
              <label className={s.formLabel}>RNC</label>
              <input
                className={s.formInput}
                placeholder="000-00000-0"
                value={form.rnc}
                onChange={e => set("rnc", e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
            <div className={s.formGrupo}>
              <label className={s.formLabel}>Teléfono</label>
              <input
                className={s.formInput}
                placeholder="809-000-0000"
                value={form.telefono}
                onChange={e => set("telefono", e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          </div>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Email</label>
            <input
              className={s.formInput}
              type="email"
              placeholder="correo@proveedor.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              onKeyDown={handleKey}
            />
          </div>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Dirección</label>
            <textarea
              className={s.formTextarea}
              placeholder="Dirección del proveedor..."
              value={form.direccion}
              onChange={e => set("direccion", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className={s.modalAcciones}>
          <button className={s.cancelarBtn} onClick={onClose}>Cancelar</button>
          <button className={s.confirmarBtn} onClick={handleGuardar} disabled={cargando}>
            {cargando
              ? <span className={s.spinner} />
              : <><ion-icon name="checkmark-circle-outline" />{esEditar ? "Guardar cambios" : "Crear proveedor"}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Proveedores() {
  const [proveedores, setProveedores]   = useState([])
  const [total, setTotal]               = useState(0)
  const [paginas, setPaginas]           = useState(1)
  const [pagina, setPagina]             = useState(1)
  const [busqueda, setBusqueda]         = useState("")
  const [inputVal, setInputVal]         = useState("")
  const [cargando, setCargando]         = useState(true)
  const [alerta, setAlerta]             = useState(null)
  const [modal, setModal]               = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando]     = useState(false)
  const debounceRef                     = useRef(null)

  const cargar = useCallback(async (b = busqueda, p = pagina) => {
    setCargando(true)
    const res = await getProveedores(EMPRESA_ID, { busqueda: b, pagina: p, limite: LIMITE })
    setProveedores(res.proveedores ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [busqueda, pagina])

  useEffect(() => { cargar() }, [])

  function handleBusqueda(val) {
    setInputVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBusqueda(val)
      setPagina(1)
      cargar(val, 1)
    }, 400)
  }

  function limpiarBusqueda() {
    setInputVal("")
    setBusqueda("")
    setPagina(1)
    cargar("", 1)
  }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function irPagina(p) {
    setPagina(p)
    cargar(busqueda, p)
  }

  async function handleEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const res = await eliminarProveedor(EMPRESA_ID, confirmEliminar.id)
    setEliminando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Proveedor eliminado")
    setConfirmEliminar(null)
    const nuevaPagina = proveedores.length === 1 && pagina > 1 ? pagina - 1 : pagina
    setPagina(nuevaPagina)
    cargar(busqueda, nuevaPagina)
  }

  const paginasArr = () => {
    if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1)
    const arr = []
    if (pagina <= 4) {
      arr.push(1, 2, 3, 4, 5, "...", paginas)
    } else if (pagina >= paginas - 3) {
      arr.push(1, "...", paginas - 4, paginas - 3, paginas - 2, paginas - 1, paginas)
    } else {
      arr.push(1, "...", pagina - 1, pagina, pagina + 1, "...", paginas)
    }
    return arr
  }

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
            placeholder="Buscar por nombre, RNC, teléfono, email..."
            value={inputVal}
            onChange={e => handleBusqueda(e.target.value)}
          />
          {inputVal && (
            <button className={s.clearBtn} onClick={limpiarBusqueda}>
              <ion-icon name="close-outline" />
            </button>
          )}
        </div>
        <div className={s.topRight}>
          <span className={s.conteo}>{total} proveedor{total !== 1 ? "es" : ""}</span>
          <button className={s.nuevaBtn} onClick={() => setModal({ tipo: "crear" })}>
            <ion-icon name="add-outline" />
            Nuevo proveedor
          </button>
        </div>
      </div>

      <div className={s.grid}>
        {cargando ? (
          [...Array(6)].map((_, i) => <div key={i} className={s.skeletonCard} />)
        ) : proveedores.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="business-outline" />
            <p>{busqueda ? `Sin resultados para "${busqueda}"` : "No hay proveedores registrados"}</p>
            {busqueda && (
              <button className={s.limpiarFiltro} onClick={limpiarBusqueda}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : proveedores.map(p => (
          <div key={p.id} className={s.card}>
            <div className={s.cardTop}>
              <div className={s.avatar}>{p.nombre.charAt(0).toUpperCase()}</div>
              <div className={s.cardAcciones}>
                <button className={s.accionBtn} title="Editar" onClick={() => setModal({ tipo: "editar", proveedor: p })}>
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={`${s.accionBtn} ${s.accionEliminar}`} title="Eliminar" onClick={() => setConfirmEliminar(p)}>
                  <ion-icon name="trash-outline" />
                </button>
              </div>
            </div>

            <div className={s.cardInfo}>
              <div className={s.cardNombre}>{p.nombre}</div>
              {p.rnc && <div className={s.cardRnc}>RNC: {p.rnc}</div>}
            </div>

            <div className={s.cardDatos}>
              {p.telefono && (
                <div className={s.dato}>
                  <ion-icon name="call-outline" />
                  <span>{p.telefono}</span>
                </div>
              )}
              {p.email && (
                <div className={s.dato}>
                  <ion-icon name="mail-outline" />
                  <span>{p.email}</span>
                </div>
              )}
              {p.direccion && (
                <div className={s.dato}>
                  <ion-icon name="location-outline" />
                  <span>{p.direccion}</span>
                </div>
              )}
              {!p.telefono && !p.email && !p.direccion && (
                <span className={s.sinDatos}>Sin datos de contacto</span>
              )}
            </div>

            <div className={s.cardFooter}>
              <div className={s.comprasBadge}>
                <ion-icon name="bag-handle-outline" />
                {p.total_compras} compra{p.total_compras !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
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
              <button
                key={item}
                className={item === pagina ? s.paginaActiva : s.paginaBtn}
                onClick={() => item !== pagina && irPagina(item)}
              >
                {item}
              </button>
            )
          )}

          <button disabled={pagina === paginas} onClick={() => irPagina(pagina + 1)}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modal && (
        <ModalProveedor
          inicial={modal.tipo === "editar" ? modal.proveedor : null}
          onClose={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
          mostrarAlerta={mostrarAlerta}
        />
      )}

      {confirmEliminar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setConfirmEliminar(null)}>
          <div className={s.modalConfirm}>
            <div className={s.confirmIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.confirmTitle}>¿Eliminar proveedor?</div>
            <p className={s.confirmDesc}>
              Se eliminará <strong>{confirmEliminar.nombre}</strong>. Solo se pueden eliminar proveedores sin compras registradas.
            </p>
            <div className={s.modalAcciones}>
              <button className={s.cancelarBtn} onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button className={`${s.confirmarBtn} ${s.confirmarBtnDanger}`} onClick={handleEliminar} disabled={eliminando}>
                {eliminando ? <span className={s.spinner} /> : <><ion-icon name="trash-outline" />Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}