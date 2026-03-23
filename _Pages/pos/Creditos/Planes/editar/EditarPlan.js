"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./EditarPlan.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

const OPCION_VACIA = { meses: "", tasa_anual_pct: "0", inicial_pct: "0", tipo: "credito" }

function Toggle({ checked, onChange, label }) {
  return (
    <label className={s.toggle}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={s.toggleSlider} />
      <span className={s.toggleLabel}>{label}</span>
    </label>
  )
}

export default function EditarPlan({ id }) {
  const router  = useRouter()
  const planId  = Number(id)

  const [empresaId, setEmpresaId] = useState(null)
  const [form, setForm]           = useState(null)
  const [opcionForm, setOpcionForm] = useState(OPCION_VACIA)
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState("")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  useEffect(() => {
    if (!empresaId) return
    const cargar = async () => {
      setCargando(true)
      try {
        const res  = await apiFetch(`/api/pos/creditos/planes/${empresaId}/${planId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Plan no encontrado")
        setForm({
          nombre:                     data.nombre,
          codigo:                     data.codigo                     ?? "",
          descripcion:                data.descripcion                ?? "",
          mora_pct:                   String(data.mora_pct),
          dias_gracia:                String(data.dias_gracia),
          descuento_anticipado_pct:   String(data.descuento_anticipado_pct),
          cuotas_minimas_anticipadas: String(data.cuotas_minimas_anticipadas),
          requiere_fiador:            Boolean(data.requiere_fiador),
          permite_anticipado:         Boolean(data.permite_anticipado),
          opciones:                   data.opciones ?? [],
        })
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [empresaId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Opciones ──────────────────────────────────────────────────────────────

  const agregarOpcion = async () => {
    if (!opcionForm.meses || Number(opcionForm.meses) < 1) {
      setError("Los meses deben ser mayor a 0"); return
    }
    const existe = form.opciones.some(
      o => Number(o.meses) === Number(opcionForm.meses) && o.tipo === opcionForm.tipo
    )
    if (existe) { setError("Ya existe un plazo con esos meses y tipo"); return }
    setError("")
    try {
      const res = await fetch(
        `${API}/api/pos/creditos/planes/${empresaId}/${planId}/opciones`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meses:          Number(opcionForm.meses),
            tasa_anual_pct: Number(opcionForm.tasa_anual_pct),
            inicial_pct:    Number(opcionForm.inicial_pct),
            tipo:           opcionForm.tipo,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al agregar")
      setForm(f => ({
        ...f,
        opciones: [...f.opciones, data].sort((a, b) => a.meses - b.meses),
      }))
      setOpcionForm(OPCION_VACIA)
    } catch (e) { setError(e.message) }
  }

  const eliminarOpcion = async (opcionId) => {
    try {
      await fetch(
        `${API}/api/pos/creditos/planes/${empresaId}/${planId}/opciones/${opcionId}`,
        { method: "DELETE" }
      )
      setForm(f => ({ ...f, opciones: f.opciones.filter(o => o.id !== opcionId) }))
    } catch (e) { setError(e.message) }
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  const guardar = async () => {
    setError("")
    if (!form.nombre.trim()) { setError("El nombre del plan es requerido"); return }
    setGuardando(true)
    try {
      const res = await fetch(
        `${API}/api/pos/creditos/planes/${empresaId}/${planId}`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre:                     form.nombre.trim(),
            codigo:                     form.codigo?.trim()      || null,
            descripcion:                form.descripcion?.trim() || null,
            mora_pct:                   Number(form.mora_pct),
            dias_gracia:                Number(form.dias_gracia),
            descuento_anticipado_pct:   Number(form.descuento_anticipado_pct),
            cuotas_minimas_anticipadas: Number(form.cuotas_minimas_anticipadas),
            requiere_fiador:            form.requiere_fiador,
            permite_anticipado:         form.permite_anticipado,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al guardar")
      router.push("/pos/creditos/planes")
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonBar} />
      <div className={s.skeletonLayout}>
        <div className={s.col}>
          {[...Array(3)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
        </div>
        <div className={s.skeletonCard} style={{ height: 320 }} />
      </div>
    </div>
  )

  if (!form) return (
    <div className={s.page}>
      <div className={s.alertError}>{error || "No se pudo cargar el plan"}</div>
    </div>
  )

  const credito = form.opciones.filter(o => o.tipo === "credito")
  const cash    = form.opciones.filter(o => o.tipo === "cash")

  return (
    <div className={s.page}>

      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push("/pos/creditos/planes")}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Editar plan</h1>
          <span className={s.subtitulo}>{form.nombre}</span>
        </div>
        <button className={s.btnGuardar} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {error && <div className={s.alertError}>{error}</div>}

      <div className={s.layout}>

        {/* ── Col izquierda ── */}
        <div className={s.col}>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="document-text-outline" />
              Información general
            </div>
            <div className={s.grid2}>
              <div className={s.campo}>
                <label>Nombre del plan *</label>
                <input value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              </div>
              <div className={s.campo}>
                <label>Código <span className={s.opc}>(opcional)</span></label>
                <input value={form.codigo} onChange={e => set("codigo", e.target.value)} />
              </div>
            </div>
            <div className={s.campo}>
              <label>Descripción <span className={s.opc}>(opcional)</span></label>
              <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={3} />
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="alert-circle-outline" />
              Mora y gracia
            </div>
            <div className={s.grid2}>
              <div className={s.campo}>
                <label>Porcentaje de mora</label>
                <div className={s.inputSuf}>
                  <input type="number" min="0" step="0.01" value={form.mora_pct} onChange={e => set("mora_pct", e.target.value)} />
                  <span>%</span>
                </div>
                <span className={s.hint}>Se aplica sobre la cuota vencida</span>
              </div>
              <div className={s.campo}>
                <label>Días de gracia</label>
                <div className={s.inputSuf}>
                  <input type="number" min="0" value={form.dias_gracia} onChange={e => set("dias_gracia", e.target.value)} />
                  <span>días</span>
                </div>
                <span className={s.hint}>Días antes de aplicar mora</span>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="flash-outline" />
              Pago anticipado
            </div>
            <Toggle
              checked={form.permite_anticipado}
              onChange={v => set("permite_anticipado", v)}
              label="Permitir pago anticipado en este plan"
            />
            {form.permite_anticipado && (
              <div className={s.grid2}>
                <div className={s.campo}>
                  <label>Descuento por pago anticipado</label>
                  <div className={s.inputSuf}>
                    <input type="number" min="0" step="0.01" value={form.descuento_anticipado_pct} onChange={e => set("descuento_anticipado_pct", e.target.value)} />
                    <span>%</span>
                  </div>
                </div>
                <div className={s.campo}>
                  <label>Cuotas mínimas antes de anticipar</label>
                  <input type="number" min="0" value={form.cuotas_minimas_anticipadas} onChange={e => set("cuotas_minimas_anticipadas", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="settings-outline" />
              Condiciones adicionales
            </div>
            <Toggle
              checked={form.requiere_fiador}
              onChange={v => set("requiere_fiador", v)}
              label="Requiere fiador para contratos bajo este plan"
            />
          </div>

        </div>

        {/* ── Col derecha: opciones ── */}
        <div className={s.col}>
          <div className={s.card}>
            <div className={s.cardTitulo}>
              <ion-icon name="time-outline" />
              Opciones de plazo
              <span className={s.cardBadge}>{form.opciones.length}</span>
            </div>
            <p className={s.cardDesc}>
              Los cambios en plazos se guardan inmediatamente al agregar o eliminar.
            </p>

            {form.opciones.length === 0 && (
              <div className={s.opcionesVacia}>No hay plazos configurados aún</div>
            )}

            {credito.length > 0 && (
              <div className={s.opcionGrupo}>
                <span className={s.opcionGrupoLbl}>Crédito</span>
                {credito.map(op => (
                  <div key={op.id} className={s.opcionItem}>
                    <div className={s.opcionInfo}>
                      <span className={s.opcionMeses}>{op.meses} meses</span>
                      <span className={s.dot} />
                      <span className={s.opcionTasa}>{Number(op.tasa_anual_pct).toFixed(2)}% anual</span>
                      {Number(op.inicial_pct) > 0 && (
                        <><span className={s.dot} /><span className={s.opcionInicial}>{Number(op.inicial_pct).toFixed(2)}% inicial</span></>
                      )}
                    </div>
                    <button className={s.opcionDel} onClick={() => eliminarOpcion(op.id)}>
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
                  <div key={op.id} className={s.opcionItem}>
                    <div className={s.opcionInfo}>
                      <span className={s.opcionMeses}>{op.meses} meses</span>
                      {Number(op.inicial_pct) > 0 && (
                        <><span className={s.dot} /><span className={s.opcionInicial}>{Number(op.inicial_pct).toFixed(2)}% inicial</span></>
                      )}
                    </div>
                    <button className={s.opcionDel} onClick={() => eliminarOpcion(op.id)}>
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
                  <input type="number" min="1" value={opcionForm.meses} onChange={e => setOpcionForm(f => ({ ...f, meses: e.target.value }))} placeholder="12" />
                </div>
                <div className={s.campo}>
                  <label>Tasa anual %</label>
                  <div className={s.inputSuf}>
                    <input type="number" min="0" step="0.01" value={opcionForm.tasa_anual_pct} onChange={e => setOpcionForm(f => ({ ...f, tasa_anual_pct: e.target.value }))} />
                    <span>%</span>
                  </div>
                </div>
                <div className={s.campo}>
                  <label>Inicial %</label>
                  <div className={s.inputSuf}>
                    <input type="number" min="0" step="0.01" value={opcionForm.inicial_pct} onChange={e => setOpcionForm(f => ({ ...f, inicial_pct: e.target.value }))} />
                    <span>%</span>
                  </div>
                </div>
                <div className={s.campo}>
                  <label>Tipo</label>
                  <select value={opcionForm.tipo} onChange={e => setOpcionForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="credito">Crédito</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              <button className={s.btnAgregar} onClick={agregarOpcion} disabled={!opcionForm.meses}>
                <ion-icon name="add-outline" /> Agregar plazo
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}