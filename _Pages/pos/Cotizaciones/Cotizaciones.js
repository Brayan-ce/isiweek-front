"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Cotizaciones.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getCotizaciones(empresaId, params = {}) {
  try {
    const q = new URLSearchParams(params)
    const res = await fetch(`${API}/api/pos/cotizaciones/${empresaId}?${q}`)
    if (!res.ok) return { cotizaciones: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { cotizaciones: [], total: 0, paginas: 1 } }
}

async function cambiarEstado(id, empresaId, estado) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/estado/${id}/${empresaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    return await res.json()
  } catch { return { error: "No se pudo cambiar el estado" } }
}

async function eliminarCotizacion(id, empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/cotizaciones/eliminar/${id}/${empresaId}`, {
      method: "DELETE",
    })
    return await res.json()
  } catch { return { error: "No se pudo eliminar" } }
}

const ESTADO_LABEL = {
  pendiente: "Pendiente",
  aprobada:  "Aprobada",
  rechazada: "Rechazada",
  vencida:   "Vencida",
}

const ESTADO_CLASS = {
  pendiente: "estadoPendiente",
  aprobada:  "estadoAprobada",
  rechazada: "estadoRechazada",
  vencida:   "estadoVencida",
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Cotizaciones() {
  const router = useRouter()

  const [empresaId, setEmpresaId] = useState(null)
  const [data,     setData]     = useState({ cotizaciones: [], total: 0, paginas: 1 })
  const [loading,  setLoading]  = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [estado,   setEstado]   = useState("")
  const [pagina,   setPagina]   = useState(1)
  const [alerta,   setAlerta]   = useState(null)
  const [confirm,  setConfirm]  = useState(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (q = "", est = "", pag = 1) => {
    if (!empresaId) return
    setLoading(true)
    const res = await getCotizaciones(empresaId, { busqueda: q, estado: est, pagina: pag, limite: 20 })
    setData(res)
    setLoading(false)
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) return
    cargar()
  }, [cargar, empresaId])

  useEffect(() => {
    const t = setTimeout(() => { cargar(busqueda, estado, 1); setPagina(1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, estado, cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3000)
  }

  async function handleCambiarEstado(id, nuevoEstado) {
    const res = await cambiarEstado(id, empresaId, nuevoEstado)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Estado actualizado")
    cargar(busqueda, estado, pagina)
  }

  async function handleEliminar(id) {
    const res = await eliminarCotizacion(id, empresaId)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Cotizacion eliminada")
    setConfirm(null)
    cargar(busqueda, estado, pagina)
  }

  const { cotizaciones, paginas } = data

  if (!empresaId) return <div className={s.loading}><span className={s.spinner} /></div>

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              className={s.searchInput}
              placeholder="Buscar por cliente o numero..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onClick={() => setBusqueda("")}>
                <ion-icon name="close-outline" />
              </button>
            )}
          </div>
          <select className={s.filtroEstado} value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>
        <button className={s.btnNueva} onClick={() => router.push("/pos/cotizaciones/nuevo")}>
          <ion-icon name="add-outline" />
          Nueva cotizacion
        </button>
      </div>

      <div className={s.tableWrap}>
        <div className={s.tableHead}>
          <span>#</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : cotizaciones.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="document-text-outline" />
            <p>Sin cotizaciones</p>
          </div>
        ) : (
          cotizaciones.map(c => (
            <div key={c.id} className={s.row}>
              <span className={s.rowNum}>#{String(c.id).padStart(5, "0")}</span>
              <div className={s.rowCliente}>
                <span className={s.clienteNombre}>{c.cliente?.nombre ?? "Sin cliente"}</span>
                {c.cliente?.cedula_rnc && <span className={s.clienteCedula}>{c.cliente.cedula_rnc}</span>}
              </div>
              <span className={s.rowFecha}>{new Date(c.created_at).toLocaleDateString("es-DO")}</span>
              <span className={s.rowTotal}>{fmt(c.total)}</span>
              <div className={s.rowEstado}>
                <span className={`${s.estadoBadge} ${s[ESTADO_CLASS[c.estado]]}`}>
                  {ESTADO_LABEL[c.estado]}
                </span>
              </div>
              <div className={s.rowAcciones}>
                {c.estado === "aprobada" ? (
                  <button
                    className={s.btnImprimir}
                    onClick={() => router.push(`/pos/cotizaciones/ver/${c.id}`)}
                    title="Imprimir"
                  >
                    <ion-icon name="print-outline" />
                  </button>
                ) : (
                  <button
                    className={s.btnVer}
                    onClick={() => router.push(`/pos/cotizaciones/ver/${c.id}`)}
                    title="Ver"
                  >
                    <ion-icon name="eye-outline" />
                  </button>
                )}
                {c.estado === "pendiente" && (
                  <button className={s.btnEditar} onClick={() => router.push(`/pos/cotizaciones/editar/${c.id}`)} title="Editar">
                    <ion-icon name="pencil-outline" />
                  </button>
                )}
                {c.estado === "pendiente" && (
                  <>
                    <button className={s.btnAprobar} onClick={() => handleCambiarEstado(c.id, "aprobada")} title="Aprobar">
                      <ion-icon name="checkmark-outline" />
                    </button>
                    <button className={s.btnRechazar} onClick={() => handleCambiarEstado(c.id, "rechazada")} title="Rechazar">
                      <ion-icon name="close-outline" />
                    </button>
                  </>
                )}
                {c.estado !== "aprobada" && (
                  <button className={s.btnEliminar} onClick={() => setConfirm(c.id)} title="Eliminar">
                    <ion-icon name="trash-outline" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => { const p = pagina - 1; setPagina(p); cargar(busqueda, estado, p) }}>
            <ion-icon name="chevron-back-outline" />
          </button>
          <span>{pagina} / {paginas}</span>
          <button disabled={pagina === paginas} onClick={() => { const p = pagina + 1; setPagina(p); cargar(busqueda, estado, p) }}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {confirm && (
        <div className={s.overlay} onClick={() => setConfirm(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitulo}>Eliminar cotizacion</div>
            <p className={s.modalDesc}>Esta accion no se puede deshacer. Deseas continuar?</p>
            <div className={s.modalAcciones}>
              <button className={s.btnCancelar} onClick={() => setConfirm(null)}>Cancelar</button>
              <button className={s.btnConfirmarEliminar} onClick={() => handleEliminar(confirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}