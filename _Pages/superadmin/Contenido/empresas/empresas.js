"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./empresas.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function obtenerEmpresas({ busqueda = "", estado = "", pagina = 1 } = {}) {
  try {
    const params = new URLSearchParams({ busqueda, estado, pagina, limite: 12 })
    const res = await fetch(`${API}/api/superadmin/empresas?${params}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function eliminarEmpresa(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al eliminar empresa" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

export default function EmpresasPage() {
  const router = useRouter()
  const [data, setData]             = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [busqueda, setBusqueda]     = useState("")
  const [estado, setEstado]         = useState("")
  const [pagina, setPagina]         = useState(1)
  const [confirmId, setConfirmId]   = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const res = await obtenerEmpresas({ busqueda, estado, pagina })
    setData(res)
    setCargando(false)
  }, [busqueda, estado, pagina])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setPagina(1) }, [busqueda, estado])

  async function handleEliminar() {
    if (!confirmId) return
    setEliminando(true)
    await eliminarEmpresa(confirmId)
    setConfirmId(null)
    setEliminando(false)
    cargar()
  }

  const empresas     = data?.empresas ?? []
  const totalPaginas = data?.paginas  ?? 1

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <div>
          <div className={s.pageSubtitle}>{data?.total ?? 0} empresas registradas</div>
        </div>
        <button className={s.btnNuevo} onClick={() => router.push("/superadmin/empresas/nuevo")}>
          <ion-icon name="add-outline" /> Nueva Empresa
        </button>
      </div>

      <div className={s.filtros}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            className={s.searchInput}
            placeholder="Buscar empresa..."
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
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
        </select>
      </div>

      {cargando ? (
        <div className={s.loadingGrid}>
          {[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}
        </div>
      ) : empresas.length === 0 ? (
        <div className={s.empty}>
          <ion-icon name="business-outline" />
          <p>No se encontraron empresas</p>
        </div>
      ) : (
        <div className={s.grid}>
          {empresas.map(e => (
            <div key={e.id} className={s.card}>
              <div className={s.cardTop}>
                <div className={s.cardIconWrap}>
                  <ion-icon name="business-outline" />
                </div>
                <span className={`${s.chip} ${e.estado === "activa" ? s.chipGreen : s.chipRed}`}>
                  {e.estado === "activa" ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div className={s.cardBody}>
                <div className={s.cardNombre}>{e.nombre}</div>
                {e.razon_social && <div className={s.cardRazon}>{e.razon_social}</div>}

                <div className={s.cardMeta}>
                  {e.rnc && (
                    <span className={s.metaItem}>
                      <ion-icon name="card-outline" /> {e.rnc}
                    </span>
                  )}
                  {e.provincia && (
                    <span className={s.metaItem}>
                      <ion-icon name="location-outline" /> {e.provincia}
                    </span>
                  )}
                  {e.telefono && (
                    <span className={s.metaItem}>
                      <ion-icon name="call-outline" /> {e.telefono}
                    </span>
                  )}
                  {e.email && (
                    <span className={s.metaItem}>
                      <ion-icon name="mail-outline" /> {e.email}
                    </span>
                  )}
                </div>

                <div className={s.cardFooter}>
                  <div className={s.cardStats}>
                    <span className={s.statBadge}>
                      <ion-icon name="people-outline" /> {e._count?.usuarios ?? 0}
                    </span>
                    <span className={s.monedaBadge}>{e.moneda?.simbolo} {e.moneda?.codigo}</span>
                  </div>
                  <div className={s.cardFecha}>{fmtFecha(e.created_at)}</div>
                </div>
              </div>

              <div className={s.cardActions}>
                <button className={s.btnVer} onClick={() => router.push(`/superadmin/empresas/${e.id}/ver`)}>
                  <ion-icon name="eye-outline" /> Ver
                </button>
                <button className={s.btnEditar} onClick={() => router.push(`/superadmin/empresas/${e.id}/editar`)}>
                  <ion-icon name="create-outline" /> Editar
                </button>
                <button className={s.btnEliminar} onClick={() => setConfirmId(e.id)}>
                  <ion-icon name="trash-outline" />
                </button>
              </div>
            </div>
          ))}
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
            <div className={s.modalTitle}>Eliminar empresa</div>
            <div className={s.modalText}>Esta accion es irreversible. Se eliminaran todos los datos asociados a esta empresa.</div>
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