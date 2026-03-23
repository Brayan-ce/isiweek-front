"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  exportarExcelVentas,
  exportarExcelProductos,
  exportarExcelClientes,
  exportarExcelGastos,
} from "./extras/exportarExcel.js"
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import s from "./Reportes.module.css"

const API        = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const COLORES    = ["#1d6fce", "#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"]
const AÑO_ACTUAL = new Date().getFullYear()
const MES_ACTUAL = new Date().getMonth() + 1

const TABS = [
  { key: "ventas",    label: "Ventas",    icon: "cash-outline" },
  { key: "productos", label: "Productos", icon: "cube-outline" },
  { key: "clientes",  label: "Clientes",  icon: "people-outline" },
  { key: "gastos",    label: "Gastos",    icon: "wallet-outline" },
]

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

const AÑOS = [AÑO_ACTUAL, AÑO_ACTUAL - 1, AÑO_ACTUAL - 2]

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })
}

function fmtDateTime(f) {
  if (!f) return ""
  return new Date(f).toLocaleString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function usePaginacion(items = [], porPagina = 15) {
  const [pagina, setPagina] = useState(1)
  const total = Math.ceil(items.length / porPagina)
  const slice = items.slice((pagina - 1) * porPagina, pagina * porPagina)
  useEffect(() => { setPagina(1) }, [items])
  return { slice, pagina, setPagina, total }
}

async function getReporteVentas(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await apiFetch(`/api/pos/reportes/ventas/${empresaId}?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getReporteProductos(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await apiFetch(`/api/pos/reportes/productos/${empresaId}?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getReporteClientes(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await apiFetch(`/api/pos/reportes/clientes/${empresaId}?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getReporteGastos(empresaId, periodo, año, mes) {
  try {
    const p = new URLSearchParams({ periodo, año })
    if (periodo === "mes" && mes !== undefined) p.set("mes", mes)
    const res = await apiFetch(`/api/pos/reportes/gastos/${empresaId}?${p}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function Reportes() {
  const router                        = useRouter()
  const [empresaId, setEmpresaId]     = useState(null)
  const [tab,        setTab]          = useState("ventas")
  const [periodo,    setPeriodo]      = useState("mes")
  const [año,        setAño]          = useState(AÑO_ACTUAL)
  const [mes,        setMes]          = useState(MES_ACTUAL)
  const [data,       setData]         = useState(null)
  const [cargando,   setCargando]     = useState(true)
  const [error,      setError]        = useState(false)
  const [exportando, setExportando]   = useState(false)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    setError(false)
    setData(null)
    try {
      let res = null
      if (tab === "ventas")    res = await getReporteVentas(empresaId, periodo, año, mes)
      if (tab === "productos") res = await getReporteProductos(empresaId, periodo, año, mes)
      if (tab === "clientes")  res = await getReporteClientes(empresaId, periodo, año, mes)
      if (tab === "gastos")    res = await getReporteGastos(empresaId, periodo, año, mes)
      if (!res) { setError(true); return }
      setData(res)
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }, [empresaId, tab, periodo, año, mes])

  useEffect(() => { cargar() }, [cargar])

  async function handleExportar() {
    if (!data || exportando) return
    setExportando(true)
    try {
      if (tab === "ventas")    await exportarExcelVentas(data, data.label)
      if (tab === "productos") await exportarExcelProductos(data, data.label)
      if (tab === "clientes")  await exportarExcelClientes(data, data.label)
      if (tab === "gastos")    await exportarExcelGastos(data, data.label)
    } finally {
      setTimeout(() => setExportando(false), 800)
    }
  }

  if (!empresaId) return (
    <div className={s.page}>
      <div className={s.skeletonWrap}>
        <div className={s.skeletonGrid}>
          {[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}
        </div>
        <div className={s.skeletonChart} />
        <div className={s.skeletonTable} />
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${s.tab} ${tab === t.key ? s.tabActivo : ""}`}
            onClick={() => setTab(t.key)}
          >
            <ion-icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      <div className={s.filtros}>
        <div className={s.selectWrap}>
          <ion-icon name="time-outline" />
          <select className={s.select} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="mes">Por mes</option>
            <option value="trimestre">Trimestre</option>
            <option value="año">Año completo</option>
          </select>
          <ion-icon name="chevron-down-outline" className={s.selectArrow} />
        </div>

        {periodo === "mes" && (
          <div className={s.selectWrap}>
            <ion-icon name="calendar-outline" />
            <select className={s.select} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ion-icon name="chevron-down-outline" className={s.selectArrow} />
          </div>
        )}

        <div className={s.selectWrap}>
          <ion-icon name="archive-outline" />
          <select className={s.select} value={año} onChange={e => setAño(Number(e.target.value))}>
            {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ion-icon name="chevron-down-outline" className={s.selectArrow} />
        </div>

        <button
          className={s.btnExportar}
          onClick={handleExportar}
          disabled={!data || cargando || exportando}
        >
          <ion-icon name={exportando ? "checkmark-outline" : "download-outline"} />
          {exportando ? "Exportado" : "Exportar Excel"}
        </button>
      </div>

      {cargando ? (
        <div className={s.skeletonWrap}>
          <div className={s.skeletonGrid}>
            {[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}
          </div>
          <div className={s.skeletonChart} />
          <div className={s.skeletonTable} />
        </div>
      ) : error || !data ? (
        <div className={s.empty}>
          <ion-icon name="alert-circle-outline" />
          <p>Error al cargar el reporte</p>
          <button className={s.btnReintentar} onClick={cargar}>Reintentar</button>
        </div>
      ) : (
        <>
          {tab === "ventas"    && <TabVentas    data={data} fmt={fmt} fmtFecha={fmtFecha} fmtDateTime={fmtDateTime} />}
          {tab === "productos" && <TabProductos data={data} fmt={fmt} />}
          {tab === "clientes"  && <TabClientes  data={data} fmt={fmt} />}
          {tab === "gastos"    && <TabGastos    data={data} fmt={fmt} fmtDateTime={fmtDateTime} />}
        </>
      )}
    </div>
  )
}

function TabVentas({ data, fmt, fmtFecha, fmtDateTime }) {
  const resumen         = data?.resumen         ?? { total: 0, subtotal: 0, itbis: 0, descuento: 0, cantidad: 0 }
  const ventasPorDia    = data?.ventasPorDia    ?? []
  const ventasPorMetodo = data?.ventasPorMetodo ?? []
  const detalles        = data?.detalles        ?? []
  const pg = usePaginacion(detalles, 15)

  return (
    <>
      <div className={s.statsGrid}>
        <StatCard icon="cash-outline"          label="Total ventas" valor={`RD$ ${fmt(resumen.total)}`}     sub={`${resumen.cantidad} transacciones`} color="#1d6fce" />
        <StatCard icon="receipt-outline"       label="Subtotal"     valor={`RD$ ${fmt(resumen.subtotal)}`}  sub="Sin ITBIS ni descuentos"             color="#0ea5e9" />
        <StatCard icon="pricetag-outline"      label="ITBIS"        valor={`RD$ ${fmt(resumen.itbis)}`}     sub="18% aplicado"                        color="#22c55e" />
        <StatCard icon="trending-down-outline" label="Descuentos"   valor={`RD$ ${fmt(resumen.descuento)}`} sub="Total descontado"                    color="#f59e0b" />
      </div>

      <div className={s.chartsRow}>
        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="bar-chart-outline" /> Evolucion de ventas</div>
          {ventasPorDia.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ventasPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`RD$ ${fmt(v)}`, "Total"]} labelFormatter={fmtFecha} />
                <Line type="monotone" dataKey="total" stroke="#1d6fce" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="pie-chart-outline" /> Por metodo de pago</div>
          {ventasPorMetodo.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ventasPorMetodo} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={75}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {ventasPorMetodo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={v => `RD$ ${fmt(v)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.cardTitle}><ion-icon name="list-outline" /> Detalle de ventas</div>
        {detalles.length === 0 ? <EmptyChart texto="Sin ventas en este periodo" /> : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Metodo</th>
                    <th>Comprobante</th><th>ITBIS</th><th>Descuento</th><th>Total</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.slice.map(v => (
                    <tr key={v.id}>
                      <td className={s.fechaCell}>{fmtDateTime(v.created_at)}</td>
                      <td>{v.cliente?.nombre ?? "Consumidor final"}</td>
                      <td>{v.usuario?.nombre_completo ?? "-"}</td>
                      <td>{v.metodo_pago?.nombre ?? "-"}</td>
                      <td>{v.comprobante?.codigo ?? "-"}</td>
                      <td>RD$ {fmt(v.itbis)}</td>
                      <td>RD$ {fmt(v.descuento)}</td>
                      <td className={s.totalCell}>RD$ {fmt(v.total)}</td>
                      <td>
                        <span className={`${s.badge} ${
                          v.estado === "completada" ? s.badgeCompletada :
                          v.estado === "cancelada"  ? s.badgeCancelada  :
                          s.badgePendiente
                        }`}>{v.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pg={pg} total={detalles.length} />
          </>
        )}
      </div>
    </>
  )
}

function TabProductos({ data, fmt }) {
  const topVendidos       = data?.topVendidos       ?? []
  const resumenCategorias = data?.resumenCategorias ?? []
  const pg = usePaginacion(topVendidos, 15)

  return (
    <>
      <div className={s.chartsRow}>
        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="bar-chart-outline" /> Top 10 por ingresos</div>
          {topVendidos.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topVendidos.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={110}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 14) + "..." : v} />
                <Tooltip formatter={v => [`RD$ ${fmt(v)}`, "Total"]} />
                <Bar dataKey="total" fill="#1d6fce" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="pie-chart-outline" /> Por categoria</div>
          {resumenCategorias.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={resumenCategorias} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {resumenCategorias.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={v => `RD$ ${fmt(v)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.cardTitle}><ion-icon name="cube-outline" /> Ranking de productos</div>
        {topVendidos.length === 0 ? <EmptyChart texto="Sin datos en este periodo" /> : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>#</th><th>Producto</th><th>Categoria</th><th>Precio Unit.</th><th>Uds Vendidas</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {pg.slice.map((p, i) => (
                    <tr key={i}>
                      <td><span className={s.topRank}>{(pg.pagina - 1) * 15 + i + 1}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td className={s.fechaCell}>{p.categoria}</td>
                      <td>RD$ {fmt(p.precio)}</td>
                      <td style={{ fontWeight: 700 }}>{p.cantidad} uds</td>
                      <td className={s.totalCell}>RD$ {fmt(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pg={pg} total={topVendidos.length} />
          </>
        )}
      </div>
    </>
  )
}

function TabClientes({ data, fmt }) {
  const topClientes = data?.topClientes ?? []
  const pg = usePaginacion(topClientes, 15)

  return (
    <>
      <div className={s.chartCard} style={{ marginBottom: "20px" }}>
        <div className={s.cardTitle}><ion-icon name="bar-chart-outline" /> Top clientes por compras</div>
        {topClientes.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topClientes.slice(0, 10)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "..." : v} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`RD$ ${fmt(v)}`, "Total comprado"]} />
              <Bar dataKey="total" fill="#1d6fce" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={s.tableCard}>
        <div className={s.cardTitle}><ion-icon name="people-outline" /> Ranking de clientes</div>
        {topClientes.length === 0 ? <EmptyChart texto="Sin datos en este periodo" /> : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>#</th><th>Cliente</th><th>Telefono</th><th>Compras</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {pg.slice.map((c, i) => (
                    <tr key={i}>
                      <td><span className={s.topRank}>{(pg.pagina - 1) * 15 + i + 1}</span></td>
                      <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                      <td className={s.fechaCell}>{c.telefono}</td>
                      <td style={{ fontWeight: 700 }}>{c.compras} compras</td>
                      <td className={s.totalCell}>RD$ {fmt(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pg={pg} total={topClientes.length} />
          </>
        )}
      </div>
    </>
  )
}

function TabGastos({ data, fmt, fmtDateTime }) {
  const resumen  = data?.resumen  ?? { total: 0, cantidad: 0 }
  const porTipo  = data?.porTipo  ?? []
  const detalles = data?.detalles ?? []
  const pg = usePaginacion(detalles, 15)

  return (
    <>
      <div className={s.statsGrid}>
        <StatCard icon="wallet-outline" label="Total gastos" valor={`RD$ ${fmt(resumen.total)}`} sub={`${resumen.cantidad} registros`} color="#ef4444" />
      </div>

      <div className={s.chartsRow}>
        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="bar-chart-outline" /> Gastos por tipo</div>
          {porTipo.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porTipo} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="tipo" tick={{ fontSize: 10 }} tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "..." : v} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`RD$ ${fmt(v)}`, "Total"]} />
                <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="pie-chart-outline" /> Distribucion por tipo</div>
          {porTipo.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={75}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {porTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={v => `RD$ ${fmt(v)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.cardTitle}><ion-icon name="list-outline" /> Detalle de gastos</div>
        {detalles.length === 0 ? <EmptyChart texto="Sin gastos en este periodo" /> : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Registrado por</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {pg.slice.map(g => (
                    <tr key={g.id}>
                      <td className={s.fechaCell}>{fmtDateTime(g.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{g.concepto}</td>
                      <td className={s.fechaCell}>{g.tipo ?? "-"}</td>
                      <td>{g.usuario?.nombre_completo ?? "-"}</td>
                      <td className={s.totalCell} style={{ color: "#ef4444" }}>RD$ {fmt(g.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pg={pg} total={detalles.length} />
          </>
        )}
      </div>
    </>
  )
}

function StatCard({ icon, label, valor, sub, color }) {
  return (
    <div className={s.statCard}>
      <div className={s.statIcon} style={{ background: `${color}18`, color }}>
        <ion-icon name={icon} />
      </div>
      <div className={s.statInfo}>
        <div className={s.statLabel}>{label}</div>
        <div className={s.statValor}>{valor}</div>
        <div className={s.statSub}>{sub}</div>
      </div>
    </div>
  )
}

function EmptyChart({ texto = "Sin datos en este periodo" }) {
  return (
    <div className={s.emptyChart}>
      <ion-icon name="bar-chart-outline" />
      <span>{texto}</span>
    </div>
  )
}

function Paginacion({ pg, total }) {
  if (pg.total <= 1) return null
  const pages   = Array.from({ length: pg.total }, (_, i) => i + 1)
  const visible = pages.filter(p => Math.abs(p - pg.pagina) <= 2)

  return (
    <div className={s.paginacion}>
      <span>{total} registros · Pagina {pg.pagina} de {pg.total}</span>
      <div className={s.paginaBtns}>
        <button className={s.paginaBtn} onClick={() => pg.setPagina(p => p - 1)} disabled={pg.pagina === 1}>
          <ion-icon name="chevron-back-outline" style={{ fontSize: "13px" }} />
        </button>
        {visible.map(p => (
          <button
            key={p}
            className={`${s.paginaBtn} ${p === pg.pagina ? s.paginaBtnActivo : ""}`}
            onClick={() => pg.setPagina(p)}
          >
            {p}
          </button>
        ))}
        <button className={s.paginaBtn} onClick={() => pg.setPagina(p => p + 1)} disabled={pg.pagina === pg.total}>
          <ion-icon name="chevron-forward-outline" style={{ fontSize: "13px" }} />
        </button>
      </div>
    </div>
  )
}