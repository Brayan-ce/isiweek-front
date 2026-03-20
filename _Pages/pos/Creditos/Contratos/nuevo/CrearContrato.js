"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./CrearContrato.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function makeFmt(simbolo) {
  return (n) =>
    `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(n, dec = 4) {
  return `${Number(n ?? 0).toFixed(dec)}%`
}

const UNIDAD_LABEL_PLURAL = { dias: "días", semanas: "semanas", meses: "meses" }

function plazoADias(valor, unidad) {
  if (unidad === "dias")    return valor
  if (unidad === "semanas") return valor * 7
  return valor * 30
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha + "T00:00:00")
  d.setDate(d.getDate() + dias)
  return d
}

function tasaAnualDesde(tasa, tipo) {
  const t = Number(tasa) / 100
  if (!t) return 0
  if (tipo === "anual")   return t * 100
  if (tipo === "mensual") return (Math.pow(1 + t, 12)  - 1) * 100
  if (tipo === "semanal") return (Math.pow(1 + t, 52)  - 1) * 100
  if (tipo === "diaria")  return (Math.pow(1 + t, 365) - 1) * 100
  return t * 100
}

function tasaPeriodo(tasaAnualPct, unidad) {
  if (!tasaAnualPct) return 0
  const a = tasaAnualPct / 100
  if (unidad === "meses")   return (Math.pow(1 + a, 1 / 12)  - 1) * 100
  if (unidad === "semanas") return (Math.pow(1 + a, 1 / 52)  - 1) * 100
  if (unidad === "dias")    return (Math.pow(1 + a, 1 / 365) - 1) * 100
  return tasaAnualPct
}

function calcularSimulacion(montoFin, tasaAnualPct, numCuotas, unidad) {
  if (!montoFin || !numCuotas) return null
  const tp = tasaPeriodo(tasaAnualPct, unidad) / 100

  let cuotaBase
  if (tp === 0) {
    cuotaBase = montoFin / numCuotas
  } else {
    cuotaBase =
      (montoFin * tp * Math.pow(1 + tp, numCuotas)) /
      (Math.pow(1 + tp, numCuotas) - 1)
  }
  cuotaBase = Math.round(cuotaBase * 100) / 100

  const cuotas = []
  let saldo = montoFin
  let totalPagado = 0

  for (let i = 1; i <= numCuotas; i++) {
    const interes = Math.round(saldo * tp * 100) / 100
    let   capital = Math.round((cuotaBase - interes) * 100) / 100
    if (i === numCuotas) capital = Math.round(saldo * 100) / 100
    const monto = Math.round((capital + interes) * 100) / 100
    saldo       = Math.round((saldo - capital) * 100) / 100
    totalPagado += monto
    cuotas.push({ numero: i, cuota: monto, capital, interes, saldo: Math.max(0, saldo) })
  }

  return {
    cuotaBase,
    numCuotas,
    totalIntereses: Math.round((totalPagado - montoFin) * 100) / 100,
    totalPagar:     Math.round(totalPagado * 100) / 100,
    cuotas,
    tasaPeriodoPct: tasaPeriodo(tasaAnualPct, unidad),
  }
}

function calcularFechasVenc(fechaInicio, plazoValor, plazoUnidad, numCuotas) {
  if (!fechaInicio || !plazoValor || !numCuotas) return []
  const diasTotales    = plazoADias(plazoValor, plazoUnidad)
  const intervaloDias  = diasTotales / numCuotas
  const fechas = []
  for (let i = 1; i <= numCuotas; i++) {
    const f = sumarDias(fechaInicio, Math.round(intervaloDias * i))
    fechas.push(f.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }))
  }
  return fechas
}

function autoNumCuotas(plazoValor, plazoUnidad) {
  if (!plazoValor) return ""
  return plazoValor
}

const PASOS = [
  { key: "cliente", label: "Cliente" },
  { key: "plan",    label: "Plan"    },
  { key: "montos",  label: "Montos"  },
  { key: "extras",  label: "Extras"  },
  { key: "resumen", label: "Resumen" },
]

const FORM_INICIAL = {
  cliente_id:          "",
  plan_id:             "",
  opcion_id:           "",
  monto_total:         "",
  monto_inicial:       "",
  fecha_inicio:        new Date().toISOString().split("T")[0],
  notas:               "",
  fiadores:            [],
  activos:             [],
  plazo_valor_manual:  "",
  plazo_unidad_manual: "meses",
  tipo_manual:         "credito",
  tasa_valor:          "0",
  tasa_tipo:           "anual",
  num_cuotas_manual:   "",
}

const FIADOR_VACIO = { nombre: "", cedula: "", telefono: "", email: "", direccion: "" }
const ACTIVO_VACIO = { nombre: "", descripcion: "", serial: "", valor: "" }

function PasoCliente({ form, set, clientes }) {
  const [q, setQ] = useState("")
  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (c.cedula_rnc ?? "").includes(q) ||
    (c.telefono ?? "").includes(q)
  )
  const seleccionado = clientes.find(c => c.id === Number(form.cliente_id))

  return (
    <div className={s.pasoBody}>
      <div className={s.campo}>
        <label>Buscar cliente</label>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, cédula o teléfono..." autoFocus />
        </div>
      </div>
      <div className={s.clienteLista}>
        {filtrados.slice(0, 8).map(c => (
          <div
            key={c.id}
            className={`${s.clienteItem} ${form.cliente_id === c.id ? s.clienteSeleccionado : ""}`}
            onClick={() => set("cliente_id", c.id)}
          >
            <div className={s.clienteAvatar}>{c.nombre.charAt(0).toUpperCase()}</div>
            <div className={s.clienteInfo}>
              <span className={s.clienteNombre}>{c.nombre}</span>
              <span className={s.clienteMeta}>
                {[c.cedula_rnc, c.telefono].filter(Boolean).join(" · ") || "Sin datos adicionales"}
              </span>
            </div>
            {form.cliente_id === c.id && <ion-icon name="checkmark-circle" />}
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className={s.listaVacia}><ion-icon name="person-outline" /><p>Sin resultados</p></div>
        )}
      </div>
      {seleccionado && (
        <div className={s.seleccionadoTag}>
          <ion-icon name="checkmark-circle-outline" />
          Cliente seleccionado: <strong>{seleccionado.nombre}</strong>
        </div>
      )}
    </div>
  )
}

function PasoPlan({ form, set, planes }) {
  const planSeleccionado = planes.find(p => p.id === Number(form.plan_id))
  const opciones         = planSeleccionado?.opciones ?? []
  const credito          = opciones.filter(o => o.tipo === "credito")
  const cash             = opciones.filter(o => o.tipo === "cash")
  const tieneOpciones    = opciones.length > 0
  const opcionSeleccionada = opciones.find(o => o.id === Number(form.opcion_id))

  return (
    <div className={s.pasoBody}>
      <div className={s.planLista}>
        {planes.map(p => (
          <div
            key={p.id}
            className={`${s.planItem} ${form.plan_id === p.id ? s.planSeleccionado : ""} ${!p.activo ? s.planDisabled : ""}`}
            onClick={() => { if (p.activo) { set("plan_id", p.id); set("opcion_id", "") } }}
          >
            <div className={s.planItemHead}>
              <span className={s.planItemNombre}>{p.nombre}</span>
              {p.codigo && <span className={s.planItemCodigo}>{p.codigo}</span>}
              {form.plan_id === p.id && <ion-icon name="checkmark-circle" />}
            </div>
            <div className={s.planItemMeta}>
              <span>{Number(p.mora_pct).toFixed(2)}% mora</span>
              <span>·</span>
              <span>{p.dias_gracia}d gracia</span>
              <span>·</span>
              <span>{p.opciones?.length ?? 0} plazos</span>
            </div>
          </div>
        ))}
        {planes.length === 0 && (
          <div className={s.listaVacia}><ion-icon name="document-text-outline" /><p>No hay planes activos</p></div>
        )}
      </div>

      {planSeleccionado && tieneOpciones && (
        <>
          <div className={s.opcionesLabel}>Selecciona el plazo <span className={s.opc}>(opcional)</span></div>

          {!opcionSeleccionada && (
            <div className={s.sinOpcionesBanner}>
              <ion-icon name="information-circle-outline" />
              <span>Si no seleccionas un plazo predefinido, podrás configurarlo manualmente en el siguiente paso. Recomendado solo si ya conoces las condiciones exactas del contrato.</span>
            </div>
          )}

          {credito.length > 0 && (
            <div className={s.opcionGrupoWrap}>
              <span className={s.opcionGrupoLbl}>Crédito</span>
              <div className={s.opcionLista}>
                {credito.map(op => (
                  <div
                    key={op.id}
                    className={`${s.opcionItem} ${form.opcion_id === op.id ? s.opcionSeleccionada : ""}`}
                    onClick={() => set("opcion_id", form.opcion_id === op.id ? "" : op.id)}
                  >
                    <span className={s.opcionMeses}>{op.plazo_valor} {UNIDAD_LABEL_PLURAL[op.plazo_unidad]}</span>
                    <span className={s.opcionTasa}>{Number(op.tasa_anual_pct).toFixed(2)}% anual</span>
                    {Number(op.inicial_pct) > 0 && (
                      <span className={s.opcionInicial}>{Number(op.inicial_pct).toFixed(2)}% inicial</span>
                    )}
                    {form.opcion_id === op.id && <ion-icon name="checkmark-circle" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {cash.length > 0 && (
            <div className={s.opcionGrupoWrap}>
              <span className={s.opcionGrupoLbl}>Cash</span>
              <div className={s.opcionLista}>
                {cash.map(op => (
                  <div
                    key={op.id}
                    className={`${s.opcionItem} ${s.opcionCash} ${form.opcion_id === op.id ? s.opcionSeleccionada : ""}`}
                    onClick={() => set("opcion_id", form.opcion_id === op.id ? "" : op.id)}
                  >
                    <span className={s.opcionMeses}>{op.plazo_valor} {UNIDAD_LABEL_PLURAL[op.plazo_unidad]}</span>
                    <span className={s.opcionTipoBadge}>cash</span>
                    {form.opcion_id === op.id && <ion-icon name="checkmark-circle" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {opcionSeleccionada && (
            <div className={s.opcionSeleccionadaTag}>
              <ion-icon name="checkmark-circle-outline" />
              Plazo seleccionado: <strong>{opcionSeleccionada.plazo_valor} {UNIDAD_LABEL_PLURAL[opcionSeleccionada.plazo_unidad]}</strong> — {Number(opcionSeleccionada.tasa_anual_pct).toFixed(2)}% anual
            </div>
          )}
        </>
      )}

      {planSeleccionado && !tieneOpciones && (
        <div className={s.sinOpcionesBanner}>
          <ion-icon name="information-circle-outline" />
          <span>Este plan no tiene plazos predefinidos. Configura el plazo en el paso de Montos.</span>
        </div>
      )}
    </div>
  )
}

function TasaInput({ form, set }) {
  const [tooltip, setTooltip] = useState(false)

  const tasaAnual    = tasaAnualDesde(form.tasa_valor, form.tasa_tipo)
  const tasaDiaria   = tasaPeriodo(tasaAnual, "dias")
  const tasaSemanal  = tasaPeriodo(tasaAnual, "semanas")
  const tasaMensual  = tasaPeriodo(tasaAnual, "meses")

  const hayTasa = Number(form.tasa_valor) > 0

  return (
    <div className={s.tasaWrap}>
      <div className={s.tasaHeader}>
        <label>Tasa de interés</label>
        <button type="button" className={s.tasaTooltipBtn} onClick={() => setTooltip(v => !v)}>
          <ion-icon name={tooltip ? "close-circle-outline" : "help-circle-outline"} />
        </button>
      </div>

      {tooltip && (
        <div className={s.tasaTooltip}>
          <p>Ingresa la tasa en el período que prefieras. El sistema la convierte automáticamente.</p>
          <p>Ej: 15% anual = 1.17% mensual = 0.27% semanal = 0.038% diario</p>
        </div>
      )}

      <div className={s.tasaInputRow}>
        <input
          className={s.tasaNumero}
          type="number" min="0" step="0.0001"
          value={form.tasa_valor}
          onChange={e => set("tasa_valor", e.target.value)}
          placeholder="0"
        />
        <div className={s.tasaDivider} />
        <select
          className={s.tasaTipoSelect}
          value={form.tasa_tipo}
          onChange={e => set("tasa_tipo", e.target.value)}
        >
          <option value="anual">% anual</option>
          <option value="mensual">% mensual</option>
          <option value="semanal">% semanal</option>
          <option value="diaria">% diaria</option>
        </select>
      </div>

      {hayTasa && (
        <div className={s.tasaEquivalencias}>
          <span className={s.tasaEquivTitulo}>Equivalencias</span>
          <div className={s.tasaEquivGrid}>
            {form.tasa_tipo !== "diaria" && (
              <div className={s.tasaEquivItem}>
                <span className={s.tasaEquivLbl}>Diaria</span>
                <span className={s.tasaEquivVal}>{fmtPct(tasaDiaria, 4)}</span>
              </div>
            )}
            {form.tasa_tipo !== "semanal" && (
              <div className={s.tasaEquivItem}>
                <span className={s.tasaEquivLbl}>Semanal</span>
                <span className={s.tasaEquivVal}>{fmtPct(tasaSemanal, 4)}</span>
              </div>
            )}
            {form.tasa_tipo !== "mensual" && (
              <div className={s.tasaEquivItem}>
                <span className={s.tasaEquivLbl}>Mensual</span>
                <span className={s.tasaEquivVal}>{fmtPct(tasaMensual, 2)}</span>
              </div>
            )}
            {form.tasa_tipo !== "anual" && (
              <div className={s.tasaEquivItem}>
                <span className={s.tasaEquivLbl}>Anual equiv.</span>
                <span className={`${s.tasaEquivVal} ${s.tasaEquivAnual}`}>{fmtPct(tasaAnual, 2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PasoMontos({ form, set, planes, simbolo }) {
  const fmt = makeFmt(simbolo)

  const planSeleccionado   = planes.find(p => p.id === Number(form.plan_id))
  const opcionSeleccionada = planSeleccionado?.opciones?.find(o => o.id === Number(form.opcion_id))
  const usandoOpcion       = !!opcionSeleccionada

  const plazoValor  = Number(opcionSeleccionada?.plazo_valor  ?? form.plazo_valor_manual  ?? 0)
  const plazoUnidad = opcionSeleccionada?.plazo_unidad ?? form.plazo_unidad_manual ?? "meses"
  const tipo        = opcionSeleccionada?.tipo ?? form.tipo_manual ?? "credito"

  const tasaAnualPct = opcionSeleccionada
    ? Number(opcionSeleccionada.tasa_anual_pct)
    : tasaAnualDesde(form.tasa_valor, form.tasa_tipo)

  const tasaDelPeriodoPct = tasaPeriodo(tasaAnualPct, plazoUnidad)
  const labelPeriodo = { dias: "diaria", semanas: "semanal", meses: "mensual" }

  const autoNC = autoNumCuotas(plazoValor, plazoUnidad)
  const numCuotas = Number(form.num_cuotas_manual || autoNC || 0)

  const montoTotal   = Number(form.monto_total   || 0)
  const montoInicial = Number(form.monto_inicial || 0)
  const montoFin     = montoTotal - montoInicial

  const inicialSugerido = opcionSeleccionada && Number(opcionSeleccionada.inicial_pct) > 0 && montoTotal > 0
    ? Math.round(montoTotal * Number(opcionSeleccionada.inicial_pct) / 100 * 100) / 100
    : null

  const sim = montoFin > 0 && numCuotas > 0
    ? calcularSimulacion(montoFin, tasaAnualPct, numCuotas, plazoUnidad)
    : null

  const fechas = sim && form.fecha_inicio
    ? calcularFechasVenc(form.fecha_inicio, plazoValor, plazoUnidad, numCuotas)
    : []

  const onChangePlazoValor = (v) => {
    set("plazo_valor_manual", v)
    if (!form.num_cuotas_manual) {
      set("num_cuotas_manual", autoNumCuotas(Number(v), plazoUnidad).toString())
    }
  }

  const onChangePlazoUnidad = (v) => {
    set("plazo_unidad_manual", v)
    if (!form.num_cuotas_manual) {
      set("num_cuotas_manual", autoNumCuotas(Number(form.plazo_valor_manual), v).toString())
    }
  }

  const mostrarConfigManual = !usandoOpcion

  return (
    <div className={s.pasoBody}>
      {mostrarConfigManual && (
        <div className={s.plazoManualCard}>
          <span className={s.plazoManualTitulo}>Configurar plazo manualmente</span>
          <div className={s.grid3}>
            <div className={s.campo}>
              <label>Duración total</label>
              <input
                type="number" min="1"
                value={form.plazo_valor_manual}
                onChange={e => onChangePlazoValor(e.target.value)}
                placeholder="15"
                autoFocus
              />
            </div>
            <div className={s.campo}>
              <label>Unidad</label>
              <select value={form.plazo_unidad_manual} onChange={e => onChangePlazoUnidad(e.target.value)}>
                <option value="dias">Días</option>
                <option value="semanas">Semanas</option>
                <option value="meses">Meses</option>
              </select>
            </div>
            <div className={s.campo}>
              <label>Tipo</label>
              <select value={form.tipo_manual} onChange={e => set("tipo_manual", e.target.value)}>
                <option value="credito">Crédito</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div className={s.grid2}>
            <div className={s.campo}>
              <label>
                Número de cuotas
                {autoNC && Number(form.num_cuotas_manual) !== autoNC && (
                  <button
                    type="button"
                    className={s.btnSugerido}
                    onClick={() => set("num_cuotas_manual", String(autoNC))}
                  >
                    Auto: {autoNC}
                  </button>
                )}
              </label>
              <input
                type="number" min="1"
                value={form.num_cuotas_manual}
                onChange={e => set("num_cuotas_manual", e.target.value)}
                placeholder={String(autoNC || "")}
              />
              <span className={s.hint}>
                {plazoValor && numCuotas
                  ? `1 cuota cada ${Math.round(plazoADias(plazoValor, plazoUnidad) / numCuotas)} días aprox.`
                  : "Define la duración para calcular"}
              </span>
            </div>

            {tipo === "credito" && (
              <TasaInput form={form} set={set} />
            )}
          </div>
        </div>
      )}

      {usandoOpcion && (
        <div className={s.opcionSeleccionadaTag}>
          <ion-icon name="checkmark-circle-outline" />
          Usando plazo del plan: <strong>{opcionSeleccionada.plazo_valor} {UNIDAD_LABEL_PLURAL[opcionSeleccionada.plazo_unidad]}</strong> — {Number(opcionSeleccionada.tasa_anual_pct).toFixed(2)}% anual
        </div>
      )}

      <div className={s.grid2}>
        <div className={s.campo}>
          <label>Monto total del contrato *</label>
          <div className={s.inputPrefijo}>
            <span>{simbolo}</span>
            <input
              type="number" min="0" step="0.01"
              value={form.monto_total}
              onChange={e => set("monto_total", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className={s.campo}>
          <label>
            Inicial / entrada
            {inicialSugerido && (
              <button className={s.btnSugerido} type="button" onClick={() => set("monto_inicial", String(inicialSugerido))}>
                Sugerido: {fmt(inicialSugerido)}
              </button>
            )}
          </label>
          <div className={s.inputPrefijo}>
            <span>{simbolo}</span>
            <input
              type="number" min="0" step="0.01"
              value={form.monto_inicial}
              onChange={e => set("monto_inicial", e.target.value)}
              placeholder="Sin entrada"
            />
          </div>
          {(!form.monto_inicial || form.monto_inicial === "0") && (
            <span className={s.hint}>Dejando vacío se financia el monto total</span>
          )}
        </div>
        <div className={s.campo}>
          <label>Fecha de inicio *</label>
          <input type="date" value={form.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)} />
        </div>
        <div className={s.campo}>
          <label>Notas <span className={s.opc}>(opcional)</span></label>
          <input value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Observaciones..." />
        </div>
      </div>

      {sim && (
        <div className={s.simulacion}>
          <div className={s.simHeader}>
            <span className={s.simTitulo}>Simulación de pagos</span>
            <div className={s.simBadges}>
              <span className={s.simBadge}>{numCuotas} cuotas</span>
              {tipo === "credito" && tasaAnualPct > 0 && (
                <span className={s.simBadge}>
                  {fmtPct(tasaDelPeriodoPct, 4)} {labelPeriodo[plazoUnidad]}
                  <span className={s.simBadgeAnual}> ({fmtPct(tasaAnualPct, 2)} anual)</span>
                </span>
              )}
              <span className={`${s.simBadge} ${tipo === "cash" ? s.simBadgeCash : s.simBadgeCredito}`}>{tipo}</span>
            </div>
          </div>

          <div className={s.simResumen}>
            <div className={s.simResumenItem}>
              <span className={s.simLbl}>A financiar</span>
              <span className={s.simVal}>{fmt(montoFin)}</span>
            </div>
            <div className={s.simResumenItem}>
              <span className={s.simLbl}>Cuota c/período</span>
              <span className={`${s.simVal} ${s.simValDestacado}`}>{fmt(sim.cuotaBase)}</span>
            </div>
            <div className={s.simResumenItem}>
              <span className={s.simLbl}>Total intereses</span>
              <span className={s.simVal}>{fmt(sim.totalIntereses)}</span>
            </div>
            <div className={s.simResumenItem}>
              <span className={s.simLbl}>Total a pagar</span>
              <span className={`${s.simVal} ${s.simValTotal}`}>{fmt(sim.totalPagar)}</span>
            </div>
          </div>

          <div className={s.tablaWrap}>
            <div className={s.tablaScroll}>
              <table className={s.tabla}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vencimiento</th>
                    <th>Cuota</th>
                    <th>Capital</th>
                    {tipo === "credito" && <th>Interés</th>}
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.cuotas.map((f, idx) => (
                    <tr key={f.numero}>
                      <td>{f.numero}</td>
                      <td>{fechas[idx] ?? "—"}</td>
                      <td className={s.tdCuota}>{fmt(f.cuota)}</td>
                      <td>{fmt(f.capital)}</td>
                      {tipo === "credito" && <td className={s.tdInteres}>{fmt(f.interes)}</td>}
                      <td>{fmt(f.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PasoExtras({ form, setForm, planes, fmt }) {
  const [fiadorForm, setFiadorForm] = useState(FIADOR_VACIO)
  const [activoForm, setActivoForm] = useState(ACTIVO_VACIO)
  const planSeleccionado = planes.find(p => p.id === Number(form.plan_id))

  const agregarFiador = () => {
    if (!fiadorForm.nombre.trim()) return
    setForm(f => ({ ...f, fiadores: [...f.fiadores, { ...fiadorForm, _id: Date.now() }] }))
    setFiadorForm(FIADOR_VACIO)
  }
  const quitarFiador = id => setForm(f => ({ ...f, fiadores: f.fiadores.filter(x => x._id !== id) }))

  const agregarActivo = () => {
    if (!activoForm.nombre.trim()) return
    setForm(f => ({ ...f, activos: [...f.activos, { ...activoForm, _id: Date.now() }] }))
    setActivoForm(ACTIVO_VACIO)
  }
  const quitarActivo = id => setForm(f => ({ ...f, activos: f.activos.filter(x => x._id !== id) }))

  return (
    <div className={s.pasoBody}>
      {planSeleccionado && (
        <div className={s.planInfoBanner}>
          <span className={s.planInfoTitulo}>Condiciones del plan: {planSeleccionado.nombre}</span>
          <div className={s.planInfoGrid}>
            <div className={`${s.planInfoItem} ${planSeleccionado.requiere_fiador ? s.planInfoDestacado : ""}`}>
              <ion-icon name={planSeleccionado.requiere_fiador ? "shield-checkmark-outline" : "shield-outline"} />
              <span>{planSeleccionado.requiere_fiador ? "Requiere fiador" : "No requiere fiador"}</span>
            </div>
            <div className={`${s.planInfoItem} ${planSeleccionado.permite_anticipado ? s.planInfoPositivo : ""}`}>
              <ion-icon name={planSeleccionado.permite_anticipado ? "flash-outline" : "flash-off-outline"} />
              <span>{planSeleccionado.permite_anticipado ? "Pago anticipado permitido" : "Sin pago anticipado"}</span>
            </div>
            <div className={s.planInfoItem}>
              <ion-icon name="alert-circle-outline" />
              <span>{planSeleccionado.mora_pct}% mora · {planSeleccionado.dias_gracia}d gracia</span>
            </div>
            {planSeleccionado.permite_anticipado && Number(planSeleccionado.descuento_anticipado_pct) > 0 && (
              <div className={s.planInfoItem}>
                <ion-icon name="pricetag-outline" />
                <span>{planSeleccionado.descuento_anticipado_pct}% descuento anticipado</span>
              </div>
            )}
          </div>
          <p className={s.planInfoNota}>El contrato es independiente del plan. Puedes agregar fiadores y activos aunque el plan no lo requiera.</p>
        </div>
      )}

      <div className={s.extraSeccion}>
        <div className={s.extraSeccionHead}>
          <span className={s.extraTitulo}>Fiadores</span>
          <span className={s.extraBadge}>{form.fiadores.length}</span>
        </div>
        {form.fiadores.map(f => (
          <div key={f._id} className={s.extraItem}>
            <div className={s.extraItemInfo}>
              <span className={s.extraItemNombre}>{f.nombre}</span>
              {f.cedula   && <span className={s.extraItemMeta}>{f.cedula}</span>}
              {f.telefono && <span className={s.extraItemMeta}>{f.telefono}</span>}
            </div>
            <button className={s.extraDel} onClick={() => quitarFiador(f._id)}><ion-icon name="trash-outline" /></button>
          </div>
        ))}
        <div className={s.extraForm}>
          <span className={s.extraFormLbl}>Agregar fiador</span>
          <div className={s.grid2}>
            <div className={s.campo}><label>Nombre *</label><input value={fiadorForm.nombre} onChange={e => setFiadorForm(f => ({ ...f, nombre: e.target.value }))} /></div>
            <div className={s.campo}><label>Cédula</label><input value={fiadorForm.cedula} onChange={e => setFiadorForm(f => ({ ...f, cedula: e.target.value }))} /></div>
            <div className={s.campo}><label>Teléfono</label><input value={fiadorForm.telefono} onChange={e => setFiadorForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            <div className={s.campo}><label>Email</label><input value={fiadorForm.email} onChange={e => setFiadorForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className={s.campo}><label>Dirección</label><input value={fiadorForm.direccion} onChange={e => setFiadorForm(f => ({ ...f, direccion: e.target.value }))} /></div>
          <button className={s.btnAgregar} onClick={agregarFiador} disabled={!fiadorForm.nombre.trim()}>
            <ion-icon name="add-outline" /> Agregar fiador
          </button>
        </div>
      </div>

      <div className={s.extraSeccion}>
        <div className={s.extraSeccionHead}>
          <span className={s.extraTitulo}>Activos / Garantías</span>
          <span className={s.extraBadge}>{form.activos.length}</span>
        </div>
        {form.activos.map(a => (
          <div key={a._id} className={s.extraItem}>
            <div className={s.extraItemInfo}>
              <span className={s.extraItemNombre}>{a.nombre}</span>
              {a.serial && <span className={s.extraItemMeta}>S/N: {a.serial}</span>}
              {a.valor  && <span className={s.extraItemMeta}>{fmt(a.valor)}</span>}
            </div>
            <button className={s.extraDel} onClick={() => quitarActivo(a._id)}><ion-icon name="trash-outline" /></button>
          </div>
        ))}
        <div className={s.extraForm}>
          <span className={s.extraFormLbl}>Agregar activo</span>
          <div className={s.grid2}>
            <div className={s.campo}><label>Nombre *</label><input value={activoForm.nombre} onChange={e => setActivoForm(a => ({ ...a, nombre: e.target.value }))} /></div>
            <div className={s.campo}><label>Serial</label><input value={activoForm.serial} onChange={e => setActivoForm(a => ({ ...a, serial: e.target.value }))} /></div>
            <div className={s.campo}><label>Valor</label><input type="number" min="0" value={activoForm.valor} onChange={e => setActivoForm(a => ({ ...a, valor: e.target.value }))} /></div>
            <div className={s.campo}><label>Descripción</label><input value={activoForm.descripcion} onChange={e => setActivoForm(a => ({ ...a, descripcion: e.target.value }))} /></div>
          </div>
          <button className={s.btnAgregar} onClick={agregarActivo} disabled={!activoForm.nombre.trim()}>
            <ion-icon name="add-outline" /> Agregar activo
          </button>
        </div>
      </div>
    </div>
  )
}

function PasoResumen({ form, clientes, planes, fmt, simbolo }) {
  const cliente            = clientes.find(c => c.id === Number(form.cliente_id))
  const plan               = planes.find(p => p.id === Number(form.plan_id))
  const opcion             = plan?.opciones?.find(o => o.id === Number(form.opcion_id))

  const plazoValor  = Number(opcion?.plazo_valor  ?? form.plazo_valor_manual  ?? 0)
  const plazoUnidad = opcion?.plazo_unidad ?? form.plazo_unidad_manual ?? "meses"
  const tipo        = opcion?.tipo ?? form.tipo_manual ?? "credito"

  const tasaAnualPct = opcion
    ? Number(opcion.tasa_anual_pct)
    : tasaAnualDesde(form.tasa_valor, form.tasa_tipo)

  const tasaDelPeriodoPct = tasaPeriodo(tasaAnualPct, plazoUnidad)
  const labelPeriodo = { dias: "diaria", semanas: "semanal", meses: "mensual" }

  const autoNC    = autoNumCuotas(plazoValor, plazoUnidad)
  const numCuotas = Number(form.num_cuotas_manual || autoNC || 0)

  const montoTotal   = Number(form.monto_total   || 0)
  const montoInicial = Number(form.monto_inicial || 0)
  const montoFin     = montoTotal - montoInicial

  const sim = montoFin > 0 && numCuotas > 0
    ? calcularSimulacion(montoFin, tasaAnualPct, numCuotas, plazoUnidad)
    : null

  const fechaFin = form.fecha_inicio && plazoValor
    ? sumarDias(form.fecha_inicio, plazoADias(plazoValor, plazoUnidad))
        .toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })
    : "—"

  const fechaInicioFmt = form.fecha_inicio
    ? new Date(form.fecha_inicio + "T00:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })
    : "—"

  return (
    <div className={s.pasoBody}>
      <div className={s.resumenHero}>
        <div className={s.resumenHeroLeft}>
          <div className={s.resumenHeroAvatar}>{cliente?.nombre?.charAt(0).toUpperCase() ?? "?"}</div>
          <div>
            <div className={s.resumenHeroNombre}>{cliente?.nombre ?? "—"}</div>
            {cliente?.cedula_rnc && <div className={s.resumenHeroMeta}>{cliente.cedula_rnc}</div>}
            {cliente?.telefono   && <div className={s.resumenHeroMeta}>{cliente.telefono}</div>}
          </div>
        </div>
        <span className={`${s.resumenTipoBadge} ${tipo === "cash" ? s.badgeCash : s.badgeCredito}`}>{tipo}</span>
      </div>

      <div className={s.resumenMontosRow}>
        <div className={s.resumenMontoCard}>
          <span className={s.resumenMontoLbl}>Monto total</span>
          <span className={s.resumenMontoVal}>{fmt(montoTotal)}</span>
        </div>
        <div className={s.resumenMontoCard}>
          <span className={s.resumenMontoLbl}>Entrada</span>
          <span className={s.resumenMontoVal}>{montoInicial > 0 ? fmt(montoInicial) : "Sin entrada"}</span>
        </div>
        <div className={s.resumenMontoCard}>
          <span className={s.resumenMontoLbl}>A financiar</span>
          <span className={s.resumenMontoVal}>{fmt(montoFin)}</span>
        </div>
        <div className={`${s.resumenMontoCard} ${s.resumenMontoDestacado}`}>
          <span className={s.resumenMontoLbl}>Cuota c/período</span>
          <span className={s.resumenMontoVal}>{sim ? fmt(sim.cuotaBase) : "—"}</span>
        </div>
      </div>

      <div className={s.resumenGrid}>
        <div className={s.resumenSec}>
          <span className={s.resumenSecTitulo}>Plan y condiciones</span>
          <div className={s.resumenRow}><span className={s.resLbl}>Plan</span><span className={s.resVal}>{plan?.nombre ?? "—"}</span></div>
          <div className={s.resumenRow}><span className={s.resLbl}>Plazo total</span><span className={s.resVal}>{plazoValor} {UNIDAD_LABEL_PLURAL[plazoUnidad]}</span></div>
          <div className={s.resumenRow}><span className={s.resLbl}>Cuotas</span><span className={s.resVal}>{numCuotas} pagos</span></div>
          {tipo === "credito" && tasaAnualPct > 0 && (
            <>
              <div className={s.resumenRow}>
                <span className={s.resLbl}>Tasa {labelPeriodo[plazoUnidad]}</span>
                <span className={s.resVal}>
                  {fmtPct(tasaDelPeriodoPct, 4)}
                  <span className={s.resValAnual}> ({fmtPct(tasaAnualPct, 2)} anual)</span>
                </span>
              </div>
              <div className={s.resumenRow}><span className={s.resLbl}>Total intereses</span><span className={s.resVal}>{fmt(sim?.totalIntereses ?? 0)}</span></div>
            </>
          )}
          <div className={s.resumenRow}><span className={s.resLbl}>Total a pagar</span><span className={`${s.resVal} ${s.resValBlue}`}>{fmt(sim?.totalPagar ?? 0)}</span></div>
          <div className={s.resumenRow}><span className={s.resLbl}>Mora</span><span className={s.resVal}>{plan?.mora_pct ?? 0}% · {plan?.dias_gracia ?? 0}d gracia</span></div>
        </div>

        <div className={s.resumenSec}>
          <span className={s.resumenSecTitulo}>Fechas</span>
          <div className={s.resumenRow}><span className={s.resLbl}>Inicio</span><span className={s.resVal}>{fechaInicioFmt}</span></div>
          <div className={s.resumenRow}><span className={s.resLbl}>Fin estimado</span><span className={s.resVal}>{fechaFin}</span></div>
          <div className={s.resumenRow}><span className={s.resLbl}>Moneda</span><span className={s.resVal}>{simbolo}</span></div>
          {form.notas && <div className={s.resumenRow}><span className={s.resLbl}>Notas</span><span className={s.resVal}>{form.notas}</span></div>}
        </div>
      </div>

      {(form.fiadores.length > 0 || form.activos.length > 0) && (
        <div className={s.resumenExtrasRow}>
          {form.fiadores.length > 0 && (
            <div className={s.resumenExtrasSec}>
              <span className={s.resumenSecTitulo}>Fiadores ({form.fiadores.length})</span>
              {form.fiadores.map(f => (
                <div key={f._id} className={s.resumenRow}>
                  <span className={s.resLbl}>{f.nombre}</span>
                  <span className={s.resVal}>{f.cedula || f.telefono || "—"}</span>
                </div>
              ))}
            </div>
          )}
          {form.activos.length > 0 && (
            <div className={s.resumenExtrasSec}>
              <span className={s.resumenSecTitulo}>Activos ({form.activos.length})</span>
              {form.activos.map(a => (
                <div key={a._id} className={s.resumenRow}>
                  <span className={s.resLbl}>{a.nombre}</span>
                  <span className={s.resVal}>{a.valor ? fmt(a.valor) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CrearContrato() {
  const router = useRouter()

  const [payload,   setPayload]   = useState(null)
  const [clientes,  setClientes]  = useState([])
  const [planes,    setPlanes]    = useState([])
  const [simbolo,   setSimbolo]   = useState("RD$")
  const [form,      setForm]      = useState(FORM_INICIAL)
  const [paso,      setPaso]      = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState("")

  const fmt = makeFmt(simbolo)

  useEffect(() => {
    const p = getTokenPayload()
    if (!p) { router.push("/pos/login"); return }
    setPayload(p)
    const cargar = async () => {
      const [rC, rP, rE] = await Promise.all([
        fetch(`${API}/api/pos/clientes/lista/${p.empresa_id}?limite=500`),
        fetch(`${API}/api/pos/creditos/planes/${p.empresa_id}`),
        fetch(`${API}/api/pos/creditos/dashboard/${p.empresa_id}`),
      ])
      if (rC.ok) { const d = await rC.json(); setClientes(d.clientes ?? []) }
      if (rP.ok) setPlanes((await rP.json()).filter(x => x.activo))
      if (rE.ok) {
        const d = await rE.json()
        if (d.moneda?.simbolo) setSimbolo(d.moneda.simbolo)
      }
    }
    cargar()
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validarPaso = () => {
    if (paso === 0 && !form.cliente_id) {
      setError("Selecciona un cliente para continuar"); return false
    }
    if (paso === 1 && !form.plan_id) {
      setError("Selecciona un plan para continuar"); return false
    }
    if (paso === 2) {
      const planSel   = planes.find(p => p.id === Number(form.plan_id))
      const opcionSel = planSel?.opciones?.find(o => o.id === Number(form.opcion_id))
      if (!opcionSel && !form.plazo_valor_manual) {
        setError("Configura la duración del contrato"); return false
      }
      if (!opcionSel && !form.num_cuotas_manual) {
        setError("Define el número de cuotas"); return false
      }
      if (!form.monto_total) {
        setError("Ingresa el monto total del contrato"); return false
      }
      if (Number(form.monto_inicial) >= Number(form.monto_total) && Number(form.monto_inicial) > 0) {
        setError("La entrada no puede ser mayor o igual al monto total"); return false
      }
      if (!form.fecha_inicio) {
        setError("Ingresa la fecha de inicio"); return false
      }
    }
    setError(""); return true
  }

  const siguiente = () => { if (validarPaso()) setPaso(p => Math.min(p + 1, PASOS.length - 1)) }
  const anterior  = () => { setError(""); setPaso(p => Math.max(p - 1, 0)) }

  const guardar = async () => {
    setError(""); setGuardando(true)
    try {
      const planSel   = planes.find(p => p.id === Number(form.plan_id))
      const opcionSel = planSel?.opciones?.find(o => o.id === Number(form.opcion_id))
      const opcionId  = opcionSel ? Number(form.opcion_id) : null

      const tasaAnualFinal = opcionId
        ? undefined
        : tasaAnualDesde(form.tasa_valor, form.tasa_tipo)

      const autoNC    = autoNumCuotas(Number(form.plazo_valor_manual), form.plazo_unidad_manual)
      const numCuotas = Number(form.num_cuotas_manual || autoNC)

      const body = {
        cliente_id:    form.cliente_id,
        plan_id:       form.plan_id,
        opcion_id:     opcionId,
        monto_total:   Number(form.monto_total),
        monto_inicial: Number(form.monto_inicial || 0),
        fecha_inicio:  form.fecha_inicio,
        notas:         form.notas || null,
        usuario_id:    payload.id,
        fiadores:      form.fiadores.map(({ _id, ...f }) => f),
        activos:       form.activos.map(({ _id, ...a }) => ({ ...a, valor: Number(a.valor || 0) })),
        ...(!opcionId && {
          plazo_valor_manual:  Number(form.plazo_valor_manual),
          plazo_unidad_manual: form.plazo_unidad_manual,
          tasa_anual_manual:   tasaAnualFinal,
          tipo_manual:         form.tipo_manual ?? "credito",
          num_cuotas_manual:   numCuotas,
        }),
      }

      const res  = await fetch(`${API}/api/pos/creditos/contratos/${payload.empresa_id}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al crear el contrato")
      router.push("/pos/creditos/contratos")
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const esFinal = paso === PASOS.length - 1

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push("/pos/creditos/contratos")}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Nuevo contrato</h1>
          <span className={s.subtitulo}>Afilia un cliente a un plan de crédito</span>
        </div>
      </div>

      <div className={s.stepper}>
        {PASOS.map((p, i) => (
          <div key={p.key} className={s.stepWrap}>
            <div className={`${s.step} ${i < paso ? s.stepDone : ""} ${i === paso ? s.stepActivo : ""}`}>
              {i < paso ? <ion-icon name="checkmark-outline" /> : <span>{i + 1}</span>}
            </div>
            <span className={`${s.stepLabel} ${i === paso ? s.stepLabelActivo : ""}`}>{p.label}</span>
            {i < PASOS.length - 1 && <div className={`${s.stepLine} ${i < paso ? s.stepLineDone : ""}`} />}
          </div>
        ))}
      </div>

      <div className={s.card}>
        <div className={s.cardTitulo}>{PASOS[paso].label}</div>
        {error && <div className={s.alertError}><ion-icon name="alert-circle-outline" /> {error}</div>}

        {paso === 0 && <PasoCliente form={form} set={set} clientes={clientes} />}
        {paso === 1 && <PasoPlan    form={form} set={set} planes={planes} />}
        {paso === 2 && <PasoMontos  form={form} set={set} planes={planes} simbolo={simbolo} />}
        {paso === 3 && <PasoExtras  form={form} setForm={setForm} planes={planes} fmt={fmt} />}
        {paso === 4 && <PasoResumen form={form} clientes={clientes} planes={planes} fmt={fmt} simbolo={simbolo} />}

        <div className={s.cardFoot}>
          <button className={s.btnAnterior} onClick={anterior} disabled={paso === 0}>
            <ion-icon name="arrow-back-outline" /> Anterior
          </button>
          {esFinal ? (
            <button className={s.btnGuardar} onClick={guardar} disabled={guardando}>
              {guardando ? "Creando contrato..." : "Crear contrato"}
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