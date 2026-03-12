"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getDashboardAdmin } from "../api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import s from "../Dashboard.module.css"

const COLORES = ["#1d6fce", "#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"]

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

function fmtHora(f) {
  if (!f) return ""
  return new Date(f).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
}

export default function DashboardAdmin() {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(null)
  const [data, setData]           = useState(null)
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  useEffect(() => {
    if (!empresaId) return
    getDashboardAdmin(empresaId).then(d => { setData(d); setCargando(false) })
  }, [empresaId])

  if (!empresaId || cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>
        {[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  if (!data) return (
    <div className={s.page}>
      <div className={s.empty}><ion-icon name="alert-circle-outline" /><p>Error al cargar datos</p></div>
    </div>
  )

  const { stats, ultimasVentas, cajaActiva, stockBajo, topProductos, ventasPorDia, ventasPorMetodo } = data

  return (
    <div className={s.page}>

      <div className={s.statsGrid}>
        <StatCard icon="today-outline"       label="Ventas hoy"  valor={`RD$ ${fmt(stats.totalHoy)}`}    sub={`${stats.ventasHoy} transacciones`}   color="#1d6fce" />
        <StatCard icon="calendar-outline"    label="Esta semana" valor={`RD$ ${fmt(stats.totalSemana)}`} sub={`${stats.ventasSemana} transacciones`} color="#0ea5e9" />
        <StatCard icon="stats-chart-outline" label="Este mes"    valor={`RD$ ${fmt(stats.totalMes)}`}   sub={`${stats.ventasMes} transacciones`}    color="#22c55e" />
        <StatCard
          icon="wallet-outline"
          label="Caja activa"
          valor={cajaActiva ? cajaActiva.caja.nombre : "Sin caja"}
          sub={cajaActiva ? `RD$ ${fmt(cajaActiva.caja.saldo_actual)}` : "Ninguna abierta"}
          color="#f59e0b"
        />
      </div>

      <div className={s.chartsRow}>
        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="bar-chart-outline" /> Ventas del mes por dia</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ventasPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="fecha" tickFormatter={v => fmtFecha(v)} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`RD$ ${fmt(v)}`, "Total"]} labelFormatter={fmtFecha} />
              <Bar dataKey="total" fill="#1d6fce" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={s.chartCard}>
          <div className={s.cardTitle}><ion-icon name="pie-chart-outline" /> Ventas por metodo de pago</div>
          {ventasPorMetodo.length === 0 ? (
            <div className={s.emptyChart}>Sin datos este mes</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ventasPorMetodo} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                  label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {ventasPorMetodo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={v => `RD$ ${fmt(v)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={s.bottomRow}>
        <div className={s.tableCard}>
          <div className={s.cardTitle}><ion-icon name="receipt-outline" /> Ultimas ventas</div>
          {ultimasVentas.length === 0 ? (
            <div className={s.emptyChart}>Sin ventas registradas</div>
          ) : (
            <div className={s.tableWrap}>
              <div className={s.tableHeader}>
                <span>Cliente</span>
                <span>Vendedor</span>
                <span>Metodo</span>
                <span>Total</span>
                <span>Hora</span>
              </div>
              {ultimasVentas.map(v => (
                <div key={v.id} className={s.tableRow}>
                  <span>{v.cliente?.nombre ?? "Consumidor final"}</span>
                  <span>{v.usuario?.nombre_completo ?? "—"}</span>
                  <span>{v.metodo_pago?.nombre ?? "—"}</span>
                  <span className={s.totalCell}>RD$ {fmt(v.total)}</span>
                  <span className={s.fechaCell}>{fmtHora(v.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={s.sideCards}>
          <div className={s.tableCard}>
            <div className={s.cardTitle}><ion-icon name="trophy-outline" /> Top productos del mes</div>
            {topProductos.length === 0 ? (
              <div className={s.emptyChart}>Sin datos</div>
            ) : (
              <div className={s.topList}>
                {topProductos.map((p, i) => (
                  <div key={i} className={s.topItem}>
                    <span className={s.topRank}>{i + 1}</span>
                    <span className={s.topNombre}>{p.nombre}</span>
                    <span className={s.topCantidad}>{p.cantidad} uds</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={s.tableCard}>
            <div className={s.cardTitle}><ion-icon name="warning-outline" /> Stock bajo</div>
            {stockBajo.length === 0 ? (
              <div className={s.emptyChart}>Todo el stock esta bien</div>
            ) : (
              <div className={s.topList}>
                {stockBajo.map(p => (
                  <div key={p.id} className={s.topItem}>
                    <span className={s.stockNombre}>{p.nombre}</span>
                    <span className={`${s.stockNum} ${p.stock === 0 ? s.stockCero : s.stockBajo}`}>
                      {p.stock} uds
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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