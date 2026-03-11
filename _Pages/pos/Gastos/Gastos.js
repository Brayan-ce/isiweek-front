"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import s from "./Gastos.module.css"

const API        = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const EMPRESA_ID = 1
const USUARIO_ID = 2
const LIMITE     = 20

const FORM_VACIO = { concepto: "", monto: "", tipo: "" }

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtHora(f) {
  if (!f) return "—"
  return new Date(f).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
}

async function getDatosCaja(usuarioId, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cajas/datos/${usuarioId}/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getGastos(empresaId, filtros = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, v)
    })
    const res = await fetch(`${API}/api/pos/gastos/lista/${empresaId}?${params}`)
    if (!res.ok) return { gastos: [], total: 0, paginas: 1, pagina: 1 }
    return await res.json()
  } catch { return { gastos: [], total: 0, paginas: 1, pagina: 1 } }
}

async function getTiposGasto(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/gastos/tipos/${empresaId}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function getResumenGastos(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/gastos/resumen/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function crearGasto(empresaId, usuarioId, body) {
  try {
    const res = await fetch(`${API}/api/pos/gastos/crear/${empresaId}/${usuarioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarGasto(empresaId, gastoId, body) {
  try {
    const res = await fetch(`${API}/api/pos/gastos/editar/${empresaId}/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function eliminarGasto(empresaId, gastoId) {
  try {
    const res = await fetch(`${API}/api/pos/gastos/eliminar/${empresaId}/${gastoId}`, {
      method: "DELETE",
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

function ModalGasto({ inicial, onClose, onGuardado, mostrarAlerta, tiposExistentes }) {
  const esEditar = !!inicial
  const [form, setForm]     = useState(
    inicial
      ? { concepto: inicial.concepto ?? "", monto: String(inicial.monto ?? ""), tipo: inicial.tipo ?? "" }
      : { ...FORM_VACIO }
  )
  const [cargando, setCargando] = useState(false)

  function set(campo, val) { setForm(p => ({ ...p, [campo]: val })) }

  async function handleGuardar() {
    if (!form.concepto.trim()) return mostrarAlerta("error", "El concepto es obligatorio")
    if (!form.monto || Number(form.monto) <= 0) return mostrarAlerta("error", "El monto debe ser mayor a 0")
    setCargando(true)
    const res = esEditar
      ? await editarGasto(EMPRESA_ID, inicial.id, form)
      : await crearGasto(EMPRESA_ID, USUARIO_ID, form)
    setCargando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", esEditar ? "Gasto actualizado" : "Gasto registrado")
    onGuardado()
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        <div className={s.modalTitulo}>
          <ion-icon name="remove-circle-outline" />
          {esEditar ? "Editar gasto" : "Nuevo gasto"}
        </div>

        <div className={s.modalBody}>
          <div className={s.formGrupo}>
            <label className={s.formLabel}>Concepto *</label>
            <input
              className={s.formInput}
              placeholder="Ej: Compra de materiales"
              value={form.concepto}
              onChange={e => set("concepto", e.target.value)}
              autoFocus
            />
          </div>

          <div className={s.formGrupo}>
            <label className={s.formLabel}>Monto *</label>
            <input
              className={`${s.formInput} ${s.formInputGrande}`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.monto}
              onChange={e => set("monto", e.target.value)}
              onFocus={e => e.target.select()}
            />
          </div>

          <div className={s.formGrupo}>
            <label className={s.formLabel}>Tipo (opcional)</label>
            <input
              className={s.formInput}
              placeholder="Ej: Operativo, Limpieza, Nomina..."
              value={form.tipo}
              onChange={e => set("tipo", e.target.value)}
              list="tipos-list"
            />
            {tiposExistentes.length > 0 && (
              <datalist id="tipos-list">
                {tiposExistentes.map(t => <option key={t} value={t} />)}
              </datalist>
            )}
          </div>
        </div>

        <div className={s.modalAcciones}>
          <button className={s.cancelarBtn} onClick={onClose}>Cancelar</button>
          <button className={s.confirmarBtn} onClick={handleGuardar} disabled={cargando}>
            {cargando
              ? <span className={s.spinner} />
              : <><ion-icon name="checkmark-circle-outline" />{esEditar ? "Guardar cambios" : "Registrar gasto"}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Gastos() {
  const [caja, setCaja]                       = useState(null)
  const [cargandoCaja, setCargandoCaja]       = useState(true)
  const [gastos, setGastos]                   = useState([])
  const [total, setTotal]                     = useState(0)
  const [paginas, setPaginas]                 = useState(1)
  const [pagina, setPagina]                   = useState(1)
  const [resumen, setResumen]                 = useState(null)
  const [tiposExistentes, setTiposExistentes] = useState([])
  const [busqueda, setBusqueda]               = useState("")
  const [inputVal, setInputVal]               = useState("")
  const [tipoFiltro, setTipoFiltro]           = useState("")
  const [cargando, setCargando]               = useState(true)
  const [alerta, setAlerta]                   = useState(null)
  const [modal, setModal]                     = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando]           = useState(false)
  const debounceRef                           = useRef(null)

  const cajaAbierta = caja?.sesion?.estado === "abierta"

  const cargar = useCallback(async (opts = {}) => {
    setCargando(true)
    const res = await getGastos(EMPRESA_ID, {
      busqueda: opts.busqueda ?? busqueda,
      tipo:     opts.tipo     ?? tipoFiltro,
      pagina:   opts.pagina   ?? pagina,
      limite:   LIMITE,
    })
    setGastos(res.gastos ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [busqueda, tipoFiltro, pagina])

  useEffect(() => {
    setCargandoCaja(true)
    getDatosCaja(USUARIO_ID, EMPRESA_ID).then(d => {
      setCaja(d)
      setCargandoCaja(false)
    })
    cargar()
    getResumenGastos(EMPRESA_ID).then(r => setResumen(r))
    getTiposGasto(EMPRESA_ID).then(t => setTiposExistentes(t))
  }, [])

  function handleBusqueda(val) {
    setInputVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBusqueda(val)
      setPagina(1)
      cargar({ busqueda: val, pagina: 1 })
    }, 400)
  }

  function handleTipoFiltro(val) {
    setTipoFiltro(val)
    setPagina(1)
    cargar({ tipo: val, pagina: 1 })
  }

  function limpiarFiltros() {
    setInputVal(""); setBusqueda(""); setTipoFiltro(""); setPagina(1)
    cargar({ busqueda: "", tipo: "", pagina: 1 })
  }

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function irPagina(p) { setPagina(p); cargar({ pagina: p }) }

  async function handleEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const res = await eliminarGasto(EMPRESA_ID, confirmEliminar.id)
    setEliminando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Gasto eliminado")
    setConfirmEliminar(null)
    const nuevaPagina = gastos.length === 1 && pagina > 1 ? pagina - 1 : pagina
    setPagina(nuevaPagina)
    cargar({ pagina: nuevaPagina })
    getResumenGastos(EMPRESA_ID).then(r => setResumen(r))
  }

  const hayFiltros = inputVal || tipoFiltro

  const paginasArr = () => {
    if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1)
    const arr = []
    if (pagina <= 4) arr.push(1, 2, 3, 4, 5, "...", paginas)
    else if (pagina >= paginas - 3) arr.push(1, "...", paginas - 4, paginas - 3, paginas - 2, paginas - 1, paginas)
    else arr.push(1, "...", pagina - 1, pagina, pagina + 1, "...", paginas)
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

      {!cargandoCaja && !cajaAbierta && (
        <div className={s.cajaBanner}>
          <ion-icon name="warning-outline" />
          <div>
            <strong>No tienes una caja abierta.</strong> Para registrar gastos debes abrir tu caja primero.
          </div>
          <a href="/pos/cajas" className={s.cajaBannerLink}>
            Ir a Cajas <ion-icon name="arrow-forward-outline" />
          </a>
        </div>
      )}

      {resumen && (
        <div className={s.resumenGrid}>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Gastos de hoy</span>
            <span className={s.resumenValor}>{fmt(resumen.hoy.total)}</span>
            <span className={s.resumenSub}>{resumen.hoy.cantidad} registro{resumen.hoy.cantidad !== 1 ? "s" : ""}</span>
          </div>
          <div className={s.resumenCard}>
            <span className={s.resumenLabel}>Gastos del mes</span>
            <span className={`${s.resumenValor} ${s.resumenRojo}`}>{fmt(resumen.mes.total)}</span>
            <span className={s.resumenSub}>{resumen.mes.cantidad} registro{resumen.mes.cantidad !== 1 ? "s" : ""}</span>
          </div>
          <div className={`${s.resumenCard} ${s.resumenCardTipos}`}>
            <span className={s.resumenLabel}>Top tipos este mes</span>
            {resumen.porTipo.length === 0 ? (
              <span className={s.sinDato}>Sin datos</span>
            ) : (
              <div className={s.tiposList}>
                {resumen.porTipo.slice(0, 3).map((t, i) => (
                  <div key={i} className={s.tipoItem}>
                    <span className={s.tipoNombre}>{t.tipo}</span>
                    <span className={s.tipoMonto}>{fmt(t.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar por concepto o tipo..."
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
          <select className={s.select} value={tipoFiltro} onChange={e => handleTipoFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            {tiposExistentes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {hayFiltros && (
            <button className={s.limpiarBtn} onClick={limpiarFiltros}>
              <ion-icon name="close-circle-outline" />
              Limpiar
            </button>
          )}
          <span className={s.conteo}>{total} gasto{total !== 1 ? "s" : ""}</span>
          <button
            className={s.nuevaBtn}
            onClick={() => setModal({ tipo: "crear" })}
            disabled={!cajaAbierta}
            title={!cajaAbierta ? "Debes tener una caja abierta" : ""}
          >
            <ion-icon name="add-outline" />
            Nuevo gasto
          </button>
        </div>
      </div>

      <div className={s.tabla}>
        <div className={s.tablaHeader}>
          <div className={s.colConcepto}>Concepto</div>
          <div className={s.colTipo}>Tipo</div>
          <div className={s.colUsuario}>Registrado por</div>
          <div className={s.colFecha}>Fecha</div>
          <div className={s.colHora}>Hora</div>
          <div className={s.colMonto}>Monto</div>
          <div className={s.colAcciones}></div>
        </div>

        <div className={s.tablaBody}>
          {cargando ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className={s.skeletonRow}>
                <div className={s.skeletonCell} style={{ width: "28%" }} />
                <div className={s.skeletonCell} style={{ width: "12%" }} />
                <div className={s.skeletonCell} style={{ width: "16%" }} />
                <div className={s.skeletonCell} style={{ width: "12%" }} />
                <div className={s.skeletonCell} style={{ width: "8%" }} />
                <div className={s.skeletonCell} style={{ width: "12%" }} />
              </div>
            ))
          ) : gastos.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="trending-down-outline" />
              <p>{hayFiltros ? "Sin resultados con los filtros aplicados" : "No hay gastos registrados"}</p>
              {hayFiltros && (
                <button className={s.limpiarFiltroEmpty} onClick={limpiarFiltros}>Limpiar filtros</button>
              )}
            </div>
          ) : gastos.map((g, idx) => (
            <div key={g.id} className={`${s.fila} ${idx % 2 === 1 ? s.filaAlterna : ""}`}>
              <div className={s.colConcepto}>
                <div className={s.conceptoWrap}>
                  <div className={s.conceptoIcono}><ion-icon name="trending-down-outline" /></div>
                  <span className={s.conceptoText}>{g.concepto}</span>
                </div>
              </div>
              <div className={s.colTipo}>
                {g.tipo
                  ? <span className={s.tipoTag}>{g.tipo}</span>
                  : <span className={s.sinDato}>—</span>
                }
              </div>
              <div className={s.colUsuario}>
                <span className={s.usuarioText}>{g.usuario?.nombre_completo ?? "—"}</span>
              </div>
              <div className={s.colFecha}>
                <span className={s.fechaText}>{fmtFecha(g.created_at)}</span>
              </div>
              <div className={s.colHora}>
                <span className={s.horaText}>{fmtHora(g.created_at)}</span>
              </div>
              <div className={s.colMonto}>
                <span className={s.montoText}>{fmt(g.monto)}</span>
              </div>
              <div className={s.colAcciones}>
                <button className={s.accionBtn} title="Editar" onClick={() => setModal({ tipo: "editar", gasto: g })}>
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={`${s.accionBtn} ${s.accionEliminar}`} title="Eliminar" onClick={() => setConfirmEliminar(g)}>
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
              <span key={`dots-${i}`} className={s.paginaDots}>...</span>
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
        <ModalGasto
          inicial={modal.tipo === "editar" ? modal.gasto : null}
          onClose={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
            getResumenGastos(EMPRESA_ID).then(r => setResumen(r))
            getTiposGasto(EMPRESA_ID).then(t => setTiposExistentes(t))
          }}
          mostrarAlerta={mostrarAlerta}
          tiposExistentes={tiposExistentes}
        />
      )}

      {confirmEliminar && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setConfirmEliminar(null)}>
          <div className={s.modalConfirm}>
            <div className={s.confirmIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.confirmTitle}>Eliminar gasto?</div>
            <p className={s.confirmDesc}>
              Se eliminara el gasto <strong>{confirmEliminar.concepto}</strong> de <strong>{fmt(confirmEliminar.monto)}</strong>. Esta accion no se puede deshacer.
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