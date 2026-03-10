"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { obtenerSolicitudes, aprobarSolicitud, rechazarSolicitud, ponerPendiente } from "./servidor"
import s from "./solicitudes.module.css"

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const ESTADO_STYLE = {
  pendiente: { bg: "rgba(245,158,11,0.1)",  color: "#d97706", label: "Pendiente"  },
  aprobada:  { bg: "rgba(34,197,94,0.1)",   color: "#16a34a", label: "Aprobada"   },
  rechazada: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", label: "Rechazada"  },
}

export default function SolicitudesPage() {
  const router = useRouter()
  const [data, setData]           = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState("")
  const [estado, setEstado]       = useState("")
  const [pagina, setPagina]       = useState(1)
  const [accionando, setAccionando] = useState(null)
  const [detalle, setDetalle]     = useState(null)

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
    if (detalle?.id === id) setDetalle(null)
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
                  {sol.mensaje && (
                    <div className={s.mensaje}>{sol.mensaje}</div>
                  )}
                  <div className={s.cardFecha}>{fmtFecha(sol.created_at)}</div>
                </div>

                <div className={s.cardActions}>
                  {sol.estado !== "aprobada" && (
                    <button
                      className={s.btnAprobar}
                      onClick={() => handleAccion(sol.id, "aprobar")}
                      disabled={cargandoEsta}
                    >
                      {cargandoEsta ? <span className={s.spinner} /> : <><ion-icon name="checkmark-outline" /> Aprobar</>}
                    </button>
                  )}
                  {sol.estado !== "rechazada" && (
                    <button
                      className={s.btnRechazar}
                      onClick={() => handleAccion(sol.id, "rechazar")}
                      disabled={cargandoEsta}
                    >
                      {cargandoEsta ? <span className={s.spinner} /> : <><ion-icon name="close-outline" /> Rechazar</>}
                    </button>
                  )}
                  {sol.estado !== "pendiente" && (
                    <button
                      className={s.btnPendiente}
                      onClick={() => handleAccion(sol.id, "pendiente")}
                      disabled={cargandoEsta}
                    >
                      <ion-icon name="time-outline" />
                    </button>
                  )}
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
    </div>
  )
}