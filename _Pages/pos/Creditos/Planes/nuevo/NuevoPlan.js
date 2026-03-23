"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./NuevoPlan.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

// ─── Paso 1: info general ─────────────────────────────────────────────────────
function PasoInfo({ form, set }) {
  return (
    <div className={s.pasoBody}>
      <div className={s.grid2}>
        <div className={s.campo}>
          <label>Nombre del plan *</label>
          <input
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Ej: Plan Estándar"
            autoFocus
          />
        </div>
        <div className={s.campo}>
          <label>Código <span className={s.opc}>(opcional)</span></label>
          <input
            value={form.codigo}
            onChange={e => set("codigo", e.target.value)}
            placeholder="Ej: EST-01"
          />
        </div>
      </div>
      <div className={s.campo}>
        <label>Descripción <span className={s.opc}>(opcional)</span></label>
        <textarea
          value={form.descripcion}
          onChange={e => set("descripcion", e.target.value)}
          rows={3}
          placeholder="Describe brevemente el uso o condiciones de este plan..."
        />
      </div>
    </div>
  )
}

// ─── Paso 2: mora y anticipado ────────────────────────────────────────────────
function PasoCondiciones({ form, set }) {
  return (
    <div className={s.pasoBody}>
      <div className={s.seccionLabel}>Mora</div>
      <div className={s.grid2}>
        <div className={s.campo}>
          <label>Porcentaje de mora</label>
          <div className={s.inputSuf}>
            <input
              type="number" min="0" step="0.01"
              value={form.mora_pct}
              onChange={e => set("mora_pct", e.target.value)}
            />
            <span>%</span>
          </div>
          <span className={s.hint}>Se aplica sobre la cuota vencida</span>
        </div>
        <div className={s.campo}>
          <label>Días de gracia</label>
          <div className={s.inputSuf}>
            <input
              type="number" min="0"
              value={form.dias_gracia}
              onChange={e => set("dias_gracia", e.target.value)}
            />
            <span>días</span>
          </div>
          <span className={s.hint}>Días antes de aplicar mora</span>
        </div>
      </div>

      <div className={s.separador} />
      <div className={s.seccionLabel}>Pago anticipado</div>

      <label className={s.toggle}>
        <input
          type="checkbox"
          checked={form.permite_anticipado}
          onChange={e => set("permite_anticipado", e.target.checked)}
        />
        <span className={s.toggleSlider} />
        <span className={s.toggleLabel}>Permitir pago anticipado en este plan</span>
      </label>

      {form.permite_anticipado && (
        <div className={s.grid2}>
          <div className={s.campo}>
            <label>Descuento por pago anticipado</label>
            <div className={s.inputSuf}>
              <input
                type="number" min="0" step="0.01"
                value={form.descuento_anticipado_pct}
                onChange={e => set("descuento_anticipado_pct", e.target.value)}
              />
              <span>%</span>
            </div>
          </div>
          <div className={s.campo}>
            <label>Cuotas mínimas antes de anticipar</label>
            <input
              type="number" min="0"
              value={form.cuotas_minimas_anticipadas}
              onChange={e => set("cuotas_minimas_anticipadas", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className={s.separador} />
      <div className={s.seccionLabel}>Fiador</div>

      <label className={s.toggle}>
        <input
          type="checkbox"
          checked={form.requiere_fiador}
          onChange={e => set("requiere_fiador", e.target.checked)}
        />
        <span className={s.toggleSlider} />
        <span className={s.toggleLabel}>Requiere fiador para contratos bajo este plan</span>
      </label>
    </div>
  )
}

// ─── Paso 3: opciones de plazo ────────────────────────────────────────────────
const OPCION_VACIA = { meses: "", tasa_anual_pct: "0", inicial_pct: "0", tipo: "credito" }

function PasoOpciones({ form, setForm, setError }) {
  const [op, setOp] = useState(OPCION_VACIA)

  const agregar = () => {
    if (!op.meses || Number(op.meses) < 1) { setError("Los meses deben ser mayor a 0"); return }
    const existe = form.opciones.some(o => Number(o.meses) === Number(op.meses) && o.tipo === op.tipo)
    if (existe) { setError("Ya existe un plazo con esos meses y tipo"); return }
    setError("")
    setForm(f => ({
      ...f,
      opciones: [...f.opciones, { ...op, _id: Date.now() }]
        .sort((a, b) => a.meses - b.meses),
    }))
    setOp(OPCION_VACIA)
  }

  const quitar = id =>
    setForm(f => ({ ...f, opciones: f.opciones.filter(o => (o._id ?? o.id) !== id) }))

  const credito = form.opciones.filter(o => o.tipo === "credito")
  const cash    = form.opciones.filter(o => o.tipo === "cash")

  return (
    <div className={s.pasoBody}>
      <p className={s.pasoDesc}>
        Define los plazos de referencia. En el contrato se ajustarán los montos reales.
      </p>

      {form.opciones.length === 0 && (
        <div className={s.opcionesVacia}>No has agregado plazos aún</div>
      )}

      {credito.length > 0 && (
        <div className={s.opcionGrupo}>
          <span className={s.opcionGrupoLbl}>Crédito</span>
          {credito.map(op => (
            <div key={op._id ?? op.id} className={s.opcionItem}>
              <div className={s.opcionInfo}>
                <span className={s.opcionMeses}>{op.meses} meses</span>
                <span className={s.dot} />
                <span className={s.opcionTasa}>{Number(op.tasa_anual_pct).toFixed(2)}% anual</span>
                {Number(op.inicial_pct) > 0 && (
                  <><span className={s.dot} /><span className={s.opcionInicial}>{Number(op.inicial_pct).toFixed(2)}% inicial</span></>
                )}
              </div>
              <button className={s.opcionDel} onClick={() => quitar(op._id ?? op.id)}>
                <ion-icon name="trash-outline" />
              </button>
            </div>
          ))}
        </div>
      )}

      {cash.length > 0 && (
        <div className={s.opcionGrupo}>
          <span className={s.opcionGrupoLbl}>Cash</span>
          {cash.map(op => (
            <div key={op._id ?? op.id} className={s.opcionItem}>
              <div className={s.opcionInfo}>
                <span className={s.opcionMeses}>{op.meses} meses</span>
                {Number(op.inicial_pct) > 0 && (
                  <><span className={s.dot} /><span className={s.opcionInicial}>{Number(op.inicial_pct).toFixed(2)}% inicial</span></>
                )}
              </div>
              <button className={s.opcionDel} onClick={() => quitar(op._id ?? op.id)}>
                <ion-icon name="trash-outline" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={s.opcionForm}>
        <span className={s.opcionFormLbl}>Agregar plazo</span>
        <div className={s.opcionFormGrid}>
          <div className={s.campo}>
            <label>Meses</label>
            <input
              type="number" min="1"
              value={op.meses}
              onChange={e => setOp(o => ({ ...o, meses: e.target.value }))}
              placeholder="12"
            />
          </div>
          <div className={s.campo}>
            <label>Tasa anual %</label>
            <div className={s.inputSuf}>
              <input
                type="number" min="0" step="0.01"
                value={op.tasa_anual_pct}
                onChange={e => setOp(o => ({ ...o, tasa_anual_pct: e.target.value }))}
              />
              <span>%</span>
            </div>
          </div>
          <div className={s.campo}>
            <label>Inicial %</label>
            <div className={s.inputSuf}>
              <input
                type="number" min="0" step="0.01"
                value={op.inicial_pct}
                onChange={e => setOp(o => ({ ...o, inicial_pct: e.target.value }))}
              />
              <span>%</span>
            </div>
          </div>
          <div className={s.campo}>
            <label>Tipo</label>
            <select value={op.tipo} onChange={e => setOp(o => ({ ...o, tipo: e.target.value }))}>
              <option value="credito">Crédito</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
        <button
          className={s.btnAgregar}
          onClick={agregar}
          disabled={!op.meses}
        >
          <ion-icon name="add-outline" /> Agregar plazo
        </button>
      </div>
    </div>
  )
}

// ─── Paso 4: resumen ──────────────────────────────────────────────────────────
function PasoResumen({ form }) {
  const pct = n => `${Number(n ?? 0).toFixed(2)}%`
  const credito = form.opciones.filter(o => o.tipo === "credito")
  const cash    = form.opciones.filter(o => o.tipo === "cash")

  return (
    <div className={s.pasoBody}>
      <div className={s.resumenCard}>
        <div className={s.resumenTitulo}>{form.nombre || "—"}</div>
        {form.codigo && <span className={s.resumenCodigo}>{form.codigo}</span>}
        {form.descripcion && <p className={s.resumenDesc}>{form.descripcion}</p>}

        <div className={s.resumenGrid}>
          <div className={s.resumenItem}>
            <span className={s.resumenLbl}>Mora</span>
            <span className={s.resumenVal}>{pct(form.mora_pct)}</span>
          </div>
          <div className={s.resumenItem}>
            <span className={s.resumenLbl}>Días de gracia</span>
            <span className={s.resumenVal}>{form.dias_gracia} días</span>
          </div>
          <div className={s.resumenItem}>
            <span className={s.resumenLbl}>Pago anticipado</span>
            <span className={s.resumenVal}>{form.permite_anticipado ? "Sí" : "No"}</span>
          </div>
          {form.permite_anticipado && (
            <div className={s.resumenItem}>
              <span className={s.resumenLbl}>Desc. anticipado</span>
              <span className={s.resumenVal}>{pct(form.descuento_anticipado_pct)}</span>
            </div>
          )}
          <div className={s.resumenItem}>
            <span className={s.resumenLbl}>Requiere fiador</span>
            <span className={s.resumenVal}>{form.requiere_fiador ? "Sí" : "No"}</span>
          </div>
          <div className={s.resumenItem}>
            <span className={s.resumenLbl}>Plazos definidos</span>
            <span className={s.resumenVal}>{form.opciones.length}</span>
          </div>
        </div>

        {form.opciones.length > 0 && (
          <div className={s.resumenOpciones}>
            {credito.length > 0 && (
              <div className={s.opcionGrupo}>
                <span className={s.opcionGrupoLbl}>Crédito</span>
                <div className={s.chips}>
                  {credito.map(op => (
                    <div key={op._id} className={s.chipCredito}>
                      <span>{op.meses}m</span>
                      <span className={s.chipSep} />
                      <span>{Number(op.tasa_anual_pct).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cash.length > 0 && (
              <div className={s.opcionGrupo}>
                <span className={s.opcionGrupoLbl}>Cash</span>
                <div className={s.chips}>
                  {cash.map(op => (
                    <div key={op._id} className={s.chipCash}>
                      <span>{op.meses}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const PASOS = [
  { key: "info",        label: "Información" },
  { key: "condiciones", label: "Condiciones"  },
  { key: "opciones",    label: "Plazos"       },
  { key: "resumen",     label: "Resumen"      },
]

const FORM_INICIAL = {
  nombre:                     "",
  codigo:                     "",
  descripcion:                "",
  mora_pct:                   "5",
  dias_gracia:                "5",
  descuento_anticipado_pct:   "0",
  cuotas_minimas_anticipadas: "0",
  monto_minimo:               "0",
  monto_maximo:               "",
  requiere_fiador:            false,
  permite_anticipado:         true,
  opciones:                   [],
}

export default function NuevoPlan() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [form, setForm]           = useState(FORM_INICIAL)
  const [paso, setPaso]           = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState("")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validarPaso = () => {
    if (paso === 0 && !form.nombre.trim()) {
      setError("El nombre del plan es requerido")
      return false
    }
    setError("")
    return true
  }

  const siguiente = () => {
    if (!validarPaso()) return
    setPaso(p => Math.min(p + 1, PASOS.length - 1))
  }

  const anterior = () => {
    setError("")
    setPaso(p => Math.max(p - 1, 0))
  }

  const guardar = async () => {
    setError(""); setGuardando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/planes/${empresaId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:                     form.nombre.trim(),
          codigo:                     form.codigo?.trim()      || null,
          descripcion:                form.descripcion?.trim() || null,
          mora_pct:                   Number(form.mora_pct),
          dias_gracia:                Number(form.dias_gracia),
          descuento_anticipado_pct:   Number(form.descuento_anticipado_pct),
          cuotas_minimas_anticipadas: Number(form.cuotas_minimas_anticipadas),
          monto_minimo:               Number(form.monto_minimo),
          monto_maximo:               form.monto_maximo !== "" ? Number(form.monto_maximo) : null,
          requiere_fiador:            form.requiere_fiador,
          permite_anticipado:         form.permite_anticipado,
          opciones: form.opciones.map(o => ({
            meses:          Number(o.meses),
            tasa_anual_pct: Number(o.tasa_anual_pct),
            inicial_pct:    Number(o.inicial_pct),
            tipo:           o.tipo,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al guardar")
      router.push("/pos/creditos/planes")
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const esFinal = paso === PASOS.length - 1

  return (
    <div className={s.page}>

      {/* Top bar */}
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push("/pos/creditos/planes")}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Nuevo plan de crédito</h1>
          <span className={s.subtitulo}>Define la plantilla base que se usará en los contratos</span>
        </div>
      </div>

      {/* Stepper */}
      <div className={s.stepper}>
        {PASOS.map((p, i) => (
          <div key={p.key} className={s.stepWrap}>
            <div className={`${s.step} ${i < paso ? s.stepDone : ""} ${i === paso ? s.stepActivo : ""}`}>
              {i < paso
                ? <ion-icon name="checkmark-outline" />
                : <span>{i + 1}</span>
              }
            </div>
            <span className={`${s.stepLabel} ${i === paso ? s.stepLabelActivo : ""}`}>{p.label}</span>
            {i < PASOS.length - 1 && <div className={`${s.stepLine} ${i < paso ? s.stepLineDone : ""}`} />}
          </div>
        ))}
      </div>

      {/* Card del paso */}
      <div className={s.card}>
        <div className={s.cardTitulo}>
          {PASOS[paso].label}
        </div>

        {error && <div className={s.alertError}>{error}</div>}

        {paso === 0 && <PasoInfo        form={form} set={set} />}
        {paso === 1 && <PasoCondiciones form={form} set={set} />}
        {paso === 2 && <PasoOpciones    form={form} setForm={setForm} setError={setError} />}
        {paso === 3 && <PasoResumen     form={form} />}

        <div className={s.cardFoot}>
          <button className={s.btnAnterior} onClick={anterior} disabled={paso === 0}>
            <ion-icon name="arrow-back-outline" /> Anterior
          </button>
          {esFinal ? (
            <button className={s.btnGuardar} onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Crear plan"}
            </button>
          ) : (
            <button className={s.btnSiguiente} onClick={siguiente}>
              Siguiente <ion-icon name="arrow-forward-outline" />
            </button>
          )}
        </div>
      </div>

    </div>
  )
}