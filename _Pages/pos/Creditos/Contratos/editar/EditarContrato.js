"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./EditarContrato.module.css"

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

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADOS = ["activo", "incumplido", "reestructurado", "cancelado"]
const ESTADO_ICON = {
  activo:         "checkmark-circle-outline",
  incumplido:     "alert-circle-outline",
  reestructurado: "refresh-circle-outline",
  cancelado:      "close-circle-outline",
}

const FIADOR_VACIO = { nombre: "", cedula: "", telefono: "", email: "", direccion: "" }
const ACTIVO_VACIO = { nombre: "", descripcion: "", serial: "", valor: "" }

export default function EditarContrato({ id }) {
  const router     = useRouter()
  const contratoId = Number(id)

  const [payload,   setPayload]   = useState(null)
  const [contrato,  setContrato]  = useState(null)
  const [planes,    setPlanes]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState("")
  const [tabActiva, setTabActiva] = useState("general")

  const [estado,   setEstado]   = useState("activo")
  const [notas,    setNotas]    = useState("")
  const [fiadores, setFiadores] = useState([])
  const [activos,  setActivos]  = useState([])

  const [fiadorForm, setFiadorForm] = useState(FIADOR_VACIO)
  const [activoForm, setActivoForm] = useState(ACTIVO_VACIO)

  useEffect(() => {
    const p = getTokenPayload()
    if (!p) { router.push("/pos/login"); return }
    setPayload(p)
  }, [])

  useEffect(() => {
    if (!payload) return
    const cargar = async () => {
      setCargando(true)
      try {
        const [rC, rP] = await Promise.all([
          fetch(`${API}/api/pos/creditos/contratos/${payload.empresa_id}/${contratoId}`),
          fetch(`${API}/api/pos/creditos/planes/${payload.empresa_id}`),
        ])
        const dataC = await rC.json()
        if (!rC.ok) throw new Error(dataC.error ?? "No encontrado")
        setContrato(dataC)
        setEstado(dataC.estado ?? "activo")
        setNotas(dataC.notas ?? "")
        setFiadores((dataC.fiadores ?? []).map(f => ({ ...f, _id: f.id })))
        setActivos((dataC.activos  ?? []).map(a => ({ ...a, _id: a.id })))
        if (rP.ok) setPlanes((await rP.json()).filter(p => p.activo))
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [payload])

  const fmt = makeFmt(contrato?.moneda?.simbolo ?? "RD$")

  const agregarFiador = () => {
    if (!fiadorForm.nombre.trim()) return
    setFiadores(f => [...f, { ...fiadorForm, _id: Date.now(), _nuevo: true }])
    setFiadorForm(FIADOR_VACIO)
  }

  const quitarFiador = _id => setFiadores(f => f.filter(x => x._id !== _id))

  const agregarActivo = () => {
    if (!activoForm.nombre.trim()) return
    setActivos(a => [...a, { ...activoForm, _id: Date.now(), _nuevo: true, valor: Number(activoForm.valor || 0) }])
    setActivoForm(ACTIVO_VACIO)
  }

  const quitarActivo = _id => setActivos(a => a.filter(x => x._id !== _id))

  const guardar = async () => {
    setError(""); setGuardando(true)
    try {
      const res = await fetch(
        `${API}/api/pos/creditos/contratos/${payload.empresa_id}/${contratoId}`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notas,
            estado,
            fiadores: fiadores.map(({ _id, _nuevo, id, ...f }) => ({ ...f, id: _nuevo ? undefined : id })),
            activos:  activos.map(({ _id, _nuevo, id, ...a }) => ({ ...a, id: _nuevo ? undefined : id, valor: Number(a.valor || 0) })),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al guardar")
      router.push(`/pos/creditos/contratos/${contratoId}/ver`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonBar} />
      <div className={s.skeletonBody} />
    </div>
  )

  if (!contrato) return (
    <div className={s.page}>
      <div className={s.alertError}>{error || "No se pudo cargar el contrato"}</div>
    </div>
  )

  const puedeEditar = contrato.estado !== "pagado"

  return (
    <div className={s.page}>

      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.push(`/pos/creditos/contratos/${contratoId}/ver`)}>
          <ion-icon name="arrow-back-outline" />
        </button>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Editar contrato</h1>
          <span className={s.subtitulo}>#{contrato.numero} · {contrato.cliente?.nombre}</span>
        </div>
        {puedeEditar && (
          <button className={s.btnGuardar} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        )}
      </div>

      {error && <div className={s.alertError}><ion-icon name="alert-circle-outline" />{error}</div>}

      {!puedeEditar && (
        <div className={s.alertInfo}>
          <ion-icon name="lock-closed-outline" />
          Este contrato está marcado como pagado y no puede editarse.
        </div>
      )}

      <div className={s.tabs}>
        {["general", "fiadores", "activos"].map(t => (
          <button
            key={t}
            className={`${s.tab} ${tabActiva === t ? s.tabActiva : ""}`}
            onClick={() => setTabActiva(t)}
          >
            <ion-icon name={
              t === "general"  ? "document-text-outline" :
              t === "fiadores" ? "people-outline"        :
              "cube-outline"
            } />
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "fiadores" && fiadores.length > 0 && <span className={s.tabBadge}>{fiadores.length}</span>}
            {t === "activos"  && activos.length  > 0 && <span className={s.tabBadge}>{activos.length}</span>}
          </button>
        ))}
      </div>

      {tabActiva === "general" && (
        <div className={s.layout}>

          <div className={s.card}>
            <div className={s.cardTitulo}><ion-icon name="document-text-outline" />Resumen del contrato</div>
            <div className={s.infoList}>
              <div className={s.infoItem}><span className={s.infoLbl}>Cliente</span><span className={s.infoVal}>{contrato.cliente?.nombre}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Plan</span><span className={s.infoVal}>{contrato.plan?.nombre}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Plazo</span><span className={s.infoVal}>{contrato.plazo_valor} {contrato.plazo_unidad}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Monto total</span><span className={s.infoVal}>{fmt(contrato.monto_total)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Entrada</span><span className={s.infoVal}>{fmt(contrato.monto_inicial)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Financiado</span><span className={s.infoVal}>{fmt(contrato.monto_financiado)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Cuota</span><span className={s.infoVal}>{fmt(contrato.cuota_mensual)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Saldo pendiente</span><span className={s.infoVal}>{fmt(contrato.saldo_pendiente)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Total intereses</span><span className={s.infoVal}>{fmt(contrato.total_intereses)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Total a pagar</span><span className={s.infoVal}>{fmt(contrato.total_pagar)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Fecha inicio</span><span className={s.infoVal}>{fmtFecha(contrato.fecha_inicio)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Fecha fin</span><span className={s.infoVal}>{fmtFecha(contrato.fecha_fin)}</span></div>
              <div className={s.infoItem}><span className={s.infoLbl}>Moneda</span><span className={s.infoVal}>{contrato.moneda?.simbolo ?? "—"}</span></div>
            </div>
            <div className={s.infoNote}>
              <ion-icon name="information-circle-outline" />
              Los montos, fechas y plazos no son editables. Para cambiarlos debes reestructurar el contrato.
            </div>
          </div>

          <div className={s.colEdit}>
            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="flag-outline" />Estado del contrato</div>
              <div className={s.estadoGrid}>
                {ESTADOS.map(e => (
                  <div
                    key={e}
                    className={`${s.estadoOption} ${estado === e ? s.estadoSeleccionado : ""} ${s[`estado_${e}`] ?? ""} ${!puedeEditar ? s.estadoDisabled : ""}`}
                    onClick={() => puedeEditar && setEstado(e)}
                  >
                    <ion-icon name={ESTADO_ICON[e]} />
                    <span>{e.charAt(0).toUpperCase() + e.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardTitulo}><ion-icon name="create-outline" />Notas</div>
              <div className={s.campo}>
                <label>Observaciones del contrato <span className={s.opc}>(opcional)</span></label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={5}
                  disabled={!puedeEditar}
                  placeholder="Escribe observaciones, acuerdos o notas importantes..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tabActiva === "fiadores" && (
        <div className={s.seccionWrap}>
          {fiadores.length === 0 && (
            <div className={s.vacioBanner}>
              <ion-icon name="people-outline" />
              <p>No hay fiadores registrados en este contrato</p>
            </div>
          )}
          {fiadores.map(f => (
            <div key={f._id} className={s.itemCard}>
              <div className={s.itemCardInfo}>
                <div className={s.itemCardAvatar}>{f.nombre.charAt(0).toUpperCase()}</div>
                <div className={s.itemCardTexto}>
                  <span className={s.itemCardNombre}>{f.nombre}</span>
                  <div className={s.itemCardMeta}>
                    {f.cedula   && <span>{f.cedula}</span>}
                    {f.telefono && <span>{f.telefono}</span>}
                    {f.email    && <span>{f.email}</span>}
                  </div>
                  {f.direccion && <span className={s.itemCardDir}>{f.direccion}</span>}
                </div>
              </div>
              {puedeEditar && (
                <button className={s.itemCardDel} onClick={() => quitarFiador(f._id)}>
                  <ion-icon name="trash-outline" />
                </button>
              )}
            </div>
          ))}

          {puedeEditar && (
            <div className={s.formularioCard}>
              <span className={s.formularioTitulo}>Agregar fiador</span>
              <div className={s.grid2}>
                <div className={s.campo}><label>Nombre *</label><input value={fiadorForm.nombre} onChange={e => setFiadorForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" /></div>
                <div className={s.campo}><label>Cédula</label><input value={fiadorForm.cedula} onChange={e => setFiadorForm(f => ({ ...f, cedula: e.target.value }))} /></div>
                <div className={s.campo}><label>Teléfono</label><input value={fiadorForm.telefono} onChange={e => setFiadorForm(f => ({ ...f, telefono: e.target.value }))} /></div>
                <div className={s.campo}><label>Email</label><input value={fiadorForm.email} onChange={e => setFiadorForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className={s.campo}><label>Dirección</label><input value={fiadorForm.direccion} onChange={e => setFiadorForm(f => ({ ...f, direccion: e.target.value }))} /></div>
              <button className={s.btnAgregar} onClick={agregarFiador} disabled={!fiadorForm.nombre.trim()}>
                <ion-icon name="add-outline" /> Agregar fiador
              </button>
            </div>
          )}
        </div>
      )}

      {tabActiva === "activos" && (
        <div className={s.seccionWrap}>
          {activos.length === 0 && (
            <div className={s.vacioBanner}>
              <ion-icon name="cube-outline" />
              <p>No hay activos ni garantías registradas</p>
            </div>
          )}
          {activos.map(a => (
            <div key={a._id} className={s.itemCard}>
              <div className={s.itemCardInfo}>
                <div className={`${s.itemCardAvatar} ${s.itemCardAvatarActivo}`}>
                  <ion-icon name="cube-outline" />
                </div>
                <div className={s.itemCardTexto}>
                  <span className={s.itemCardNombre}>{a.nombre}</span>
                  <div className={s.itemCardMeta}>
                    {a.serial          && <span>S/N: {a.serial}</span>}
                    {Number(a.valor) > 0 && <span>{fmt(a.valor)}</span>}
                  </div>
                  {a.descripcion && <span className={s.itemCardDir}>{a.descripcion}</span>}
                </div>
              </div>
              {puedeEditar && (
                <button className={s.itemCardDel} onClick={() => quitarActivo(a._id)}>
                  <ion-icon name="trash-outline" />
                </button>
              )}
            </div>
          ))}

          {puedeEditar && (
            <div className={s.formularioCard}>
              <span className={s.formularioTitulo}>Agregar activo / garantía</span>
              <div className={s.grid2}>
                <div className={s.campo}><label>Nombre *</label><input value={activoForm.nombre} onChange={e => setActivoForm(a => ({ ...a, nombre: e.target.value }))} placeholder="Ej: Televisor Samsung" /></div>
                <div className={s.campo}><label>Serial</label><input value={activoForm.serial} onChange={e => setActivoForm(a => ({ ...a, serial: e.target.value }))} /></div>
                <div className={s.campo}><label>Valor</label><input type="number" min="0" value={activoForm.valor} onChange={e => setActivoForm(a => ({ ...a, valor: e.target.value }))} /></div>
                <div className={s.campo}><label>Descripción</label><input value={activoForm.descripcion} onChange={e => setActivoForm(a => ({ ...a, descripcion: e.target.value }))} /></div>
              </div>
              <button className={s.btnAgregar} onClick={agregarActivo} disabled={!activoForm.nombre.trim()}>
                <ion-icon name="add-outline" /> Agregar activo
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}