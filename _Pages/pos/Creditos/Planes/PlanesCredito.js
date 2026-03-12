"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./PlanesCredito.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const FORM_VACIO = {
  nombre: "", codigo: "", descripcion: "",
  mora_pct: "5", dias_gracia: "5",
  descuento_anticipado_pct: "0", cuotas_minimas_anticipadas: "0",
  monto_minimo: "0", monto_maximo: "",
  requiere_fiador: false, permite_anticipado: true, activo: true,
  opciones: [],
}

const OPCION_VACIA = { meses: "", tasa_anual_pct: "0", inicial_pct: "0", tipo: "credito" }

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function getPlanes(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${empresaId}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function crearPlan(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarPlan(id, data) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function eliminarPlan(id) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}`, { method: "DELETE" })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function toggleActivoPlan(id, activo) {
  try {
    const res = await fetch(`${API}/api/pos/creditos/planes/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function PlanesCredito() {
  const router = useRouter()
  const [empresaId,   setEmpresaId]   = useState(null)
  const [planes,      setPlanes]      = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [alerta,      setAlerta]      = useState(null)
  const [procesando,  setProcesando]  = useState(false)
  const [modal,       setModal]       = useState(null)
  const [form,        setForm]        = useState(FORM_VACIO)
  const [modalElim,   setModalElim]   = useState(null)
  const [expandido,   setExpandido]   = useState(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    setPlanes(await getPlanes(empresaId))
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function abrirCrear() {
    setForm(FORM_VACIO)
    setModal("crear")
  }

  function abrirEditar(p) {
    setForm({
      nombre:                     p.nombre ?? "",
      codigo:                     p.codigo ?? "",
      descripcion:                p.descripcion ?? "",
      mora_pct:                   String(p.mora_pct ?? "5"),
      dias_gracia:                String(p.dias_gracia ?? "5"),
      descuento_anticipado_pct:   String(p.descuento_anticipado_pct ?? "0"),
      cuotas_minimas_anticipadas: String(p.cuotas_minimas_anticipadas ?? "0"),
      monto_minimo:               String(p.monto_minimo ?? "0"),
      monto_maximo:               p.monto_maximo ? String(p.monto_maximo) : "",
      requiere_fiador:            p.requiere_fiador ?? false,
      permite_anticipado:         p.permite_anticipado ?? true,
      activo:                     p.activo ?? true,
      opciones: (p.opciones ?? []).map(o => ({
        meses:          String(o.meses),
        tasa_anual_pct: String(o.tasa_anual_pct ?? "0"),
        inicial_pct:    String(o.inicial_pct ?? "0"),
        tipo:           o.tipo ?? "credito",
      })),
    })
    setModal({ tipo: "editar", id: p.id })
  }

  function agregarOpcion() {
    setF("opciones", [...form.opciones, { ...OPCION_VACIA }])
  }

  function setOpcion(i, k, v) {
    setF("opciones", form.opciones.map((o, idx) => idx === i ? { ...o, [k]: v } : o))
  }

  function quitarOpcion(i) {
    setF("opciones", form.opciones.filter((_, idx) => idx !== i))
  }

  async function handleGuardar() {
    if (!empresaId) return
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (form.opciones.length === 0) return mostrarAlerta("error", "Agrega al menos una opcion de plazo")
    for (const o of form.opciones) {
      if (!o.meses || Number(o.meses) <= 0) return mostrarAlerta("error", "Todos los plazos deben tener meses validos")
    }
    setProcesando(true)
    const payload = {
      ...form,
      mora_pct:                   Number(form.mora_pct),
      dias_gracia:                Number(form.dias_gracia),
      descuento_anticipado_pct:   Number(form.descuento_anticipado_pct),
      cuotas_minimas_anticipadas: Number(form.cuotas_minimas_anticipadas),
      monto_minimo:               Number(form.monto_minimo),
      monto_maximo:               form.monto_maximo ? Number(form.monto_maximo) : null,
      opciones: form.opciones.map(o => ({
        meses:          Number(o.meses),
        tasa_anual_pct: Number(o.tasa_anual_pct),
        inicial_pct:    Number(o.inicial_pct),
        tipo:           o.tipo,
      })),
    }
    const res = modal === "crear"
      ? await crearPlan(empresaId, payload)
      : await editarPlan(modal.id, payload)
    setProcesando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", modal === "crear" ? "Plan creado" : "Plan actualizado")
    setModal(null)
    cargar()
  }

  async function handleToggle(plan) {
    const res = await toggleActivoPlan(plan.id, !plan.activo)
    if (res?.error) return mostrarAlerta("error", res.error)
    setPlanes(prev => prev.map(p => p.id === plan.id ? { ...p, activo: !plan.activo } : p))
  }

  async function handleEliminar() {
    if (!modalElim) return
    setProcesando(true)
    const res = await eliminarPlan(modalElim.id)
    setProcesando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Plan eliminado")
    setModalElim(null)
    cargar()
  }

  const activos   = planes.filter(p => p.activo).length
  const inactivos = planes.filter(p => !p.activo).length

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.planesGrid}>
        {[...Array(3)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
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
        <div className={s.topStats}>
          <span className={s.statItem}><strong>{planes.length}</strong> planes</span>
          <span className={s.statDot} />
          <span className={s.statItem}><strong className={s.verde}>{activos}</strong> activos</span>
          {inactivos > 0 && <>
            <span className={s.statDot} />
            <span className={s.statItem}><strong className={s.gris}>{inactivos}</strong> inactivos</span>
          </>}
        </div>
        <button className={s.btnNuevo} onClick={abrirCrear}>
          <ion-icon name="add-outline" /> Nuevo plan
        </button>
      </div>

      {planes.length === 0 ? (
        <div className={s.empty}>
          <ion-icon name="document-text-outline" />
          <p>No hay planes de credito creados</p>
          <button className={s.btnNuevo} onClick={abrirCrear}>
            <ion-icon name="add-outline" /> Crear primer plan
          </button>
        </div>
      ) : (
        <div className={s.planesGrid}>
          {planes.map(plan => (
            <div key={plan.id} className={`${s.planCard} ${!plan.activo ? s.planInactivo : ""}`}>
              <div className={s.planHeader}>
                <div className={s.planTituloWrap}>
                  <div className={s.planNombre}>{plan.nombre}</div>
                  {plan.codigo && <span className={s.planCodigo}>{plan.codigo}</span>}
                </div>
                <div className={s.planAcciones}>
                  <button
                    className={`${s.toggleBtn} ${plan.activo ? s.toggleOn : ""}`}
                    onClick={() => handleToggle(plan)}
                    title={plan.activo ? "Desactivar" : "Activar"}
                  >
                    <span className={s.toggleThumb} />
                  </button>
                  <button className={s.btnIcono} onClick={() => abrirEditar(plan)}>
                    <ion-icon name="pencil-outline" />
                  </button>
                  <button
                    className={`${s.btnIcono} ${s.btnDel}`}
                    onClick={() => setModalElim(plan)}
                    disabled={plan._count?.contratos > 0}
                    title={plan._count?.contratos > 0 ? "Tiene contratos asociados" : "Eliminar"}
                  >
                    <ion-icon name="trash-outline" />
                  </button>
                </div>
              </div>

              {plan.descripcion && <p className={s.planDesc}>{plan.descripcion}</p>}

              <div className={s.planMetas}>
                <div className={s.planMeta}>
                  <ion-icon name="trending-up-outline" />
                  <span>Mora: <strong>{plan.mora_pct}%</strong></span>
                </div>
                <div className={s.planMeta}>
                  <ion-icon name="time-outline" />
                  <span>Gracia: <strong>{plan.dias_gracia}d</strong></span>
                </div>
                {plan.requiere_fiador && (
                  <div className={s.planMeta}>
                    <ion-icon name="person-add-outline" />
                    <span>Requiere fiador</span>
                  </div>
                )}
                {plan.permite_anticipado && (
                  <div className={s.planMeta}>
                    <ion-icon name="flash-outline" />
                    <span>Pago anticipado</span>
                  </div>
                )}
                {plan._count?.contratos > 0 && (
                  <div className={s.planMeta}>
                    <ion-icon name="document-text-outline" />
                    <span><strong>{plan._count.contratos}</strong> contratos</span>
                  </div>
                )}
              </div>

              {plan.monto_minimo > 0 || plan.monto_maximo ? (
                <div className={s.planRango}>
                  <ion-icon name="cash-outline" />
                  <span>
                    {plan.monto_minimo > 0 ? fmt(plan.monto_minimo) : "Sin minimo"}
                    {" — "}
                    {plan.monto_maximo ? fmt(plan.monto_maximo) : "Sin maximo"}
                  </span>
                </div>
              ) : null}

              <div className={s.opcionesWrap}>
                <button
                  className={s.opcionesToggle}
                  onClick={() => setExpandido(expandido === plan.id ? null : plan.id)}
                >
                  <ion-icon name={expandido === plan.id ? "chevron-up-outline" : "chevron-down-outline"} />
                  {plan.opciones?.length ?? 0} opcion{plan.opciones?.length !== 1 ? "es" : ""} de plazo
                </button>

                {expandido === plan.id && (
                  <div className={s.opcionesList}>
                    <div className={s.opcionesHead}>
                      <span>Plazo</span>
                      <span>Tasa anual</span>
                      <span>Inicial</span>
                      <span>Tipo</span>
                    </div>
                    {plan.opciones?.map((o, i) => (
                      <div key={i} className={s.opcionRow}>
                        <span className={s.opcionMeses}>{o.meses} meses</span>
                        <span>{Number(o.tasa_anual_pct)}%</span>
                        <span>{Number(o.inicial_pct)}%</span>
                        <span className={`${s.opcionTipo} ${o.tipo === "cash" ? s.tipoCash : s.tipoCredito}`}>
                          {o.tipo === "cash" ? "Contado" : "Credito"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModal(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="document-text-outline" />
              {modal === "crear" ? "Nuevo plan de credito" : "Editar plan"}
            </div>

            <div className={s.modalScroll}>
              <div className={s.seccion}>
                <div className={s.seccionLabel}>Informacion basica</div>
                <div className={s.modalGrid}>
                  <div className={`${s.field} ${s.spanFull}`}>
                    <label>Nombre *</label>
                    <input className={s.input} value={form.nombre} onChange={e => setF("nombre", e.target.value)} placeholder="Ej: Plan Estandar" autoFocus />
                  </div>
                  <div className={s.field}>
                    <label>Codigo</label>
                    <input className={s.input} value={form.codigo} onChange={e => setF("codigo", e.target.value)} placeholder="Ej: PLN-01" />
                  </div>
                  <div className={`${s.field} ${s.spanFull}`}>
                    <label>Descripcion</label>
                    <input className={s.input} value={form.descripcion} onChange={e => setF("descripcion", e.target.value)} placeholder="Descripcion opcional" />
                  </div>
                </div>
              </div>

              <div className={s.seccion}>
                <div className={s.seccionLabel}>Condiciones</div>
                <div className={s.modalGrid}>
                  <div className={s.field}>
                    <label>% Mora</label>
                    <div className={s.inputSufijo}>
                      <input className={s.input} type="number" min="0" step="0.01" value={form.mora_pct} onChange={e => setF("mora_pct", e.target.value)} />
                      <span>%</span>
                    </div>
                  </div>
                  <div className={s.field}>
                    <label>Dias de gracia</label>
                    <input className={s.input} type="number" min="0" value={form.dias_gracia} onChange={e => setF("dias_gracia", e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label>Monto minimo</label>
                    <input className={s.input} type="number" min="0" value={form.monto_minimo} onChange={e => setF("monto_minimo", e.target.value)} placeholder="0" />
                  </div>
                  <div className={s.field}>
                    <label>Monto maximo</label>
                    <input className={s.input} type="number" min="0" value={form.monto_maximo} onChange={e => setF("monto_maximo", e.target.value)} placeholder="Sin limite" />
                  </div>
                  <div className={s.field}>
                    <label>% Descuento anticipado</label>
                    <div className={s.inputSufijo}>
                      <input className={s.input} type="number" min="0" step="0.01" value={form.descuento_anticipado_pct} onChange={e => setF("descuento_anticipado_pct", e.target.value)} />
                      <span>%</span>
                    </div>
                  </div>
                  <div className={s.field}>
                    <label>Cuotas min. anticipadas</label>
                    <input className={s.input} type="number" min="0" value={form.cuotas_minimas_anticipadas} onChange={e => setF("cuotas_minimas_anticipadas", e.target.value)} />
                  </div>
                </div>

                <div className={s.checksRow}>
                  <label className={s.checkLabel}>
                    <input type="checkbox" checked={form.requiere_fiador} onChange={e => setF("requiere_fiador", e.target.checked)} />
                    Requiere fiador
                  </label>
                  <label className={s.checkLabel}>
                    <input type="checkbox" checked={form.permite_anticipado} onChange={e => setF("permite_anticipado", e.target.checked)} />
                    Permite pago anticipado
                  </label>
                  <label className={s.checkLabel}>
                    <input type="checkbox" checked={form.activo} onChange={e => setF("activo", e.target.checked)} />
                    Plan activo
                  </label>
                </div>
              </div>

              <div className={s.seccion}>
                <div className={s.seccionLabelRow}>
                  <span className={s.seccionLabel}>Opciones de plazo *</span>
                  <button className={s.btnAgregarOpcion} onClick={agregarOpcion}>
                    <ion-icon name="add-outline" /> Agregar plazo
                  </button>
                </div>

                {form.opciones.length === 0 ? (
                  <div className={s.opcionesEmpty}>
                    Agrega al menos un plazo para este plan
                  </div>
                ) : (
                  <div className={s.opcionesEditor}>
                    <div className={s.opcionesEditorHead}>
                      <span>Meses</span>
                      <span>Tasa anual %</span>
                      <span>Inicial %</span>
                      <span>Tipo</span>
                      <span />
                    </div>
                    {form.opciones.map((o, i) => (
                      <div key={i} className={s.opcionEditorRow}>
                        <input
                          className={s.inputSm}
                          type="number" min="1"
                          placeholder="12"
                          value={o.meses}
                          onChange={e => setOpcion(i, "meses", e.target.value)}
                        />
                        <input
                          className={s.inputSm}
                          type="number" min="0" step="0.01"
                          placeholder="0"
                          value={o.tasa_anual_pct}
                          onChange={e => setOpcion(i, "tasa_anual_pct", e.target.value)}
                        />
                        <input
                          className={s.inputSm}
                          type="number" min="0" step="0.01"
                          placeholder="0"
                          value={o.inicial_pct}
                          onChange={e => setOpcion(i, "inicial_pct", e.target.value)}
                        />
                        <select
                          className={s.inputSm}
                          value={o.tipo}
                          onChange={e => setOpcion(i, "tipo", e.target.value)}
                        >
                          <option value="credito">Credito</option>
                          <option value="cash">Contado</option>
                        </select>
                        <button className={s.btnQuitarOpcion} onClick={() => quitarOpcion(i)}>
                          <ion-icon name="close-outline" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={s.modalFooter}>
              <button className={s.btnSecundario} onClick={() => setModal(null)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleGuardar} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : modal === "crear" ? "Crear plan" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalElim && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalElim(null)}>
          <div className={s.modalElim}>
            <div className={s.elimIcono}><ion-icon name="warning-outline" /></div>
            <div className={s.elimTitulo}>Eliminar plan</div>
            <div className={s.elimSub}>
              Seguro que deseas eliminar <strong>{modalElim.nombre}</strong>? Esta accion no se puede deshacer.
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecundario} onClick={() => setModalElim(null)}>Cancelar</button>
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