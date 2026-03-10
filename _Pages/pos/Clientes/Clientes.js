"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getClientes, crearCliente, editarCliente, eliminarCliente } from "./servidor"
import s from "./Clientes.module.css"

const EMPRESA_ID = 1
const LIMITE = 20
const FORM_VACIO = { nombre: "", cedula_rnc: "", telefono: "", email: "", direccion: "" }

function ModalCliente({ inicial, onClose, onGuardado, mostrarAlerta }) {
  const esEditar = !!inicial
  const [form, setForm] = useState(
    inicial
      ? {
          nombre:     inicial.nombre     ?? "",
          cedula_rnc: inicial.cedula_rnc ?? "",
          telefono:   inicial.telefono   ?? "",
          email:      inicial.email      ?? "",
          direccion:  inicial.direccion  ?? "",
        }
      : { ...FORM_VACIO }
  )
  const [cargando, setCargando] = useState(false)

  function set(campo, val) { setForm(p => ({ ...p, [campo]: val })) }

  async function handleGuardar() {
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    setCargando(true)
    const res = esEditar
      ? await editarCliente(EMPRESA_ID, inicial.id, form)
      : await crearCliente(EMPRESA_ID, form)
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", esEditar ? "Cliente actualizado" : "Cliente creado")
    onGuardado()
  }

  function handleKey(e) { if (e.key === "Enter") handleGuardar() }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.modalTitle}>{esEditar ? "Editar cliente" : "Nuevo cliente"}</div>

        <div className={s.modalBody}>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Nombre *</label>
            <input
              className={s.formInput}
              placeholder="Nombre del cliente"
              value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>
          <div className={s.formFila}>
            <div className={s.formGrupo}>
              <label className={s.formLabel}>Cédula / RNC</label>
              <input
                className={s.formInput}
                placeholder="000-0000000-0"
                value={form.cedula_rnc}
                onChange={e => set("cedula_rnc", e.target.value)}
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
              placeholder="correo@cliente.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              onKeyDown={handleKey}
            />
          </div>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Dirección</label>
            <textarea
              className={s.formTextarea}
              placeholder="Dirección del cliente..."
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
              : <><ion-icon name="checkmark-circle-outline" />{esEditar ? "Guardar cambios" : "Crear cliente"}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes]               = useState([])
  const [total, setTotal]                     = useState(0)
  const [paginas, setPaginas]                 = useState(1)
  const [pagina, setPagina]                   = useState(1)
  const [busqueda, setBusqueda]               = useState("")
  const [inputVal, setInputVal]               = useState("")
  const [cargando, setCargando]               = useState(true)
  const [alerta, setAlerta]                   = useState(null)
  const [modal, setModal]                     = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando]           = useState(false)
  const debounceRef                           = useRef(null)

  const cargar = useCallback(async (b = busqueda, p = pagina) => {
    setCargando(true)
    const res = await getClientes(EMPRESA_ID, { busqueda: b, pagina: p, limite: LIMITE })
    setClientes(res.clientes ?? [])
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
    const res = await eliminarCliente(EMPRESA_ID, confirmEliminar.id)
    setEliminando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Cliente eliminado")
    setConfirmEliminar(null)
    const nuevaPagina = clientes.length === 1 && pagina > 1 ? pagina - 1 : pagina
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
            placeholder="Buscar por nombre, cédula, teléfono, email..."
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
          <span className={s.conteo}>{total} cliente{total !== 1 ? "s" : ""}</span>
          <button className={s.nuevaBtn} onClick={() => setModal({ tipo: "crear" })}>
            <ion-icon name="person-add-outline" />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className={s.tabla}>
        <div className={s.tablaHeader}>
          <div className={s.colNombre}>Cliente</div>
          <div className={s.colCedula}>Cédula / RNC</div>
          <div className={s.colTelefono}>Teléfono</div>
          <div className={s.colEmail}>Email</div>
          <div className={s.colStats}>Ventas</div>
          <div className={s.colAcciones}></div>
        </div>

        <div className={s.tablaBody}>
          {cargando ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className={s.skeletonRow}>
                <div className={s.skeletonCell} style={{ width: "30%" }} />
                <div className={s.skeletonCell} style={{ width: "15%" }} />
                <div className={s.skeletonCell} style={{ width: "14%" }} />
                <div className={s.skeletonCell} style={{ width: "20%" }} />
                <div className={s.skeletonCell} style={{ width: "8%" }} />
              </div>
            ))
          ) : clientes.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="people-outline" />
              <p>{busqueda ? `Sin resultados para "${busqueda}"` : "No hay clientes registrados"}</p>
              {busqueda && (
                <button className={s.limpiarFiltro} onClick={limpiarBusqueda}>
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : clientes.map((c, idx) => (
            <div key={c.id} className={`${s.fila} ${idx % 2 === 1 ? s.filaAlterna : ""}`}>
              <div className={s.colNombre}>
                <div className={s.avatar}>{c.nombre.charAt(0).toUpperCase()}</div>
                <div className={s.nombreWrap}>
                  <span className={s.nombreText}>{c.nombre}</span>
                  {c.direccion && <span className={s.direccionText}>{c.direccion}</span>}
                </div>
              </div>
              <div className={s.colCedula}>
                <span className={c.cedula_rnc ? s.cedula : s.sinDato}>
                  {c.cedula_rnc || "—"}
                </span>
              </div>
              <div className={s.colTelefono}>
                <span className={c.telefono ? s.telefonoText : s.sinDato}>
                  {c.telefono || "—"}
                </span>
              </div>
              <div className={s.colEmail}>
                <span className={c.email ? s.emailText : s.sinDato}>
                  {c.email || "—"}
                </span>
              </div>
              <div className={s.colStats}>
                <span className={s.ventasBadge}>
                  {c.total_ventas}
                </span>
                {c.total_cotizaciones > 0 && (
                  <span className={s.cotizBadge}>{c.total_cotizaciones}</span>
                )}
              </div>
              <div className={s.colAcciones}>
                <button className={s.accionBtn} title="Editar" onClick={() => setModal({ tipo: "editar", cliente: c })}>
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={`${s.accionBtn} ${s.accionEliminar}`} title="Eliminar" onClick={() => setConfirmEliminar(c)}>
                  <ion-icon name="trash-outline" />
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
        <ModalCliente
          inicial={modal.tipo === "editar" ? modal.cliente : null}
          onClose={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
          mostrarAlerta={mostrarAlerta}
        />
      )}

      {confirmEliminar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setConfirmEliminar(null)}>
          <div className={s.modalConfirm}>
            <div className={s.confirmIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.confirmTitle}>¿Eliminar cliente?</div>
            <p className={s.confirmDesc}>
              Se eliminará <strong>{confirmEliminar.nombre}</strong>. Solo se pueden eliminar clientes sin ventas, cotizaciones ni pedidos registrados.
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