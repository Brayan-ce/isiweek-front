"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import s from "./Pagos.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
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
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function diasInfo(fecha) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const d    = new Date(fecha); d.setHours(0,0,0,0)
  const diff = Math.round((d - hoy) / 86400000)
  if (diff < 0)   return { label: `Vencida ${Math.abs(diff)}d`, cls: s.diasVencida }
  if (diff === 0) return { label: "Hoy",                        cls: s.diasHoy     }
  if (diff <= 5)  return { label: `En ${diff}d`,                cls: s.diasUrgente }
  return              { label: `En ${diff}d`,                   cls: s.diasNormal  }
}

const ESTADO_LABEL = { pendiente: "Pendiente", pagada: "Pagada", vencida: "Vencida", parcial: "Parcial" }
const ESTADO_CLS   = { pendiente: s.badgePendiente, pagada: s.badgePagada, vencida: s.badgeVencida, parcial: s.badgeParcial }
const UNIDAD_LABEL = { dias: "días", semanas: "semanas", meses: "meses" }

const FILTROS = [
  { key: "nombre",      label: "Nombre A a Z",         icon: "text-outline"          },
  { key: "nombre_desc", label: "Nombre Z a A",         icon: "text-outline"          },
  { key: "saldo_desc",  label: "Mayor saldo primero",  icon: "trending-up-outline"   },
  { key: "saldo_asc",   label: "Menor saldo primero",  icon: "trending-down-outline" },
  { key: "vencidas",    label: "Mas vencidas primero", icon: "alert-circle-outline"  },
]

