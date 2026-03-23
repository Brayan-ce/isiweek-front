"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./Control.module.css"

const API      = process.env.NEXT_PUBLIC_BACKEND_URL  ?? "http://localhost:3001"
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmtMonto(simbolo, n) {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtSaldos(saldos) {
  return Object.values(saldos)
    .filter(s => s.monto > 0)
    .map(s => fmtMonto(s.simbolo, s.monto))
    .join(" · ") || "—"
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function diasLabel(fecha) {
  if (!fecha) return null
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const d    = new Date(fecha); d.setHours(0,0,0,0)
  const diff = Math.round((d - hoy) / 86400000)
  if (diff < 0)   return { label: `Vencida ${Math.abs(diff)}d`, cls: s.diasVencida }
  if (diff === 0) return { label: "Vence hoy",                  cls: s.diasHoy     }
  if (diff <= 5)  return { label: `En ${diff}d`,                cls: s.diasUrgente }
  return              { label: `En ${diff}d`,                   cls: s.diasNormal  }
}

function ModalCompartir({ cliente, token, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const url   = `${BASE_URL}/deuda/${token}`
  const qrSrc = `${API}/api/pos/creditos/control/qr/${token}`

  const copiar = async () => {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const whatsapp = () => {
    const msg = encodeURIComponent(`Hola ${cliente.nombre}, te compartimos el resumen de tu deuda:\n${url}`)
    window.open(`https://wa.me/${cliente.telefono}?text=${msg}`, "_blank")
  }

  const descargarQR = async () => {
    const res  = await fetch(qrSrc)
    const blob = await res.blob()
    const a    = document.createElement("a")
    a.href     = URL.createObjectURL(blob)
    a.download = `deuda-${cliente.nombre.replace(/\s+/g, "-")}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHead}>
          <div className={s.modalHeadInfo}>
            <span className={s.modalTitulo}>Compartir estado de cuenta</span>
            <span className={s.modalSubtitulo}>{cliente.nombre}</span>
          </div>
          <button className={s.modalClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        </div>
        <div className={s.modalBody}>
          <div className={s.qrWrap}>
            <img src={qrSrc} alt="QR deuda" className={s.qrCanvas} />
            <button className={s.btnDescargarQR} onClick={descargarQR}>
              <ion-icon name="download-outline" /> Descargar QR
            </button>
          </div>
          <div className={s.linkBox}>
            <span className={s.linkUrl}>{url}</span>
          </div>
          <div className={s.compartirBtns}>
            <button className={`${s.btnCompartir} ${s.btnCopiar} ${copiado ? s.btnCopiado : ""}`} onClick={copiar}>
              <ion-icon name={copiado ? "checkmark-outline" : "copy-outline"} />
              {copiado ? "Copiado" : "Copiar link"}
            </button>
            {cliente.telefono && (
              <button className={`${s.btnCompartir} ${s.btnWa}`} onClick={whatsapp}>
                <ion-icon name="logo-whatsapp" />
                Enviar por WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Control() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [clientes,  setClientes]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [busqueda,  setBusqueda]  = useState("")
  const [filtro,    setFiltro]    = useState("todos")
  const [modalComp, setModalComp] = useState(null)
  const [toast,     setToast]     = useState(null)

  useEffect(() => {
    const p = getTokenPayload()
    if (!p) { router.push("/pos/login"); return }
    setEmpresaId(p.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/control/${empresaId}`)
      setClientes(res.ok ? await res.json() : [])
    } catch { setClientes([]) }
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  const mostrarToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 2500)
  }

  const copiarRapido = async (token, nombre) => {
    const url = `${BASE_URL}/deuda/${token}`
    await navigator.clipboard.writeText(url)
    mostrarToast(`Link de ${nombre} copiado`)
  }

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchQ =
      c.cliente?.nombre?.toLowerCase().includes(q) ||
      (c.cliente?.cedula_rnc ?? "").includes(q) ||
      (c.cliente?.telefono   ?? "").includes(q)
    const matchF =
      filtro === "todos"    ? true :
      filtro === "vencidos" ? c.cuotas_vencidas > 0 :
      filtro === "proximos" ? c.cuotas_proximas > 0 && c.cuotas_vencidas === 0 :
      true
    return matchQ && matchF
  })

  const totalVencidos = clientes.filter(c => c.cuotas_vencidas > 0).length
  const totalProximos = clientes.filter(c => c.cuotas_proximas > 0 && c.cuotas_vencidas === 0).length

  return (
    <div className={s.page}>

      {toast && (
        <div className={`${s.toast} ${toast.tipo === "error" ? s.toastError : s.toastOk}`}>
          <ion-icon name="checkmark-circle-outline" />
          {toast.msg}
        </div>
      )}

      <div className={s.topRow1}>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Control</h1>
          <span className={s.subtitulo}>
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} con contratos activos
          </span>
        </div>
      </div>

      <div className={s.metricasGrid}>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(29,111,206,0.1)" }}>
            <ion-icon name="people-outline" style={{ color: "#1d6fce" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Clientes activos</span>
            <span className={s.metricaVal}>{clientes.length}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(239,68,68,0.1)" }}>
            <ion-icon name="alert-circle-outline" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Con cuotas vencidas</span>
            <span className={s.metricaVal} style={{ color: totalVencidos > 0 ? "#ef4444" : undefined }}>
              {totalVencidos}
            </span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(245,158,11,0.1)" }}>
            <ion-icon name="time-outline" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Vencen en 7 días</span>
            <span className={s.metricaVal}>{totalProximos}</span>
          </div>
        </div>
        <div className={s.metricaCard}>
          <div className={s.metricaIcon} style={{ background: "rgba(139,92,246,0.1)" }}>
            <ion-icon name="document-text-outline" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <span className={s.metricaLbl}>Total contratos</span>
            <span className={s.metricaVal}>
              {clientes.reduce((a, c) => a + c.contratos_count, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className={s.topRow2}>
        <div className={s.searchWrap}>
          <ion-icon name="search-outline" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente, cédula o teléfono..."
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
            { key: "todos",    label: "Todos",    count: clientes.length },
            { key: "vencidos", label: "Vencidos", count: totalVencidos   },
            { key: "proximos", label: "Próximos", count: totalProximos   },
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
      ) : filtrados.length === 0 ? (
        <div className={s.vacio}>
          <ion-icon name="people-outline" />
          <p>{busqueda ? "Sin resultados" : "No hay clientes con contratos activos"}</p>
        </div>
      ) : (
        <div className={s.tablaWrap}>
          <div className={s.tablaHead}>
            <span>Cliente</span>
            <span>Contratos</span>
            <span>Saldo pendiente</span>
            <span>Mora acumulada</span>
            <span>Próximo venc.</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {filtrados.map(c => {
            const dias   = c.proxima_fecha ? diasLabel(c.proxima_fecha) : null
            const tieneV = c.cuotas_vencidas > 0
            const tieneP = c.cuotas_proximas > 0
            const hayMora = Object.values(c.moras ?? {}).some(m => m.monto > 0)

            return (
              <div
                key={c.cliente.id}
                className={`${s.tablaRow} ${tieneV ? s.rowVencida : tieneP ? s.rowProxima : ""}`}
              >
                <div className={s.cellCliente}>
                  <div className={s.clienteAvatarRow}>
                    <div className={`${s.avatar} ${tieneV ? s.avatarRojo : tieneP ? s.avatarAmbar : s.avatarAzul}`}>
                      {c.cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className={s.clienteInfo}>
                      <span className={s.clienteNombre}>{c.cliente.nombre}</span>
                      {c.cliente.cedula_rnc && (
                        <span className={s.clienteMeta}>{c.cliente.cedula_rnc}</span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={s.cellVal}>{c.contratos_count}</span>

                <span className={`${s.cellMonto} ${s.montoRojo}`}>
                  {fmtSaldos(c.saldos)}
                </span>

                <span className={`${s.cellMonto} ${hayMora ? s.moraColor : s.ceroColor}`}>
                  {hayMora ? fmtSaldos(c.moras) : "—"}
                </span>

                <div className={s.cellFecha}>
                  {c.proxima_fecha ? (
                    <>
                      <span className={s.fechaVal}>{fmtFecha(c.proxima_fecha)}</span>
                      {dias && <span className={`${s.diasBadge} ${dias.cls}`}>{dias.label}</span>}
                    </>
                  ) : <span className={s.ceroColor}>—</span>}
                </div>

                <div className={s.cellEstado}>
                  {tieneV && (
                    <span className={s.badgeVencida}>
                      <ion-icon name="alert-circle-outline" />
                      {c.cuotas_vencidas} vencida{c.cuotas_vencidas !== 1 ? "s" : ""}
                    </span>
                  )}
                  {!tieneV && tieneP && (
                    <span className={s.badgeProxima}>
                      <ion-icon name="time-outline" />
                      {c.cuotas_proximas} próxima{c.cuotas_proximas !== 1 ? "s" : ""}
                    </span>
                  )}
                  {!tieneV && !tieneP && (
                    <span className={s.badgeOk}>
                      <ion-icon name="checkmark-circle-outline" />
                      Al día
                    </span>
                  )}
                </div>

                <div className={s.cellAcciones}>
                  <button
                    className={s.accionBtn}
                    title="Ver deuda del cliente"
                    onClick={() => window.open(`/deuda/${c.token}`, "_blank")}
                  >
                    <ion-icon name="eye-outline" />
                  </button>
                  <button
                    className={s.accionBtn}
                    title="Copiar link"
                    onClick={() => copiarRapido(c.token, c.cliente.nombre)}
                  >
                    <ion-icon name="copy-outline" />
                  </button>
                  <button
                    className={`${s.accionBtn} ${s.accionShare}`}
                    title="Compartir / QR"
                    onClick={() => setModalComp({ cliente: c.cliente, token: c.token })}
                  >
                    <ion-icon name="share-social-outline" />
                  </button>
                  {c.cliente.telefono && (
                    <button
                      className={`${s.accionBtn} ${s.accionWa}`}
                      title="Enviar por WhatsApp"
                      onClick={() => {
                        const url = `${BASE_URL}/deuda/${c.token}`
                        const msg = encodeURIComponent(`Hola ${c.cliente.nombre}, te compartimos el resumen de tu deuda:\n${url}`)
                        window.open(`https://wa.me/${c.cliente.telefono}?text=${msg}`, "_blank")
                      }}
                    >
                      <ion-icon name="logo-whatsapp" />
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {modalComp && (
        <ModalCompartir
          cliente={modalComp.cliente}
          token={modalComp.token}
          onClose={() => setModalComp(null)}
        />
      )}
    </div>
  )
}