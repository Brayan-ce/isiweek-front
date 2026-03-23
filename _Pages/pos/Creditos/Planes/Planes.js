"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Planes.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function pct(n) { return `${Number(n ?? 0).toFixed(2)}%` }

// ─── Modal Confirmar Eliminar ─────────────────────────────────────────────────
function ModalEliminar({ plan, empresaId, onClose, onDeleted }) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState("")

  const confirmar = async () => {
    setEliminando(true); setError("")
    try {
      const res  = await apiFetch(`/api/pos/creditos/planes/${empresaId}/${plan.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al eliminar")
      onDeleted()
    } catch (e) {
      setError(e.message)
      setEliminando(false)
    }
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <span className={s.modalTitulo}>Eliminar plan</span>
          <button className={s.modalClose} onClick={onClose}>
            <ion-icon name="close-outline" />
          </button>
        </div>
        <div className={s.modalBody}>
          {error && <div className={s.alertError}>{error}</div>}
          <p className={s.confirmTxt}>
            ¿Seguro que deseas eliminar <strong>{plan.nombre}</strong>?
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className={s.modalFoot}>
          <button className={s.btnCancelar} onClick={onClose} disabled={eliminando}>Cancelar</button>
          <button className={s.btnEliminar} onClick={confirmar} disabled={eliminando}>
            {eliminando ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Planes() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [planes, setPlanes]       = useState([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState("")
  const [filtro, setFiltro]       = useState("todos")
  const [modalDel, setModalDel]   = useState(null)
  const [toggling, setToggling]   = useState(null) // id del plan en proceso

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/planes/${empresaId}`)
      setPlanes(res.ok ? await res.json() : [])
    } catch { setPlanes([]) }
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (plan) => {
    setToggling(plan.id)
    try {
      await apiFetch(`/api/pos/creditos/planes/${empresaId}/${plan.id}/toggle`, {
        method: "PATCH",
      })
      await cargar()
    } finally {
      setToggling(null)
    }
  }

  const filtrados = planes.filter(p => {
    const matchQ =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? "").toLowerCase().includes(busqueda.toLowerCase())
    const matchF =
      filtro === "todos"    ? true :
      filtro === "activo"   ? p.activo :
      !p.activo
    return matchQ && matchF
  })

  const totalActivos   = planes.filter(p => p.activo).length
  const totalInactivos = planes.filter(p => !p.activo).length

  return (
    <div className={s.page}>

      {/* Fila 1 */}
      <div className={s.topRow1}>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Planes de Crédito</h1>
          <span className={s.subtitulo}>
            {totalActivos} activo{totalActivos !== 1 ? "s" : ""} · {totalInactivos} inactivo{totalInactivos !== 1 ? "s" : ""}
          </span>
        </div>
        <button className={s.btnNuevo} onClick={() => router.push("/pos/creditos/planes/nuevo")}>
          <ion-icon name="add-outline" />
          Nuevo plan
        </button>
      </div>

      {/* Fila 2 */}
      <div className={s.topRow2}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar plan..."
            className={s.searchInput}
          />
          {busqueda && (
            <button className={s.searchClear} onClick={() => setBusqueda("")}>
              <ion-icon name="close-circle-outline" />
            </button>
          )}
        </div>
        <div className={s.filtroTabs}>
          {[
            { key: "todos",    label: "Todos",     count: planes.length  },
            { key: "activo",   label: "Activos",   count: totalActivos   },
            { key: "inactivo", label: "Inactivos", count: totalInactivos },
          ].map(t => (
            <button
              key={t.key}
              className={`${s.filtroTab} ${filtro === t.key ? s.filtroTabActivo : ""}`}
              onClick={() => setFiltro(t.key)}
            >
              {t.label}
              <span className={s.filtroCount}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className={s.tablaWrap}>
          {[...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
        </div>
      ) : planes.length === 0 ? (
        <div className={s.vacio}>
          <ion-icon name="layers-outline" />
          <p>No hay planes configurados aún</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className={s.vacio}>
          <ion-icon name="search-outline" />
          <p>Sin resultados para <strong>"{busqueda}"</strong></p>
          <button className={s.btnLimpiar} onClick={() => { setBusqueda(""); setFiltro("todos") }}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className={s.tablaWrap}>
          <div className={s.tablaHead}>
            <span>Nombre</span>
            <span>Mora</span>
            <span>Días gracia</span>
            <span>Plazos</span>
            <span>Contratos</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {filtrados.map(p => (
            <div key={p.id} className={`${s.tablaRow} ${!p.activo ? s.rowInactivo : ""}`}>

              <div className={s.cellNombre}>
                <div className={s.planNombreRow}>
                  <span className={s.planNombre}>{p.nombre}</span>
                  {p.codigo && <span className={s.planCodigo}>{p.codigo}</span>}
                </div>
                {p.descripcion && <span className={s.planDesc}>{p.descripcion}</span>}
              </div>

              <span className={s.cellVal}>{pct(p.mora_pct)}</span>
              <span className={s.cellVal}>{p.dias_gracia}d</span>
              <span className={s.cellVal}>{p.opciones?.length ?? 0}</span>
              <span className={s.cellVal}>{p._count?.contratos ?? 0}</span>

              {/* Switch */}
              <div className={s.cellEstado}>
                <label
                  className={`${s.switch} ${toggling === p.id ? s.switchLoading : ""}`}
                  title={p.activo ? "Desactivar" : "Activar"}
                >
                  <input
                    type="checkbox"
                    checked={p.activo}
                    onChange={() => toggleActivo(p)}
                    disabled={toggling === p.id}
                  />
                  <span className={s.switchSlider} />
                </label>
                <span className={`${s.switchLbl} ${p.activo ? s.switchLblOn : s.switchLblOff}`}>
                  {p.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              {/* Acciones */}
              <div className={s.cellAcciones}>
                <button
                  className={s.accionBtn}
                  title="Ver"
                  onClick={() => router.push(`/pos/creditos/planes/${p.id}/ver`)}
                >
                  <ion-icon name="eye-outline" />
                </button>
                <button
                  className={s.accionBtn}
                  title="Editar"
                  onClick={() => router.push(`/pos/creditos/planes/${p.id}/editar`)}
                >
                  <ion-icon name="create-outline" />
                </button>
                <button
                  className={`${s.accionBtn} ${s.accionDel}`}
                  title="Eliminar"
                  onClick={() => setModalDel(p)}
                >
                  <ion-icon name="trash-outline" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {modalDel && (
        <ModalEliminar
          plan={modalDel}
          empresaId={empresaId}
          onClose={() => setModalDel(null)}
          onDeleted={() => { setModalDel(null); cargar() }}
        />
      )}
    </div>
  )
}