function PagoSheet({ cuotas, contratoId, empresaId, payload, metodos, simbolo, onClose, onPagado }) {
  const fmt = makeFmt(simbolo)

  const [metodo,     setMetodo]  = useState("")
  const [monto_mora, setMora]    = useState("0")
  const [ref,        setRef]     = useState("")
  const [notas,      setNotas]   = useState("")
  const [pagando,    setPagando] = useState(false)
  const [error,      setError]   = useState("")

  const montoBase = cuotas.reduce((a, c) => a + Number(c.monto), 0)
  const total     = montoBase + Number(monto_mora || 0)

  const pagar = async () => {
    setError(""); setPagando(true)
    try {
      const res = await fetch(
        `${API}/api/pos/creditos/pagos/${empresaId}/contratos/${contratoId}/pagar`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuotas_ids:     cuotas.map(c => c.id),
            monto_mora:     Number(monto_mora || 0),
            metodo_pago_id: metodo || null,
            referencia:     ref    || null,
            notas:          notas  || null,
            usuario_id:     payload.id,
          }),
        }
      )
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? "Error al registrar")
      onPagado(d.monto)
    } catch (e) {
      setError(e.message)
    } finally {
      setPagando(false)
    }
  }

  return (
    <div className={s.sheetOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHandle} />
        <div className={s.sheetHead}>
          <span className={s.sheetTitulo}>
            {cuotas.length === 1 ? `Pagar cuota #${cuotas[0].numero}` : `Pagar ${cuotas.length} cuotas`}
          </span>
          <button className={s.sheetClose} onClick={onClose}><ion-icon name="close-outline" /></button>
        </div>
        <div className={s.sheetBody}>
          {error && <div className={s.alertError}>{error}</div>}
          <div className={s.sheetResumen}>
            {cuotas.map(c => (
              <div key={c.id} className={s.sheetCuotaRow}>
                <span className={s.sheetCuotaNum}>Cuota #{c.numero}</span>
                <span className={s.sheetCuotaFecha}>{fmtFecha(c.fecha_vencimiento)}</span>
                <span className={s.sheetCuotaMonto}>{fmt(c.monto)}</span>
              </div>
            ))}
            {Number(monto_mora) > 0 && (
              <div className={`${s.sheetCuotaRow} ${s.sheetMoraRow}`}>
                <span>Mora adicional</span><span /><span className={s.moraColor}>{fmt(monto_mora)}</span>
              </div>
            )}
            <div className={`${s.sheetCuotaRow} ${s.sheetTotalRow}`}>
              <span>Total</span><span /><span className={s.totalColor}>{fmt(total)}</span>
            </div>
          </div>
          <div className={s.campo}>
            <label>Mora adicional</label>
            <div className={s.inputPref}>
              <span>{simbolo}</span>
              <input type="number" min="0" step="0.01" value={monto_mora} onChange={e => setMora(e.target.value)} />
            </div>
          </div>
          <div className={s.campo}>
            <label>Metodo de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="">Seleccionar...</option>
              {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className={s.campo}>
            <label>Referencia <span className={s.opc}>(opcional)</span></label>
            <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Nro. transferencia, cheque..." />
          </div>
          <div className={s.campo}>
            <label>Notas <span className={s.opc}>(opcional)</span></label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} />
          </div>
        </div>
        <div className={s.sheetFoot}>
          <button className={s.btnCancelarSheet} onClick={onClose} disabled={pagando}>Cancelar</button>
          <button className={s.btnPagarSheet} onClick={pagar} disabled={pagando}>
            {pagando ? "Registrando..." : `Pagar ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistorialPagos({ contratoId, empresaId, simbolo, onRevertido }) {
  const fmt = makeFmt(simbolo)

  const [pagos,       setPagos]   = useState(null)
  const [cargando,    setCargando] = useState(true)
  const [revirtiendo, setRevert]  = useState(null)
  const [error,       setError]   = useState("")

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/pagos/${empresaId}/contratos/${contratoId}`)
      if (res.ok) { const d = await res.json(); setPagos(d.pagos ?? []) }
    } catch {}
    setCargando(false)
  }, [contratoId, empresaId])

  useEffect(() => { cargar() }, [cargar])

  const revertir = async pagoId => {
    if (!confirm("Revertir este pago?")) return
    setRevert(pagoId)
    try {
      const res  = await apiFetch(`/api/pos/creditos/pagos/${empresaId}/pagos/${pagoId}/revertir`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error")
      await cargar(); onRevertido()
    } catch (e) { setError(e.message) }
    finally { setRevert(null) }
  }

  if (cargando) return <div className={s.histCargando}><div className={s.spinner} /></div>
  if (!pagos?.length) return <div className={s.histVacio}><ion-icon name="time-outline" /><p>Sin pagos registrados</p></div>

  return (
    <div className={s.histLista}>
      {error && <div className={s.alertError}>{error}</div>}
      {pagos.map(p => (
        <div key={p.id} className={s.histItem}>
          <div className={s.histLeft}>
            <span className={s.histMonto}>{fmt(p.monto)}</span>
            <span className={s.histMeta}>{p.metodo_pago?.nombre ?? "Sin metodo"} · {p.usuario?.nombre_completo ?? ""}</span>
            {p.pago_cuotas?.length > 0 && (
              <span className={s.histCuotas}>Cuota{p.pago_cuotas.length > 1 ? "s" : ""}: {p.pago_cuotas.map(pc => `#${pc.cuota?.numero}`).join(", ")}</span>
            )}
            {p.referencia && <span className={s.histRef}>Ref: {p.referencia}</span>}
            {p.notas      && <span className={s.histRef}>{p.notas}</span>}
          </div>
          <div className={s.histRight}>
            <span className={s.histFecha}>{fmtFecha(p.fecha)}</span>
            {Number(p.monto_mora) > 0 && <span className={s.histMoraTag}>+{fmt(p.monto_mora)} mora</span>}
            <button className={s.btnRevertir} onClick={() => revertir(p.id)} disabled={revirtiendo === p.id} title="Revertir">
              <ion-icon name={revirtiendo === p.id ? "hourglass-outline" : "arrow-undo-outline"} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ContratoExpandido({ contrato, empresaId, payload, metodos, onActualizado }) {
  const simbolo = contrato.moneda?.simbolo ?? "RD$"
  const fmt     = makeFmt(simbolo)

  const [cuotas,    setCuotas]    = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [selec,     setSelec]     = useState([])
  const [sheet,     setSheet]     = useState(null)
  const [tabActiva, setTabActiva] = useState("cuotas")
  const [toast,     setToast]     = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await apiFetch(`/api/pos/creditos/pagos/${empresaId}/contratos/${contrato.id}`)
      if (res.ok) { const d = await res.json(); setCuotas(d.contrato?.cuotas ?? []) }
    } catch {}
    setCargando(false)
  }, [contrato.id, empresaId])

  useEffect(() => { cargar() }, [cargar])

  const mostrarToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000)
  }

  const calcularBloqueadas = (lista) => {
    if (!lista) return new Set()
    const bloqueadas = new Set()
    let encontroPrimera = false
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i]
      if (c.estado === "pagada") continue
      if (!encontroPrimera) { encontroPrimera = true; continue }
      const anterior = lista[i - 1]
      if (anterior.estado !== "pagada" && !selec.includes(anterior.id)) bloqueadas.add(c.id)
    }
    return bloqueadas
  }

  const bloqueadas          = calcularBloqueadas(cuotas)
  const cuotasSeleccionadas = cuotas?.filter(c => selec.includes(c.id)) ?? []
  const saldoPagado         = cuotas?.filter(c => c.estado === "pagada").length ?? 0
  const saldoTotal          = cuotas?.length ?? 0
  const pct                 = saldoTotal > 0 ? Math.round((saldoPagado / saldoTotal) * 100) : 0

  const toggleCuota = (cuota) => {
    if (bloqueadas.has(cuota.id) || cuota.estado === "pagada") return
    setSelec(prev => prev.includes(cuota.id) ? prev.filter(id => id !== cuota.id) : [...prev, cuota.id])
  }

  return (
    <div className={s.contratoExpandido}>
      {toast && (
        <div className={`${s.toastInline} ${toast.tipo === "error" ? s.toastError : s.toastOk}`}>
          <ion-icon name={toast.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {toast.msg}
        </div>
      )}

      <div className={s.contratoResumen}>
        <div className={s.resGrid}>
          <div className={s.resItem}><span className={s.resLbl}>Plan</span><span className={s.resVal}>{contrato.plan?.nombre}</span></div>
          <div className={s.resItem}><span className={s.resLbl}>Plazo</span><span className={s.resVal}>{contrato.plazo_valor} {UNIDAD_LABEL[contrato.plazo_unidad] ?? "meses"}</span></div>
          <div className={s.resItem}><span className={s.resLbl}>Cuota</span><span className={s.resVal}>{fmt(contrato.cuota_mensual)}</span></div>
          <div className={s.resItem}><span className={s.resLbl}>Saldo</span><span className={`${s.resVal} ${s.resRojo}`}>{fmt(contrato.saldo_pendiente)}</span></div>
        </div>
        <div className={s.progressWrap}>
          <div className={s.progressBar}><div className={s.progressFill} style={{ width: `${pct}%` }} /></div>
          <span className={s.progressLbl}>{saldoPagado}/{saldoTotal} cuotas pagadas ({pct}%)</span>
        </div>
      </div>

      <div className={s.contratoTabs}>
        <button className={`${s.ctab} ${tabActiva === "cuotas" ? s.ctabActivo : ""}`} onClick={() => setTabActiva("cuotas")}>
          Cuotas <span className={s.ctabCount}>{cuotas?.length ?? 0}</span>
        </button>
        <button className={`${s.ctab} ${tabActiva === "historial" ? s.ctabActivo : ""}`} onClick={() => setTabActiva("historial")}>
          Historial de pagos
        </button>
      </div>

      {tabActiva === "cuotas" && (
        cargando ? (
          <div className={s.cuotasCargando}>{[...Array(3)].map((_, i) => <div key={i} className={s.skeletonCuota} />)}</div>
        ) : (
          <div className={s.cuotasLista}>
            {cuotas?.map(c => {
              const pagada = c.estado === "pagada"
              const bloq   = bloqueadas.has(c.id)
              const sel    = selec.includes(c.id)
              const dias   = !pagada ? diasInfo(c.fecha_vencimiento) : null
              return (
                <div
                  key={c.id}
                  className={`${s.cuotaItem} ${sel ? s.cuotaSel : ""} ${pagada ? s.cuotaPagada : ""} ${bloq ? s.cuotaBloq : ""}`}
                  onClick={() => toggleCuota(c)}
                >
                  <div className={s.cuotaIzq}>
                    {pagada ? (
                      <ion-icon name="checkmark-circle" class={s.iconPagada} />
                    ) : bloq ? (
                      <ion-icon name="lock-closed-outline" class={s.iconBloq} />
                    ) : (
                      <div className={`${s.checkbox} ${sel ? s.checkboxSel : ""}`}>
                        {sel && <ion-icon name="checkmark-outline" />}
                      </div>
                    )}
                  </div>
                  <div className={s.cuotaInfo}>
                    <div className={s.cuotaInfoTop}>
                      <span className={s.cuotaNum}>Cuota #{c.numero}</span>
                      <span className={`${s.estadoBadge} ${ESTADO_CLS[c.estado] ?? ""}`}>{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                      {dias && <span className={`${s.diasBadge} ${dias.cls}`}>{dias.label}</span>}
                    </div>
                    <span className={s.cuotaFecha}>{fmtFecha(c.fecha_vencimiento)}</span>
                    {Number(c.mora) > 0 && <span className={s.cuotaMoraTag}>+{fmt(c.mora)} mora acumulada</span>}
                  </div>
                  <div className={s.cuotaDer}>
                    <span className={s.cuotaMonto}>{fmt(c.monto)}</span>
                    {!pagada && !bloq && (
                      <button className={s.btnPagarCuota} onClick={e => { e.stopPropagation(); setSheet([c]) }}>
                        Pagar
                      </button>
                    )}
                    {bloq && <span className={s.bloqHint}>Paga la anterior</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tabActiva === "historial" && (
        <HistorialPagos
          contratoId={contrato.id}
          empresaId={empresaId}
          simbolo={simbolo}
          onRevertido={() => { cargar(); onActualizado() }}
        />
      )}

      {selec.length > 0 && tabActiva === "cuotas" && (
        <div className={s.barraFlotante}>
          <div className={s.barraInfo}>
            <span className={s.barraCuotas}>{selec.length} cuota{selec.length !== 1 ? "s" : ""} seleccionada{selec.length !== 1 ? "s" : ""}</span>
            <span className={s.barraMonto}>{fmt(cuotasSeleccionadas.reduce((a, c) => a + Number(c.monto), 0))}</span>
          </div>
          <div className={s.barraAcciones}>
            <button className={s.btnLimpiar} onClick={() => setSelec([])}>Limpiar</button>
            <button className={s.btnPagarSelec} onClick={() => setSheet(cuotasSeleccionadas)}>
              <ion-icon name="cash-outline" />
              Pagar seleccionadas
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <PagoSheet
          cuotas={sheet}
          contratoId={contrato.id}
          empresaId={empresaId}
          payload={payload}
          metodos={metodos}
          simbolo={simbolo}
          onClose={() => setSheet(null)}
          onPagado={(monto) => {
            setSheet(null); setSelec([])
            mostrarToast(`Pago de ${fmt(monto)} registrado`)
            cargar(); onActualizado()
          }}
        />
      )}
    </div>
  )
}

export default function Pagos() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const [payload,    setPayload]    = useState(null)
  const [empresaId,  setEmpresaId]  = useState(null)
  const [clientes,   setClientes]   = useState([])
  const [metodos,    setMetodos]    = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [expandido,  setExpandido]  = useState(null)
  const [toast,      setToast]      = useState(null)
  const [filtroOpen, setFiltroOpen] = useState(false)
  const [orden,      setOrden]      = useState("nombre")

  const debounceRef = useRef(null)
  const filtroRef   = useRef(null)

  useEffect(() => {
    const p = getTokenPayload()
    if (!p) { router.push("/pos/login"); return }
    setPayload(p); setEmpresaId(p.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    try {
      const [rC, rM] = await Promise.all([
        fetch(`${API}/api/pos/creditos/pagos/${empresaId}/clientes`),
        fetch(`${API}/api/pos/creditos/pagos/metodos`),
      ])
      if (rC.ok) setClientes(await rC.json())
      if (rM.ok) setMetodos(await rM.json())
    } catch {}
    setCargando(false)
  }, [empresaId])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const handler = e => {
      if (filtroRef.current && !filtroRef.current.contains(e.target)) setFiltroOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const busqueda = searchParams.get("q")   ?? ""
  const urlCid   = Number(searchParams.get("cid")  ?? 0)
  const urlCtid  = Number(searchParams.get("ctid") ?? 0)

  useEffect(() => {
    if (urlCid && urlCtid && clientes.length > 0) {
      setExpandido(`${urlCid}-${urlCtid}`)
    }
  }, [urlCid, urlCtid, clientes.length])

  const mostrarToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000)
  }

  const setBusqueda = (val) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (val) params.set("q", val)
      else     params.delete("q")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, 300)
  }

  const filtrados = clientes
    .filter(({ cliente }) => {
      const q = busqueda.toLowerCase()
      return (
        (cliente?.nombre     ?? "").toLowerCase().includes(q) ||
        (cliente?.cedula_rnc ?? "").toLowerCase().includes(q) ||
        (cliente?.telefono   ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const saldoA = a.contratos.reduce((x, c) => x + Number(c.saldo_pendiente ?? 0), 0)
      const saldoB = b.contratos.reduce((x, c) => x + Number(c.saldo_pendiente ?? 0), 0)
      const vencA  = a.contratos.reduce((x, c) => x + c.cuotas_vencidas, 0)
      const vencB  = b.contratos.reduce((x, c) => x + c.cuotas_vencidas, 0)
      if (orden === "nombre")      return a.cliente.nombre.localeCompare(b.cliente.nombre)
      if (orden === "nombre_desc") return b.cliente.nombre.localeCompare(a.cliente.nombre)
      if (orden === "saldo_desc")  return saldoB - saldoA
      if (orden === "saldo_asc")   return saldoA - saldoB
      if (orden === "vencidas")    return vencB - vencA
      return 0
    })

  const totalContratos = clientes.reduce((a, c) => a + c.contratos.length, 0)

  const toggleExpandido = (clienteId, contratoId) => {
    const key = `${clienteId}-${contratoId}`
    setExpandido(prev => prev === key ? null : key)
  }

  return (
    <div className={s.page}>

      {toast && (
        <div className={`${s.toast} ${toast.tipo === "error" ? s.toastError : s.toastOk}`}>
          <ion-icon name={toast.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {toast.msg}
        </div>
      )}

      <div className={s.topRow}>
        <div className={s.topLeft}>
          <h1 className={s.titulo}>Pagos</h1>
          <span className={s.subtitulo}>
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} · {totalContratos} contrato{totalContratos !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={s.topControls}>
          <div className={s.searchWrap}>
            <ion-icon name="search-outline" />
            <input
              defaultValue={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className={s.searchInput}
            />
            {busqueda && (
              <button className={s.searchClear} onClick={() => { setBusqueda(""); router.replace(pathname, { scroll: false }) }}>
                <ion-icon name="close-circle-outline" />
              </button>
            )}
          </div>
          <div ref={filtroRef} style={{ position: "relative" }}>
            <button
              className={`${s.filterBtn} ${orden !== "nombre" ? s.filterBtnActivo : ""}`}
              onClick={() => setFiltroOpen(p => !p)}
            >
              <ion-icon name="funnel-outline" />
              Ordenar
            </button>
            {filtroOpen && (
              <div className={s.filterDropdown}>
                {FILTROS.map(f => (
                  <div
                    key={f.key}
                    className={`${s.filterOption} ${orden === f.key ? s.filterOptionActivo : ""}`}
                    onClick={() => { setOrden(f.key); setFiltroOpen(false) }}
                  >
                    <ion-icon name={f.icon} />
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className={s.listaWrap}>
          {[...Array(4)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className={s.vacio}>
          <ion-icon name="people-outline" />
          <p>{busqueda ? "Sin resultados para esa busqueda" : "No hay clientes con contratos activos"}</p>
        </div>
      ) : (
        <div className={s.listaWrap}>
          {filtrados.map(({ cliente, contratos }) => {
            const tieneVencidas = contratos.some(c => c.cuotas_vencidas > 0)
            const totalVencidas = contratos.reduce((a, c) => a + c.cuotas_vencidas, 0)

            const saldosPorMoneda = {}
            for (const ct of contratos) {
              const sim = ct.moneda?.simbolo ?? "RD$"
              saldosPorMoneda[sim] = (saldosPorMoneda[sim] ?? 0) + Number(ct.saldo_pendiente ?? 0)
            }
            const saldoTexto = Object.entries(saldosPorMoneda)
              .map(([sim, monto]) => makeFmt(sim)(monto))
              .join(" · ")

            return (
              <div key={cliente.id} className={`${s.clienteBloque} ${tieneVencidas ? s.clienteBloqueAlerta : ""}`}>
                <div className={s.clienteHead}>
                  <div className={s.clienteAvatar}>{cliente.nombre.charAt(0).toUpperCase()}</div>
                  <div className={s.clienteInfo}>
                    <div className={s.clienteNombreRow}>
                      <span className={s.clienteNombre}>{cliente.nombre}</span>
                      {tieneVencidas && (
                        <span className={s.alertaBadge}>
                          <ion-icon name="alert-circle-outline" />
                          {totalVencidas} vencida{totalVencidas !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className={s.clienteMeta}>
                      {cliente.cedula_rnc && <span>{cliente.cedula_rnc}</span>}
                      {cliente.telefono && (
                        <a href={`https://wa.me/${cliente.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className={s.waLink} onClick={e => e.stopPropagation()}>
                          <ion-icon name="logo-whatsapp" />{cliente.telefono}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={s.clienteDer}>
                    <span className={s.clienteSaldo}>{saldoTexto}</span>
                    <span className={s.clienteContratos}>{contratos.length} contrato{contratos.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className={s.contratosLista}>
                  {contratos.map(ct => {
                    const fmtCt       = makeFmt(ct.moneda?.simbolo ?? "RD$")
                    const key         = `${cliente.id}-${ct.id}`
                    const estaAbierto = expandido === key
                    return (
                      <div key={ct.id} className={`${s.contratoBloque} ${ct.cuotas_vencidas > 0 ? s.contratoBloqueAlerta : ""}`}>
                        <div className={s.contratoFila} onClick={() => toggleExpandido(cliente.id, ct.id)}>
                          <div className={s.contratoFilaIzq}>
                            <div className={s.contratoNumRow}>
                              <span className={s.contratoNum}>#{ct.numero}</span>
                              <span className={`${s.estadoTag} ${s[`est_${ct.estado}`] ?? ""}`}>{ct.estado}</span>
                              {ct.cuotas_vencidas > 0 && (
                                <span className={s.vencBadge}>
                                  <ion-icon name="alert-circle-outline" />
                                  {ct.cuotas_vencidas} vencida{ct.cuotas_vencidas !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className={s.contratoStats}>
                              <span><strong>{fmtCt(ct.saldo_pendiente)}</strong> saldo</span>
                              <span>{fmtCt(ct.cuota_mensual)} / cuota</span>
                              <span>{ct.plazo_valor} {UNIDAD_LABEL[ct.plazo_unidad] ?? "meses"}</span>
                            </div>
                            {ct.proxima_cuota && (() => {
                              const d = diasInfo(ct.proxima_cuota.fecha_vencimiento)
                              return (
                                <div className={s.proximaFila}>
                                  <ion-icon name="time-outline" />
                                  Proxima: {fmtFecha(ct.proxima_cuota.fecha_vencimiento)} · {fmtCt(ct.proxima_cuota.monto)}
                                  <span className={`${s.diasBadge} ${d.cls}`}>{d.label}</span>
                                </div>
                              )
                            })()}
                          </div>
                          <ion-icon name={estaAbierto ? "chevron-up-outline" : "chevron-down-outline"} class={s.chevron} />
                        </div>

                        {estaAbierto && (
                          <ContratoExpandido
                            contrato={ct}
                            empresaId={empresaId}
                            payload={payload}
                            metodos={metodos}
                            onActualizado={cargar}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}