"use client"
import { apiFetch } from "@/_EXTRAS/peticion"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import s from "./EditarCaja.module.css"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleString("es-DO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

async function getSesion(id) {
  try {
    const res = await apiFetch(`/api/pos/cajas/sesion/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function guardarSesion(id, body) {
  try {
    const res = await apiFetch(`/api/pos/cajas/sesion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function EditarCaja() {
  const router  = useRouter()
  const params  = useParams()
  const id      = params?.id

  const [datos,         setDatos]         = useState(null)
  const [cargando,      setCargando]      = useState(true)
  const [guardando,     setGuardando]     = useState(false)
  const [alerta,        setAlerta]        = useState(null)
  const [notas,         setNotas]         = useState("")
  const [saldoApertura, setSaldoApertura] = useState("")
  const [saldoCierre,   setSaldoCierre]   = useState("")
  const [usuarioId,     setUsuarioId]     = useState(null)
  const [moneda,        setMoneda]        = useState({ simbolo: "RD$", codigo: "DOP" })
  const simbolo = (moneda?.simbolo && String(moneda.simbolo).trim()) || "RD$"

  const cargar = useCallback(async () => {
    if (!id) return
    setCargando(true)
    const d = await getSesion(id)
    if (d) {
      setDatos(d)
      setNotas(d.sesion.notas_cierre ?? "")
      setSaldoApertura(String(d.resumen.montoInicial))
      setSaldoCierre(d.resumen.saldoCierre != null ? String(d.resumen.saldoCierre) : "")
    }
    setCargando(false)
  }, [id])

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setUsuarioId(payload.id)
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    apiFetch(`/api/pos/header/${usuarioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresa?.moneda) setMoneda(d.empresa.moneda) })
      .catch(() => {})
  }, [usuarioId])

  useEffect(() => { cargar() }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  async function handleGuardar() {
    if (!datos) return
    const sesion   = datos.sesion
    const estaAbierta = sesion.estado === "abierta"
    const body = {}

    body.notas_cierre = notas

    if (estaAbierta && saldoApertura !== "") {
      body.saldo_apertura = Number(saldoApertura)
    }

    if (!estaAbierta && saldoCierre !== "") {
      body.saldo_cierre = Number(saldoCierre)
    }

    setGuardando(true)
    const res = await guardarSesion(id, body)
    setGuardando(false)

    if (res.error) {
      mostrarAlerta("error", res.error)
    } else {
      mostrarAlerta("ok", "Cambios guardados correctamente")
      setTimeout(() => router.push(`/pos/cajas/ver/${id}`), 1200)
    }
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        <div className={s.skeleton} style={{ height: 60 }} />
        <div className={s.skeleton} style={{ height: 300 }} />
      </div>
    </div>
  )

  if (!datos) return (
    <div className={s.page}>
      <div className={s.error}>
        <ion-icon name="alert-circle-outline" />
        <span>No se pudo cargar la sesión</span>
        <button onClick={() => router.back()}>Volver</button>
      </div>
    </div>
  )

  const { sesion, resumen } = datos
  const estaAbierta = sesion.estado === "abierta"

  const diferenciaPrev = saldoCierre !== "" && resumen.totalEnCaja != null
    ? Number(saldoCierre) - resumen.totalEnCaja
    : null

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      {/* Header */}
      <div className={s.header}>
        <button className={s.btnVolver} onClick={() => router.back()}>
          <ion-icon name="arrow-back-outline" /> Volver
        </button>
        <div className={s.headerInfo}>
          <h1 className={s.titulo}>Editar sesión <span className={s.tituloNum}>#{String(sesion.id).padStart(5, "0")}</span></h1>
          <span className={`${s.estadoBadge} ${estaAbierta ? s.badgeAbierta : s.badgeCerrada}`}>
            {estaAbierta ? <><span className={s.dot} />Abierta</> : "Cerrada"}
          </span>
        </div>
      </div>

      {/* Layout de dos columnas */}
      <div className={s.bodyGrid}>

        {/* ── Columna izquierda: resumen de sesión ── */}
        <div className={s.panelInfo}>
          <div className={s.panelTitulo}>
            <ion-icon name="wallet-outline" />
            Resumen de sesión
          </div>

          <div className={s.statGrid}>
            <div className={s.statCard}>
              <div className={s.statIcon} style={{ background: "rgba(29,111,206,0.1)", color: "#1d6fce" }}>
                <ion-icon name="lock-open-outline" />
              </div>
              <div className={s.statInfo}>
                <span className={s.statLabel}>Apertura</span>
                <span className={s.statValor}>{fmtFecha(sesion.abierta_at)}</span>
              </div>
            </div>

            {sesion.cerrada_at && (
              <div className={s.statCard}>
                <div className={s.statIcon} style={{ background: "rgba(100,116,139,0.1)", color: "#64748b" }}>
                  <ion-icon name="lock-closed-outline" />
                </div>
                <div className={s.statInfo}>
                  <span className={s.statLabel}>Cierre</span>
                  <span className={s.statValor}>{fmtFecha(sesion.cerrada_at)}</span>
                </div>
              </div>
            )}

            <div className={s.statCard}>
              <div className={s.statIcon} style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
                <ion-icon name="cash-outline" />
              </div>
              <div className={s.statInfo}>
                <span className={s.statLabel}>Total calculado</span>
                <span className={`${s.statValor} ${s.statVerde}`}>{fmt(resumen.totalEnCaja, simbolo)}</span>
              </div>
            </div>

            <div className={s.statCard}>
              <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                <ion-icon name="receipt-outline" />
              </div>
              <div className={s.statInfo}>
                <span className={s.statLabel}>Ventas realizadas</span>
                <span className={s.statValor}>{resumen.cantVentas} venta{resumen.cantVentas !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          <div className={s.infoAyuda}>
            <ion-icon name="information-circle-outline" />
            <span>Solo puedes modificar el saldo{estaAbierta ? " de apertura" : " de cierre"} y agregar notas. Las ventas y gastos no se pueden editar desde aquí.</span>
          </div>
        </div>

        {/* ── Columna derecha: formulario ── */}
        <div className={s.formCard}>
          <div className={s.formTitulo}><ion-icon name="create-outline" /> Modificar datos</div>

          {estaAbierta && (
            <div className={s.field}>
              <label>Saldo de apertura</label>
              <div className={s.inputWrap}>
                <span className={s.inputPrefix}>{simbolo}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={saldoApertura}
                  onChange={e => setSaldoApertura(e.target.value)}
                  className={s.input}
                />
              </div>
              <span className={s.fieldHint}>Solo disponible mientras la caja esté abierta</span>
            </div>
          )}

          {!estaAbierta && (
            <div className={s.field}>
              <label>Saldo de cierre real</label>
              <div className={s.inputWrap}>
                <span className={s.inputPrefix}>{simbolo}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={saldoCierre}
                  onChange={e => setSaldoCierre(e.target.value)}
                  className={s.input}
                />
              </div>
              {diferenciaPrev !== null && (
                <div className={`${s.diferencia} ${diferenciaPrev < 0 ? s.difNeg : diferenciaPrev > 0 ? s.difPos : s.difOk}`}>
                  <ion-icon name={diferenciaPrev === 0 ? "checkmark-circle-outline" : diferenciaPrev < 0 ? "trending-down-outline" : "trending-up-outline"} />
                  {diferenciaPrev === 0
                    ? "Monto exacto — sin diferencia"
                    : `Diferencia: ${fmt(Math.abs(diferenciaPrev), simbolo)} ${diferenciaPrev < 0 ? "faltante" : "sobrante"}`}
                </div>
              )}
            </div>
          )}

          <div className={s.field}>
            <label>Notas de cierre</label>
            <textarea
              placeholder="Observaciones, ajustes manuales, incidencias..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className={`${s.input} ${s.textarea}`}
              rows={4}
            />
          </div>

          <div className={s.acciones}>
            <button className={s.btnCancelar} onClick={() => router.back()}>
              <ion-icon name="close-outline" /> Cancelar
            </button>
            <button className={s.btnGuardar} onClick={handleGuardar} disabled={guardando}>
              {guardando
                ? <><span className={s.spinner} /> Guardando...</>
                : <><ion-icon name="checkmark-circle-outline" /> Guardar cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
