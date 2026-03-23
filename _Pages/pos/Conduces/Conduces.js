"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import s from "./Conduces.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

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

async function getVentasCuotas(empresaId, busqueda = "", pagina = 1, limite = 20) {
  try {
    const params = new URLSearchParams({ busqueda, pagina, limite })
    const res = await apiFetch(`/api/pos/conduces/${empresaId}?${params}`)
    if (!res.ok) return { ventas: [], total: 0, paginas: 1 }
    return await res.json()
  } catch { return { ventas: [], total: 0, paginas: 1 } }
}

async function pagarCuota(cuotaId, ventaId, empresaId) {
  try {
    const res = await apiFetch(`/api/pos/conduces/pagar-cuota/${cuotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventaId, empresaId }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

export default function Conduces() {
  const router = useRouter()

  const [empresaId, setEmpresaId]   = useState(null)
  const [ventas, setVentas]         = useState([])
  const [total, setTotal]           = useState(0)
  const [pagina, setPagina]         = useState(1)
  const [paginas, setPaginas]       = useState(1)
  const [busqueda, setBusqueda]     = useState("")
  const [cargando, setCargando]     = useState(true)
  const [alerta, setAlerta]         = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [modalVer, setModalVer]     = useState(null)
  const searchRef = useRef()

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async (q = "", p = 1) => {
    if (!empresaId) return
    setCargando(true)
    const res = await getVentasCuotas(empresaId, q, p, 20)
    setVentas(res.ventas ?? [])
    setTotal(res.total ?? 0)
    setPaginas(res.paginas ?? 1)
    setCargando(false)
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) return
    cargar("", 1)
  }, [cargar, empresaId])

  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); cargar(busqueda, 1) }, 350)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  async function handlePagarCuota(cuotaId, ventaId) {
    setProcesando(true)
    const res = await pagarCuota(cuotaId, ventaId, empresaId)
    setProcesando(false)
    if (res.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", `Cuota ${res.numero} pagada`)
    setVentas(prev => prev.map(v => {
      if (v.id !== ventaId) return v
      const cuotas = v.venta_cuotas.map(c => c.id === cuotaId ? { ...c, estado: "pagada", pagada_at: new Date() } : c)
      const todasPagadas = cuotas.every(c => c.estado === "pagada")
      return { ...v, venta_cuotas: cuotas, estado: todasPagadas ? "completada" : "pendiente" }
    }))
    if (modalVer?.id === ventaId) {
      setModalVer(prev => {
        const cuotas = prev.venta_cuotas.map(c => c.id === cuotaId ? { ...c, estado: "pagada", pagada_at: new Date() } : c)
        const todasPagadas = cuotas.every(c => c.estado === "pagada")
        return { ...prev, venta_cuotas: cuotas, estado: todasPagadas ? "completada" : "pendiente" }
      })
    }
  }

  function cuotasPagadas(v)    { return v.venta_cuotas.filter(c => c.estado === "pagada").length }
  function cuotasPendientes(v) { return v.venta_cuotas.filter(c => c.estado === "pendiente") }
  function proximaCuota(v)     { return cuotasPendientes(v)[0] ?? null }
  function montoPagado(v)      { return v.venta_cuotas.filter(c => c.estado === "pagada").reduce((a, c) => a + Number(c.monto), 0) }

  if (!empresaId) return <div className={s.loading}><span className={s.spinner} /></div>

  return (
    <div className={s.page}>

      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <span className={s.subtitulo}>{total} venta{total !== 1 ? "s" : ""} a cuotas</span>
        <div className={s.topBarRight}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" class={s.searchIcon} />
            <input
              ref={searchRef}
              className={s.searchInput}
              placeholder="Buscar cliente o numero..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={s.clearBtn} onMouseDown={e => { e.preventDefault(); setBusqueda(""); searchRef.current?.focus() }}>
                <ion-icon name="close-circle" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span>Venta</span>
          <span>Cliente</span>
          <span className={s.hideTablet}>Progreso</span>
          <span>Estado</span>
          <span className={s.hideMobile}>Total</span>
          <span></span>
        </div>

        {cargando ? (
          [...Array(6)].map((_, i) => <div key={i} className={s.skeletonRow} />)
        ) : ventas.length === 0 ? (
          <div className={s.empty}>
            <ion-icon name="time-outline" />
            <p>{busqueda ? `Sin resultados para "${busqueda}"` : "No hay ventas a cuotas"}</p>
          </div>
        ) : (
          ventas.map(v => {
            const pagadas  = cuotasPagadas(v)
            const totCuota = v.venta_cuotas.length
            const proxima  = proximaCuota(v)
            const pct      = totCuota > 0 ? (pagadas / totCuota) * 100 : 0
            const completa = v.estado === "completada"
            return (
              <div key={v.id} className={s.tableRow}>
                <div className={s.numeroCell}>
                  <span className={s.numero}>V-{String(v.id).padStart(5, "0")}</span>
                  <span className={s.itemsCount}>{pagadas}/{totCuota} cuotas</span>
                </div>
                <div className={s.clienteCell}>
                  {v.cliente
                    ? <span className={s.clienteNombre}>{v.cliente.nombre}</span>
                    : <span className={s.sinCliente}>Sin cliente</span>}
                </div>
                <div className={`${s.progresoCell} ${s.hideTablet}`}>
                  <div className={s.progressBar}>
                    <div className={s.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={s.progressPct}>{Math.round(pct)}%</span>
                </div>
                <div className={s.estadoCell}>
                  <span className={`${s.estadoBadge} ${completa ? s.estado_completada : s.estado_pendiente}`}>
                    {completa ? "Completada" : "Pendiente"}
                  </span>
                </div>
                <div className={`${s.hideMobile}`}>
                  <span className={s.fecha}>{fmt(v.total)}</span>
                </div>
                <div className={s.acciones}>
                  <button className={s.btnVer} onClick={() => setModalVer(v)} title="Ver cuotas">
                    <ion-icon name="eye-outline" />
                  </button>
                  {!completa && proxima && (
                    <button
                      className={s.btnEstado}
                      onClick={() => handlePagarCuota(proxima.id, v.id)}
                      title={`Pagar cuota ${proxima.numero}`}
                      disabled={procesando}
                    >
                      <ion-icon name="checkmark-done-outline" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button disabled={pagina === 1} onClick={() => { const p = pagina - 1; setPagina(p); cargar(busqueda, p) }}>
            <ion-icon name="chevron-back-outline" />
          </button>
          <span>{pagina} / {paginas}</span>
          <button disabled={pagina === paginas} onClick={() => { const p = pagina + 1; setPagina(p); cargar(busqueda, p) }}>
            <ion-icon name="chevron-forward-outline" />
          </button>
        </div>
      )}

      {modalVer && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalVer(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModalVer(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="time-outline" />
              V-{String(modalVer.id).padStart(5, "0")}
              <span className={`${s.estadoBadge} ${modalVer.estado === "completada" ? s.estado_completada : s.estado_pendiente}`}>
                {modalVer.estado === "completada" ? "Completada" : "Pendiente"}
              </span>
            </div>

            <div className={s.verGrid}>
              <div className={s.verField}>
                <span className={s.verLabel}>Cliente</span>
                <span className={s.verVal}>{modalVer.cliente?.nombre ?? "Sin cliente"}</span>
              </div>
              <div className={s.verField}>
                <span className={s.verLabel}>Total</span>
                <span className={s.verVal}>{fmt(modalVer.total)}</span>
              </div>
              <div className={s.verField}>
                <span className={s.verLabel}>Pagado</span>
                <span className={s.verVal}>{fmt(montoPagado(modalVer))}</span>
              </div>
              <div className={s.verField}>
                <span className={s.verLabel}>Pendiente</span>
                <span className={s.verVal}>{fmt(Number(modalVer.total) - montoPagado(modalVer))}</span>
              </div>
            </div>

            <div className={s.verTabla}>
              <div className={s.verTablaHeader}>
                <span>Cuota</span>
                <span className={s.colRight}>Monto</span>
                <span className={s.colRight}>Estado</span>
                <span></span>
              </div>
              {modalVer.venta_cuotas.map(c => (
                <div key={c.id} className={s.verTablaRow}>
                  <span>Cuota {c.numero}</span>
                  <span className={s.colRight}>{fmt(c.monto)}</span>
                  <span className={s.colRight}>
                    <span className={`${s.estadoBadge} ${c.estado === "pagada" ? s.estado_completada : s.estado_pendiente}`}>
                      {c.estado === "pagada" ? "Pagada" : "Pendiente"}
                    </span>
                  </span>
                  <span className={s.colRight}>
                    {c.estado === "pendiente" && (
                      <button
                        className={s.btnEstadoSm}
                        onClick={() => handlePagarCuota(c.id, modalVer.id)}
                        disabled={procesando}
                        title="Registrar pago"
                      >
                        <ion-icon name="checkmark-outline" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className={s.modalAcciones}>
              <button className={s.btnCancelar} onClick={() => setModalVer(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}