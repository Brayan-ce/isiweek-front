"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./usuarios.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function obtenerUsuarios({ busqueda = "", estado = "", tipo = "", empresaId = "", pagina = 1 } = {}) {
  try {
    const p = new URLSearchParams({ busqueda, estado, tipo, empresaId, pagina, limite: 12 })
    const res = await fetch(`${API}/api/superadmin/usuarios?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function obtenerEmpresasActivas() {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/empresas`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function eliminarUsuario(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/${id}`, { method: "DELETE" })
    if (!res.ok) return { error: "Error al eliminar usuario" }
    return { ok: true }
  } catch { return { error: "Error de conexion" } }
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const TIPO_COLOR = {
  "Super Admin":   { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  "Administrador": { bg: "rgba(29,111,206,0.1)",  color: "#1d6fce" },
  "Vendedor":      { bg: "rgba(34,197,94,0.1)",   color: "#16a34a" },
}

const ESTADO_COLOR = {
  activo:   { bg: "rgba(34,197,94,0.1)",  color: "#16a34a" },
  inactivo: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
}

export default function UsuariosPage() {
  const router = useRouter()
  const [empresas, setEmpresas]                   = useState([])
  const [empresaId, setEmpresaId]                 = useState("")
  const [empresa, setEmpresa]                     = useState(null)
  const [data, setData]                           = useState(null)
  const [cargandoEmpresas, setCargandoEmpresas]   = useState(true)
  const [cargando, setCargando]                   = useState(false)
  const [busqueda, setBusqueda]                   = useState("")
  const [estado, setEstado]                       = useState("")
  const [tipo, setTipo]                           = useState("")
  const [pagina, setPagina]                       = useState(1)
  const [confirmId, setConfirmId]                 = useState(null)
  const [eliminando, setEliminando]               = useState(false)

  useEffect(() => {
    obtenerEmpresasActivas().then(list => {
      setEmpresas(list)
      setCargandoEmpresas(false)
    })
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) { setData(null); return }
    setCargando(true)
    const res = await obtenerUsuarios({ busqueda, estado, tipo, pagina, empresaId })
    setData(res)
    setCargando(false)
  }, [busqueda, estado, tipo, pagina, empresaId])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setPagina(1) }, [busqueda, estado, tipo, empresaId])

  function seleccionarEmpresa(id) {
    setEmpresaId(id)
    setEmpresa(empresas.find(e => String(e.id) === String(id)) ?? null)
    setBusqueda("")
    setEstado("")
    setTipo("")
  }

  async function handleEliminar() {
    if (!confirmId) return
    setEliminando(true)
    await eliminarUsuario(confirmId)
    setConfirmId(null)
    setEliminando(false)
    cargar()
  }

  const usuarios     = data?.usuarios ?? []
  const totalPaginas = data?.paginas  ?? 1

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <div>
          <div className={s.pageSubtitle}>
            {empresaId ? `${data?.total ?? 0} usuarios en ${empresa?.nombre ?? ""}` : "Selecciona una empresa para gestionar sus usuarios"}
          </div>
        </div>
        {empresaId && (
          <button className={s.btnNuevo} onClick={() => router.push(`/superadmin/usuarios/nuevo?empresa_id=${empresaId}`)}>
            <ion-icon name="add-outline" /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className={s.empresaSelector}>
        <div className={s.empresaSelectorLabel}>
          <ion-icon name="business-outline" /> Empresa
        </div>
        <div className={s.empresaGrid}>
          {cargandoEmpresas
            ? [...Array(6)].map((_, i) => <div key={i} className={s.empresaSkeleton} />)
            : empresas.map(e => (
              <button
                key={e.id}
                type="button"
                className={`${s.empresaBtn} ${String(empresaId) === String(e.id) ? s.empresaBtnOn : ""}`}
                onClick={() => seleccionarEmpresa(e.id)}
              >
                <span className={s.empresaBtnIcon}>{e.nombre.charAt(0).toUpperCase()}</span>
                <span className={s.empresaBtnNombre}>{e.nombre}</span>
              </button>
            ))
          }
        </div>
      </div>

      {!empresaId && (
        <div className={s.emptyEmpresa}>
          <ion-icon name="people-outline" />
          <p>Selecciona una empresa para ver y gestionar sus usuarios</p>
        </div>
      )}

      {empresaId && (
        <>
          <div className={s.filtros}>
            <div className={s.searchWrap}>
              <ion-icon name="search-outline" />
              <input
                className={s.searchInput}
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={s.clearBtn} onClick={() => setBusqueda("")}>
                  <ion-icon name="close-outline" />
                </button>
              )}
            </div>
            <select className={s.selectFiltro} value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="2">Administrador</option>
              <option value="3">Vendedor</option>
            </select>
            <select className={s.selectFiltro} value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          {cargando ? (
            <div className={s.listaSkeleton}>
              {[...Array(5)].map((_, i) => <div key={i} className={s.filaSkeletonItem} />)}
            </div>
          ) : usuarios.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="people-outline" />
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <div className={s.tabla}>
              <div className={s.tablaHeader}>
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Modo</span>
                <span>Estado</span>
                <span>Creado</span>
                <span></span>
              </div>
              {usuarios.map(u => {
                const tc = TIPO_COLOR[u.tipo_usuario?.nombre]   ?? { bg: "#f1f5f9", color: "#64748b" }
                const ec = ESTADO_COLOR[u.estado]               ?? { bg: "#f1f5f9", color: "#64748b" }
                return (
                  <div key={u.id} className={s.tablaFila}>
                    <div className={s.filaUsuario}>
                      <div className={s.avatar}>{u.nombre_completo?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className={s.filaNombre}>{u.nombre_completo}</div>
                        <div className={s.filaEmail}>{u.email}</div>
                      </div>
                    </div>
                    <div>
                      <span className={s.badge} style={{ background: tc.bg, color: tc.color }}>
                        {u.tipo_usuario?.nombre}
                      </span>
                    </div>
                    <div className={s.filaModo}>
                      {u.modo_sistema
                        ? <span className={s.modoChip}><ion-icon name="layers-outline" />{u.modo_sistema.nombre}</span>
                        : <span className={s.sinModo}>—</span>
                      }
                    </div>
                    <div>
                      <span className={s.badge} style={{ background: ec.bg, color: ec.color }}>
                        {u.estado}
                      </span>
                    </div>
                    <div className={s.filaFecha}>{fmtFecha(u.created_at)}</div>
                    <div className={s.filaAcciones}>
                      <button className={s.btnVer} onClick={() => router.push(`/superadmin/usuarios/${u.id}/ver`)}>
                        <ion-icon name="eye-outline" />
                      </button>
                      <button className={s.btnEditar} onClick={() => router.push(`/superadmin/usuarios/${u.id}/editar`)}>
                        <ion-icon name="create-outline" />
                      </button>
                      <button className={s.btnEliminar} onClick={() => setConfirmId(u.id)}>
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
                >{i + 1}</button>
              ))}
              <button className={s.pageBtn} disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>
                <ion-icon name="chevron-forward-outline" />
              </button>
            </div>
          )}
        </>
      )}

      {confirmId && (
        <div className={s.overlay} onClick={() => setConfirmId(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalIcon}><ion-icon name="warning-outline" /></div>
            <div className={s.modalTitle}>Eliminar usuario</div>
            <div className={s.modalText}>Esta accion es irreversible. Se eliminara el usuario permanentemente.</div>
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