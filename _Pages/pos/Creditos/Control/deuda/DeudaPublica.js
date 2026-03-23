"use client"

import { useState, useEffect } from "react"
import s from "./DeudaPublica.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function makeFmt(simbolo) {
  return (n) =>
    `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
}

function fmtFechaCorta(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function diasInfo(diasRestantes) {
  if (diasRestantes < 0)   return { label: `Vencida hace ${Math.abs(diasRestantes)}d`, cls: s.tagVencida, urgente: true  }
  if (diasRestantes === 0) return { label: "Vence HOY",                                cls: s.tagHoy,     urgente: true  }
  if (diasRestantes <= 5)  return { label: `Vence en ${diasRestantes} días`,           cls: s.tagUrgente, urgente: true  }
  return                          { label: `En ${diasRestantes} días`,                 cls: s.tagNormal,  urgente: false }
}

const CUOTAS_POR_PAGINA = 6

function SeccionCuotas({ titulo, icono, cuotas, fmt, tipo }) {
  const [pagina, setPagina] = useState(0)
  const total   = cuotas.length
  const desde   = pagina * CUOTAS_POR_PAGINA
  const hasta   = desde + CUOTAS_POR_PAGINA
  const paginas = Math.ceil(total / CUOTAS_POR_PAGINA)
  const visible = cuotas.slice(desde, hasta)

  return (
    <div className={`${s.cuotasSeccion} ${tipo === "vencida" ? s.cuotasSeccionVencida : s.cuotasSeccionPend}`}>
      <div className={s.cuotasSeccionHead}>
        <span className={s.cuotasSeccionTitulo}>
          {icono === "alert" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          )}
          {titulo}
        </span>
        <span className={`${s.cuotasBadge} ${tipo === "vencida" ? s.cuotasBadgeRojo : s.cuotasBadgeAzul}`}>
          {total}
        </span>
      </div>

      <div className={s.cuotasLista}>
        {visible.map((cu, idx) => {
          const tag = diasInfo(cu.dias_restantes)
          return (
            <div key={cu.id} className={`${s.cuotaItem} ${tag.urgente ? s.cuotaItemUrgente : ""}`}>
              <div className={s.cuotaItemLeft}>
                <span className={s.cuotaNumero}>Cuota {cu.numero}</span>
                <span className={s.cuotaFecha}>{fmtFechaCorta(cu.fecha_vencimiento)}</span>
              </div>
              <div className={s.cuotaItemRight}>
                <span className={s.cuotaMonto}>{fmt(cu.monto)}</span>
                {cu.mora_calculada > 0 && (
                  <span className={s.cuotaMora}>+ {fmt(cu.mora_calculada)} mora</span>
                )}
                <span className={`${s.cuotaTag} ${tag.cls}`}>{tag.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {paginas > 1 && (
        <div className={s.paginacion}>
          <button
            className={s.btnPag}
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Anterior
          </button>
          <span className={s.paginacionInfo}>
            {pagina + 1} de {paginas} · {total} cuotas
          </span>
          <button
            className={s.btnPag}
            onClick={() => setPagina(p => Math.min(paginas - 1, p + 1))}
            disabled={pagina === paginas - 1}
          >
            Siguiente
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

function ContratoCard({ c, expanded, onToggle }) {
  const fmt            = makeFmt(c.moneda?.simbolo ?? "?")
  const cuotasVencidas = c.cuotas.filter(cu => cu.dias_restantes < 0)
  const cuotasPend     = c.cuotas.filter(cu => cu.dias_restantes >= 0)
  const totalCuotas    = c.meses ?? c.cuotas.length
  const pagadas        = Math.max(0, totalCuotas - c.cuotas.length)
  const progreso       = totalCuotas > 0 ? Math.round((pagadas / totalCuotas) * 100) : 0
  const tieneAlerta    = cuotasVencidas.length > 0 || c.mora_contrato > 0
  const proximaCuota   = cuotasPend[0]

  return (
    <div className={`${s.contratoCard} ${tieneAlerta ? s.contratoCardAlerta : ""}`}>

      <button className={s.contratoToggle} onClick={onToggle}>
        <div className={s.contratoToggleLeft}>
          <div className={`${s.contratoIcono} ${tieneAlerta ? s.contratoIconoAlerta : s.contratoIconoOk}`}>
            {tieneAlerta ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            )}
          </div>
          <div className={s.contratoToggleInfo}>
            <span className={s.contratoNum}>Contrato #{c.numero}</span>
            <span className={s.contratoPlan}>{c.plan?.nombre}</span>
          </div>
        </div>
        <div className={s.contratoToggleRight}>
          {tieneAlerta && (
            <span className={s.alertaBadge}>
              {cuotasVencidas.length > 0 ? `${cuotasVencidas.length} vencida${cuotasVencidas.length !== 1 ? "s" : ""}` : "Mora"}
            </span>
          )}
          <span className={`${s.contratoEstado} ${
            c.estado === "activo"     ? s.estActivo     :
            c.estado === "incumplido" ? s.estIncumplido :
            s.estReestructurado
          }`}>{c.estado}</span>
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, color: "var(--color-text-secondary)" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      <div className={s.contratoResumenRapido}>
        <div className={s.miniStat}>
          <span className={s.miniStatLbl}>Saldo</span>
          <span className={s.miniStatVal}>{fmt(c.saldo_pendiente)}</span>
        </div>
        {c.mora_contrato > 0 && (
          <div className={s.miniStat}>
            <span className={s.miniStatLbl}>Mora</span>
            <span className={`${s.miniStatVal} ${s.miniStatMora}`}>{fmt(c.mora_contrato)}</span>
          </div>
        )}
        {proximaCuota && (
          <div className={s.miniStat}>
            <span className={s.miniStatLbl}>Próximo pago</span>
            <span className={s.miniStatVal}>{fmt(proximaCuota.monto)} · {fmtFechaCorta(proximaCuota.fecha_vencimiento)}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className={s.contratoDetalle}>
          <div className={s.progresoWrap}>
            <div className={s.progresoLabelRow}>
              <span className={s.progresoLbl}>Progreso del contrato</span>
              <span className={s.progresoLbl}><strong>{progreso}%</strong> pagado · {pagadas} de {totalCuotas} cuotas</span>
            </div>
            <div className={s.progresoBar}>
              <div className={s.progresoFill} style={{ width: `${progreso}%` }} />
            </div>
            <div className={s.progresoFechas}>
              <span>{fmtFechaCorta(c.fecha_inicio)}</span>
              <span>{fmtFechaCorta(c.fecha_fin)}</span>
            </div>
          </div>

          <div className={s.contratoStats}>
            <div className={s.cStat}>
              <span className={s.cStatLbl}>Cuota periódica</span>
              <span className={s.cStatVal}>{fmt(c.cuota_mensual)}</span>
            </div>
            <div className={s.cStat}>
              <span className={s.cStatLbl}>Monto original</span>
              <span className={s.cStatVal}>{fmt(c.monto_total)}</span>
            </div>
            <div className={s.cStat}>
              <span className={s.cStatLbl}>Tasa anual</span>
              <span className={s.cStatVal}>{Number(c.tasa_anual_pct).toFixed(2)}%</span>
            </div>
            <div className={s.cStat}>
              <span className={s.cStatLbl}>Cuotas restantes</span>
              <span className={s.cStatVal}>{c.cuotas.length}</span>
            </div>
          </div>

          {cuotasVencidas.length > 0 && (
            <SeccionCuotas
              titulo="Cuotas vencidas"
              icono="alert"
              cuotas={cuotasVencidas}
              fmt={fmt}
              tipo="vencida"
            />
          )}

          {cuotasPend.length > 0 && (
            <SeccionCuotas
              titulo="Cuotas pendientes"
              icono="clock"
              cuotas={cuotasPend}
              fmt={fmt}
              tipo="pendiente"
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function DeudaPublica({ token }) {
  const [data,      setData]      = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState("")
  const [expandidos, setExpandidos] = useState({})

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API}/api/pos/creditos/control/deuda/${token}`)
        if (!res.ok) throw new Error("Enlace inválido o expirado")
        const d = await res.json()
        setData(d)
        const init = {}
        d.contratos.forEach((c, i) => { init[c.id] = i === 0 })
        setExpandidos(init)
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [token])

  const toggleContrato = (id) =>
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))

  if (cargando) return (
    <div className={s.shell}>
      <div className={s.loadWrap}>
        <div className={s.spinner} />
        <p>Cargando tu estado de cuenta...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className={s.shell}>
      <div className={s.errorWrap}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h2>Enlace inválido</h2>
        <p>Este enlace no existe o ha expirado. Comunícate con la empresa para obtener uno nuevo.</p>
      </div>
    </div>
  )

  const { cliente, empresa, contratos, totales_moneda } = data
  const hayAlertas = contratos.some(c =>
    c.cuotas.some(cu => cu.dias_restantes < 0) || c.mora_contrato > 0
  )

  return (
    <div className={s.shell}>

      <header className={s.header}>
        <div className={s.headerInner}>
          {empresa?.logo && (
            <img src={empresa.logo} alt={empresa?.nombre} className={s.logo} />
          )}
          <div className={s.empresaInfo}>
            <span className={s.empresaNombre}>{empresa?.nombre ?? "—"}</span>
            {empresa?.telefono && (
              <a href={`tel:${empresa.telefono}`} className={s.empresaContact}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-1a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.5 16"/></svg>
                {empresa.telefono}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className={s.main}>

        <div className={s.clienteCard}>
          <div className={s.clienteAvatar}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className={s.clienteInfo}>
            <h1 className={s.clienteNombre}>Hola, {cliente.nombre.split(" ")[0]}</h1>
            <span className={s.clienteSubtitulo}>Este es tu estado de cuenta</span>
            {cliente.cedula_rnc && <span className={s.clienteMeta}>Cédula: {cliente.cedula_rnc}</span>}
          </div>
        </div>

        {hayAlertas && (
          <div className={s.alertaBanner}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong>Tienes cuotas vencidas o mora pendiente.</strong>
              <span> Por favor comunícate con nosotros para ponerte al día.</span>
            </div>
          </div>
        )}

        {totales_moneda.map(tm => {
          const fmt          = makeFmt(tm.simbolo)
          const totalGeneral = tm.saldo + tm.mora
          return (
            <div key={tm.simbolo} className={s.resumenBloque}>
              {totales_moneda.length > 1 && (
                <p className={s.resumenMonedaLbl}>Moneda: <strong>{tm.simbolo}</strong></p>
              )}
              <div className={s.resumenGrid}>
                <div className={s.resumenCard}>
                  <span className={s.resumenLbl}>Saldo pendiente</span>
                  <span className={s.resumenVal}>{fmt(tm.saldo)}</span>
                </div>
                <div className={`${s.resumenCard} ${tm.mora > 0 ? s.resumenCardMora : ""}`}>
                  <span className={s.resumenLbl}>Mora acumulada</span>
                  <span className={`${s.resumenVal} ${tm.mora > 0 ? s.resumenValMora : s.resumenValCero}`}>
                    {tm.mora > 0 ? fmt(tm.mora) : "Sin mora"}
                  </span>
                </div>
                <div className={`${s.resumenCard} ${s.resumenCardTotal}`} style={{ gridColumn: "1 / -1" }}>
                  <span className={s.resumenLbl}>Total que debes pagar</span>
                  <span className={`${s.resumenVal} ${s.resumenValTotal}`}>{fmt(totalGeneral)}</span>
                </div>
              </div>
            </div>
          )
        })}

        <div className={s.contratosSeccion}>
          <div className={s.contratosHeader}>
            <span className={s.contratostitulo}>
              Tus contratos
              <span className={s.contratosTituloCount}>{contratos.length}</span>
            </span>
            {contratos.length > 1 && (
              <div className={s.contratosBtns}>
                <button className={s.btnExpandAll} onClick={() => {
                  const todosExpandidos = contratos.every(c => expandidos[c.id])
                  const next = {}
                  contratos.forEach(c => { next[c.id] = !todosExpandidos })
                  setExpandidos(next)
                }}>
                  {contratos.every(c => expandidos[c.id]) ? "Colapsar todo" : "Ver todo"}
                </button>
              </div>
            )}
          </div>

          {contratos.map(c => (
            <ContratoCard
              key={c.id}
              c={c}
              expanded={!!expandidos[c.id]}
              onToggle={() => toggleContrato(c.id)}
            />
          ))}
        </div>

        {empresa?.telefono && (
          <div className={s.ctaCard}>
            <div className={s.ctaTexto}>
              <span className={s.ctaTitulo}>¿Tienes alguna duda?</span>
              <span className={s.ctaSubtitulo}>Escríbenos directamente a {empresa.nombre}</span>
            </div>
            <a
              href={`https://wa.me/${(empresa.telefono).replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, soy ${cliente.nombre} y tengo una consulta sobre mi cuenta.`)}`}
              target="_blank"
              rel="noreferrer"
              className={s.ctaBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              Escribir por WhatsApp
            </a>
          </div>
        )}

        <p className={s.generadoAt}>
          Generado el {new Date(data.generado_at).toLocaleDateString("es-DO", {
            day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>

      </main>
    </div>
  )
}