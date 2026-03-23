"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Contratos.module.css"

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

const ESTADOS = {
  activo:         { label: "Activo",         cls: s.badgeActivo         },
  pagado:         { label: "Pagado",         cls: s.badgePagado         },
  incumplido:     { label: "Incumplido",     cls: s.badgeIncumplido     },
  reestructurado: { label: "Reestructurado", cls: s.badgeReestructurado },
  cancelado:      { label: "Cancelado",      cls: s.badgeCancelado      },
}

function ModalEliminar({ contrato, empresaId, onClose, onDeleted }) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError]           = useState("")

  const confirmar = async () => {
    setEliminando(true); setError("")
    try {
      const res  = await apiFetch(`/api/pos/creditos/contratos/${empresaId}/${contrato.id}`, { method: "DELETE" })
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
          <span className={s.modalTitulo}>Eliminar contrato</span>
          <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        </div>
        <div className={s.modalBody}>
          {error && <div className={s.alertError}>{error}</div>}
          <p className={s.confirmTxt}>
            ¿Seguro que deseas eliminar el contrato <strong>#{contrato.numero}</strong> de <strong>{contrato.cliente?.nombre}</strong>?
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

export default function Contratos() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [contratos, setContratos] = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [busqueda,  setBusqueda]  = useState("")
  const [filtro,    setFiltro]    = useState("todos")
  const [modalDel,  setModalDel]  = useState(null)
  const [toggling,  setToggling]  = useState(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/pos/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/contratos/${empresaId}`)
      setContratos(res.ok ? await res.json() : [])
    } catch { setContratos([]) }
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  const toggle = async (c) => {
    setToggling(c.id)
    try {
      await apiFetch(`/api/pos/creditos/contratos/${empresaId}/${c.id}/toggle`, { method: "PATCH" })
      await cargar()
    } finally { setToggling(null) }
  }

  const porEstado = (e) => contratos.filter(c => c.estado === e).length
  const activos   = porEstado("activo")

  const filtrados = contratos.filter(c => {
    const q = busqueda.toLowerCase()
    const matchQ =
      c.numero.toLowerCase().includes(q) ||
      (c.cliente?.nombre ?? "").toLowerCase().includes(q) ||
      (c.plan?.nombre    ?? "").toLowerCase().includes(q)
    const matchF =
      filtro === "todos"       ? true :
      filtro === "activo"      ? c.estado === "activo" :
      filtro === "pagado"      ? c.estado === "pagado" :
      c.estado === "incumplido" || c.estado === "cancelado"
    return matchQ && matchF
  })

  return (
    <div className={s.page}>

      <div className={s.topRow1}>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Contratos</h1>
          <span className={s.subtitulo}>
            {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} · {activos} activo{activos !== 1 ? "s" : ""}
          </span>
        </div>
        <button className={s.btnNuevo} onClick={() => router.push("/pos/creditos/contratos/crear")}>
          <ion-icon name="add-outline" />
          Nuevo contrato
        </button>
      </div>

      <div className={s.topRow2}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por #contrato, cliente o plan..."
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
            { key: "todos",      label: "Todos",    count: contratos.length },
            { key: "activo",     label: "Activos",  count: activos },
            { key: "pagado",     label: "Pagados",  count: porEstado("pagado") },
            { key: "incumplido", label: "Problema", count: porEstado("incumplido") + porEstado("cancelado") },
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

      {cargando ? (
        <div className={s.tablaWrap}>
          {[...Array(5)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
        </div>
      ) : contratos.length === 0 ? (
        <div className={s.vacio}>
          <ion-icon name="document-text-outline" />
          <p>No hay contratos registrados aún</p>
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
            <span># Contrato</span>
            <span>Cliente</span>
            <span>Plan</span>
            <span>Monto total</span>
            <span>Saldo</span>
            <span>Cuota</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {filtrados.map(c => {
            const est = ESTADOS[c.estado] ?? { label: c.estado, cls: "" }
            const fmt = makeFmt(c.moneda?.simbolo ?? "RD$")
            return (
              <div key={c.id} className={`${s.tablaRow} ${c.estado === "cancelado" ? s.rowInactivo : ""}`}>

                <div className={s.cellNumero}>
                  <span className={s.numContrato}>#{c.numero}</span>
                  <span className={s.fechaContrato}>{fmtFecha(c.fecha_inicio)}</span>
                </div>

                <div className={s.cellCliente}>
                  <span className={s.clienteNombre}>{c.cliente?.nombre ?? "—"}</span>
                  {c.cliente?.cedula_rnc && (
                    <span className={s.clienteCedula}>{c.cliente.cedula_rnc}</span>
                  )}
                </div>

                <div className={s.cellPlan}>
                  <span className={s.planNombre}>{c.plan?.nombre ?? "—"}</span>
                  <span className={s.planMeses}>{c.meses}m · {Number(c.tasa_anual_pct).toFixed(2)}%</span>
                </div>

                <span className={s.cellMonto}>{fmt(c.monto_total)}</span>
                <span className={`${s.cellMonto} ${Number(c.saldo_pendiente) > 0 ? s.saldoPendiente : ""}`}>
                  {fmt(c.saldo_pendiente)}
                </span>
                <span className={s.cellMonto}>{fmt(c.cuota_mensual)}</span>

                <span className={`${s.badge} ${est.cls}`}>{est.label}</span>

                <div className={s.cellAcciones}>
                  <label className={`${s.switch} ${toggling === c.id ? s.switchLoading : ""}`} title={c.estado === "activo" ? "Cancelar" : "Activar"}>
                    <input
                      type="checkbox"
                      checked={c.estado === "activo"}
                      onChange={() => toggle(c)}
                      disabled={toggling === c.id || c.estado === "pagado"}
                    />
                    <span className={s.switchSlider} />
                  </label>
                  <button className={s.accionBtn} title="Ver"    onClick={() => router.push(`/pos/creditos/contratos/${c.id}/ver`)}>
                    <ion-icon name="eye-outline" />
                  </button>
                  <button className={s.accionBtn} title="Editar" onClick={() => router.push(`/pos/creditos/contratos/${c.id}/editar`)}>
                    <ion-icon name="create-outline" />
                  </button>
                  <button className={`${s.accionBtn} ${s.accionDel}`} title="Eliminar" onClick={() => setModalDel(c)}>
                    <ion-icon name="trash-outline" />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {modalDel && (
        <ModalEliminar
          contrato={modalDel}
          empresaId={empresaId}
          onClose={() => setModalDel(null)}
          onDeleted={() => { setModalDel(null); cargar() }}
        />
      )}
    </div>
  )
}