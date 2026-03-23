"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./solicitudes.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_STYLE = {
  pendiente: { bg: "rgba(245,158,11,0.1)", color: "#d97706", label: "Pendiente" },
  aprobada:  { bg: "rgba(34,197,94,0.1)",  color: "#16a34a", label: "Aprobada"  },
  rechazada: { bg: "rgba(239,68,68,0.1)",  color: "#dc2626", label: "Rechazada" },
}

async function obtenerSolicitudes({ busqueda = "", estado = "", pagina = 1 } = {}) {
  try {
    const p = new URLSearchParams({ busqueda, estado, pagina, limite: 12 })
    const res = await apiFetch(`/api/superadmin/solicitudes?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function aprobarSolicitud(id) {
  try {
    const res = await apiFetch(`/api/superadmin/solicitudes/${id}/aprobar`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al aprobar" }
    return { ok: true, ...json }
  } catch { return { error: "Error de conexion" } }
}

async function rechazarSolicitud(id) {
  try {
    const res = await apiFetch(`/api/superadmin/solicitudes/${id}/rechazar`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al rechazar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

async function ponerPendiente(id) {
  try {
    const res = await apiFetch(`/api/superadmin/solicitudes/${id}/pendiente`, { method: "PATCH" })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al actualizar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

async function eliminarSolicitud(id) {
  try {
    const res = await apiFetch(`/api/superadmin/solicitudes/${id}`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al eliminar" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

export default function SolicitudesPage() {
  const router = useRouter()
  const [data, setData]             = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [busqueda, setBusqueda]     = useState("")
  const [estado, setEstado]         = useState("")
  const [pagina, setPagina]         = useState(1)
  const [accionando, setAccionando] = useState(null)
  const [confirmId, setConfirmId]   = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const res = await obtenerSolicitudes({ busqueda, estado, pagina })
    setData(res)
    setCargando(false)
  }, [busqueda, estado, pagina])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setPagina(1) }, [busqueda, estado])

  async function handleAccion(id, accion) {
    setAccionando(id)
    if (accion === "aprobar")   await aprobarSolicitud(id)
    if (accion === "rechazar")  await rechazarSolicitud(id)
    if (accion === "pendiente") await ponerPendiente(id)
    setAccionando(null)
    cargar()
  }

  async function handleEliminar() {
    if (!confirmId) return
    setEliminando(true)
    await eliminarSolicitud(confirmId)
    setConfirmId(null)
    setEliminando(false)
    cargar()
  }

  const solicitudes  = data?.solicitudes ?? []
  const totalPaginas = data?.paginas ?? 1

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <div>
          <div className={s.pageTitle}>Solicitudes</div>
          <div className={s.pageSubtitle}>{data?.total ?? 0} solicitudes registradas</div>
        </div>
      </div>

      <div className={s.filtros}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className={s.clearBtn} onClick={() => setBusqueda("")}>
              <ion-icon name="close-outline" />
            </button>
          )}
        </div>
        <select className={s.selectFiltro} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {cargando ? (
        <div className={s.loadingGrid}>
          {[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}
        </div>
      ) : solicitudes.length === 0 ? (
        <div className={s.empty}>
          <ion-icon name="document-text-outline" />
          <p>No se encontraron solicitudes</p>
        </div>
      ) : (
        <div className={s.grid}>
          {solicitudes.map(sol => {
            const es = ESTADO_STYLE[sol.estado] ?? ESTADO_STYLE.pendiente
            const cargandoEsta = accionando === sol.id
            return (
              <div key={sol.id} className={s.card}>
                <div className={s.cardTop}>
                  <div className={s.cardIconWrap}>
                    <ion-icon name="person-circle-outline" />
                  </div>
                  <div className={s.cardTopInfo}>
                    <div className={s.cardNombre}>{sol.nombre ?? "Sin nombre"}</div>
                    <div className={s.cardEmail}>{sol.email}</div>
                  </div>
                  <span className={s.estadoBadge} style={{ background: es.bg, color: es.color }}>
                    {es.label}
                  </span>
                </div>

                <div className={s.cardBody}>
                  {sol.telefono && (
                    <div className={s.metaItem}>
                      <ion-icon name="call-outline" /> {sol.telefono}
                    </div>
                  )}
                  {sol.empresa && (
                    <div className={s.metaItem}>
                      <ion-icon name="business-outline" />
                      <button className={s.empresaLink} onClick={() => router.push(`/superadmin/empresas/${sol.empresa.id}/ver`)}>
                        {sol.empresa.nombre}
                      </button>
                    </div>
                  )}
                  {sol.mensaje && <div className={s.mensaje}>{sol.mensaje}</div>}
                  <div className={s.cardFecha}>{fmtFecha(sol.created_at)}</div>
                </div>

                <div className={s.cardActions}>
                  {sol.estado !== "aprobada" && (
                    <button className={s.btnAprobar} onClick={() => handleAccion(sol.id, "aprobar")} disabled={cargandoEsta}>
                      {cargandoEsta ? <span className={s.spinner} /> : <><ion-icon name="checkmark-outline" /> Aprobar</>}
                    </button>
                  )}
                  {sol.estado !== "rechazada" && (
                    <button className={s.btnRechazar} onClick={() => handleAccion(sol.id, "rechazar")} disabled={cargandoEsta}>
                      {cargandoEsta ? <span className={s.spinner} /> : <><ion-icon name="close-outline" /> Rechazar</>}
                    </button>
                  )}
                  {sol.estado !== "pendiente" && (
                    <button className={s.btnPendiente} onClick={() => handleAccion(sol.id, "pendiente")} disabled={cargandoEsta}>
                      <ion-icon name="time-outline" />
                    </button>
                  )}
                  <button className={s.btnEliminar} onClick={() => setConfirmId(sol.id)} disabled={cargandoEsta}>
                    <ion-icon name="trash-outline" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className={s.paginacion}>
          <button className={s.pageBtn} disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>
            <ion-icon name="chevron-back-outline" />
          </button>
          {[...Array(totalPaginas)].map((_, i) => (
            <button
              key={i}
              className={`${s.pageBtn} ${pagina === i + 1 ? s.pageBtnActive : ""}`}
              onClick={() => setPagina(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className={s.pageBtn} disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {confirmId && (
        <div className={s.overlay} onClick={() => setConfirmId(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.modalTitle}>Eliminar solicitud</div>
            <div className={s.modalText}>Esta accion es irreversible. La solicitud sera eliminada permanentemente.</div>
            <div className={s.modalBtns}>
              <button className={s.modalCancelar} onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className={s.modalConfirmar} onClick={handleEliminar} disabled={eliminando}>
                {eliminando ? <span className={s.spinner} /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}