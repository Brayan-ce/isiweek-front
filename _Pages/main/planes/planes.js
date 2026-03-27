"use client"

import { useState, useEffect, useRef } from "react"
import s from "./planes.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const MODULOS = {
  pos:      { id:"pos",      icono:"cart-outline",       label:"POS avanzado",     desc:"Ventas, caja, inventario, reportes",     grupo:"comercial", mes:15, anio:12 },
  creditos: { id:"creditos", icono:"card-outline",       label:"Cartera créditos", desc:"Contratos, cuotas, control de mora",      grupo:"comercial", mes:19, anio:15 },
  online:   { id:"online",   icono:"bag-handle-outline", label:"Ventas online",    desc:"Catálogo público, pedidos, WhatsApp",     grupo:"comercial", mes:19, anio:15 },
  obras:    { id:"obras",    icono:"construct-outline",  label:"Gestión de obras", desc:"Proyectos, asistencia, gastos, reportes", grupo:"obras",     mes:19, anio:15 },
}

const NAV_MODULOS = {
  pos: [
    { nombre:"Dashboard",    icono:"grid-outline",          precio:1 },
    { nombre:"Vender",       icono:"pricetag-outline",      precio:2 },
    { nombre:"Productos",    icono:"cube-outline",          precio:1 },
    { nombre:"Clientes",     icono:"people-outline",        precio:1 },
    { nombre:"Inventario",   icono:"layers-outline",        precio:2 },
    { nombre:"Reportes",     icono:"bar-chart-outline",     precio:1 },
    { nombre:"Cajas",        icono:"cash-outline",          precio:1 },
    { nombre:"Gastos",       icono:"receipt-outline",       precio:1 },
    { nombre:"Compras",      icono:"cart-outline",          precio:2 },
    { nombre:"Proveedores",  icono:"business-outline",      precio:1 },
    { nombre:"Cotizaciones", icono:"document-outline",      precio:1 },
    { nombre:"Mis Ventas",   icono:"stats-chart-outline",   precio:1 },
  ],
  creditos: [
    { nombre:"Dashboard",         icono:"grid-outline",             precio:5  },
    { nombre:"Planes de crédito", icono:"list-outline",             precio:8  },
    { nombre:"Contratos",         icono:"document-text-outline",    precio:12 },
    { nombre:"Control",           icono:"shield-checkmark-outline", precio:8  },
    { nombre:"Pagos",             icono:"wallet-outline",           precio:8  },
    { nombre:"Mora y alertas",    icono:"alert-circle-outline",     precio:8  },
  ],
  online: [
    { nombre:"Catálogo", icono:"storefront-outline", precio:10 },
    { nombre:"Pedidos",  icono:"cube-outline",       precio:9  },
  ],
  obras: [
    { nombre:"Dashboard",         icono:"grid-outline",      precio:3 },
    { nombre:"Mis obras",         icono:"business-outline",  precio:5 },
    { nombre:"Trabajadores",      icono:"people-outline",    precio:5 },
    { nombre:"Asistencia diaria", icono:"calendar-outline",  precio:5 },
    { nombre:"Gastos de obra",    icono:"receipt-outline",   precio:5 },
    { nombre:"Reportes",         icono:"bar-chart-outline", precio:6 },
  ],
}

const FEATURES_MODULO = {
  pos:      ["Ventas rápidas con caja integrada","Múltiples métodos de pago","Control de inventario","Reportes de ventas","Gestión de clientes","Comprobantes fiscales"],
  creditos: ["Contratos de crédito","Cuotas automáticas","Control de mora","Pagos parciales","Fiadores y activos","Alertas de vencimiento"],
  online:   ["Catálogo público con URL propia","Pedidos online","Productos destacados","WhatsApp integrado","Horarios y dirección","Sin comisión por venta"],
  obras:    ["Proyectos y obras ilimitadas","Registro de asistencia diaria","Control de gastos por obra","Trabajadores y cargos","Reportes de avance","Presupuesto vs. real"],
}

const BUNDLES = [
  { id:"pos_creditos", label:"POS + Créditos",         modulos:["pos","creditos"],          descuento:5, popular:false },
  { id:"pos_online",   label:"POS + Online",            modulos:["pos","online"],            descuento:5, popular:true  },
  { id:"comercial",    label:"Todo comercial",          modulos:["pos","creditos","online"], descuento:9, popular:false },
]

const UNIDADES = [
  { id:"dia",  label:"Días",    factor: 1/30   },
  { id:"sem",  label:"Semanas", factor: 1/4.33 },
  { id:"mes",  label:"Meses",   factor: 1      },
  { id:"anio", label:"Años",    factor: 12     },
]

const MAX_SLIDER = { dia:30, sem:12, mes:24, anio:3 }

function calcBundle(b, ciclo) {
  const sumMes    = b.modulos.reduce((t, id) => t + MODULOS[id].mes, 0)
  const mesFinal  = sumMes - b.descuento
  const anioFinal = Math.round(mesFinal * 12 * 0.8)
  if (ciclo === "anio") {
    return { precio:anioFinal, sufijo:"/año", nota:`Equiv. $${Math.round(anioFinal/12)}/mes`, ahorro:b.descuento }
  }
  return { precio:mesFinal, sufijo:"/mes", nota:`$${anioFinal}/año pagando anual`, ahorro:b.descuento }
}

export default function PlanesPage() {
  const canvasRef             = useRef()
  const [ciclo, setCiclo]     = useState("mes")
  const [config, setConfig]   = useState({})
  const [tab, setTab]         = useState("planes")
  const [navSel, setNavSel]   = useState({ pos:[], creditos:[], online:[], obras:[] })
  const [navOpen, setNavOpen] = useState({})
  const [aviso, setAviso]     = useState(null)
  const [duracion, setDuracion] = useState(1)
  const [unidad, setUnidad]     = useState("mes")

  useEffect(() => {
    fetch(`${API}/api/auth/config`).then(r=>r.ok?r.json():{}).then(setConfig).catch(()=>{})
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight
    const dots = Array.from({length:32}, ()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
      r:Math.random()*1.5+.8,
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0,0,W,H)
      const dk = document.documentElement.getAttribute("data-theme")==="dark"
      const dc = dk?"rgba(96,165,250,0.35)":"rgba(29,111,206,0.18)"
      const lc = dk?"rgba(96,165,250,0.06)":"rgba(29,111,206,0.05)"
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy
        if(d.x<0)d.x=W; if(d.x>W)d.x=0; if(d.y<0)d.y=H; if(d.y>H)d.y=0
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2)
        ctx.fillStyle=dc; ctx.fill()
      })
      for(let i=0;i<dots.length;i++) for(let j=i+1;j<dots.length;j++){
        const dx=dots[i].x-dots[j].x, dy=dots[i].y-dots[j].y
        if(Math.sqrt(dx*dx+dy*dy)<110){
          ctx.beginPath(); ctx.moveTo(dots[i].x,dots[i].y); ctx.lineTo(dots[j].x,dots[j].y)
          ctx.strokeStyle=lc; ctx.lineWidth=1; ctx.stroke()
        }
      }
      raf=requestAnimationFrame(draw)
    }
    draw()
    const onR = ()=>{ W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight }
    window.addEventListener("resize", onR)
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize", onR) }
  }, [])

  const waNum = config.whatsapp_numero ?? "51935790269"

  const waMsgDemo = (label) =>
    `Hola! Me interesa solicitar una demo del plan *${label}*. Quisiera ver cómo funciona antes de contratar. Pueden orientarme?`

  const waMsgPagar = (label, precio, cicloActual) =>
    `Hola! Quiero contratar el plan *${label}* (${precio}/${cicloActual === "anio" ? "año" : "mes"}). Cómo procedo con el pago?`

  const waMsgPagarPersonalizado = (mods, precio, cicloActual) =>
    `Hola! Quiero contratar un plan personalizado con los módulos: *${mods}*. El total que me aparece es *${precio}/${cicloActual === "anio" ? "año" : "mes"}*. Cómo procedo?`

  const waMsgDemoPersonalizado = (mods) =>
    `Hola! Me interesa solicitar una demo del plan personalizado con: *${mods}*. Pueden mostrarme cómo funciona?`

  const waLink = (msg) => `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`

  const tieneComercial = ["pos","creditos","online"].some(id => (navSel[id]?.length ?? 0) > 0)
  const tieneObras     = (navSel["obras"]?.length ?? 0) > 0

  function toggleNavPill(modId, navNombre) {
    const grupoMod = MODULOS[modId].grupo
    const yaActivo = navSel[modId]?.includes(navNombre)
    if (!yaActivo) {
      if (grupoMod === "obras" && tieneComercial) {
        setAviso({
          msg: "Al agregar Gestión de obras se deseleccionarán los módulos comerciales, ya que son sistemas independientes.",
          onConfirm: () => { setNavSel({ pos:[], creditos:[], online:[], obras:[navNombre] }); setAviso(null) }
        })
        return
      }
      if (grupoMod === "comercial" && tieneObras) {
        setAviso({
          msg: "Al agregar un módulo comercial se deseleccionará Gestión de obras, ya que son sistemas independientes.",
          onConfirm: () => { setNavSel({ pos:[], creditos:[], online:[], obras:[], [modId]:[navNombre] }); setAviso(null) }
        })
        return
      }
    }
    setNavSel(p => {
      const actual = p[modId] ?? []
      const nuevo  = actual.includes(navNombre) ? actual.filter(x=>x!==navNombre) : [...actual, navNombre]
      return { ...p, [modId]: nuevo }
    })
  }

  function toggleNavOpen(id) {
    setNavOpen(p => ({ ...p, [id]: !p[id] }))
  }

  const precioMes = Object.entries(navSel).reduce((total, [modId, navs]) => {
    const navList = NAV_MODULOS[modId] ?? []
    return total + navs.reduce((a, n) => a + (navList.find(x=>x.nombre===n)?.precio ?? 0), 0)
  }, 0)

  const precioAnio    = Math.round(precioMes * 12 * 0.8)
  const ahorroAnio    = Math.round(precioMes * 12 - precioAnio)
  const precioDisplay = ciclo === "anio" ? precioAnio : precioMes
  const resumenMods   = ["pos","creditos","online","obras"].filter(id => (navSel[id]?.length ?? 0) > 0)

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.canvas} />
      <div className={s.inner}>

        <div className={s.hero}>
          <h1 className={s.pageTitle}>Elige lo que necesitas</h1>
          <p className={s.pageSub}>Sin contratos — cancela cuando quieras</p>
        </div>

        <div className={s.mainTabs}>
          <button type="button" className={`${s.mainTab} ${tab==="planes"?s.mainTabOn:""}`} onClick={()=>setTab("planes")}>
            <ion-icon name="pricetags-outline" />Planes y bundles
          </button>
          <button type="button" className={`${s.mainTab} ${tab==="personalizado"?s.mainTabOn:""}`} onClick={()=>setTab("personalizado")}>
            <ion-icon name="options-outline" />Arma tu plan
          </button>
        </div>

        {tab === "planes" && (
          <PlanesTab ciclo={ciclo} setCiclo={setCiclo} waLink={waLink} waMsgDemo={waMsgDemo} waMsgPagar={waMsgPagar} />
        )}

        {tab === "personalizado" && (
          <PersonalizadoTab
            ciclo={ciclo} setCiclo={setCiclo}
            navSel={navSel} navOpen={navOpen}
            toggleNavPill={toggleNavPill} toggleNavOpen={toggleNavOpen}
            precioMes={precioMes} precioAnio={precioAnio} ahorroAnio={ahorroAnio}
            precioDisplay={precioDisplay} resumenMods={resumenMods}
            waLink={waLink} waMsgDemoPersonalizado={waMsgDemoPersonalizado} waMsgPagarPersonalizado={waMsgPagarPersonalizado}
            duracion={duracion} setDuracion={setDuracion}
            unidad={unidad} setUnidad={setUnidad}
          />
        )}

      </div>

      {aviso && (
        <div className={s.avisoOverlay}>
          <div className={s.avisoBox}>
            <div className={s.avisoIcon}><ion-icon name="warning-outline" /></div>
            <p className={s.avisoMsg}>{aviso.msg}</p>
            <div className={s.avisoActions}>
              <button type="button" className={s.avisoCancel} onClick={()=>setAviso(null)}>Cancelar</button>
              <button type="button" className={s.avisoConfirm} onClick={aviso.onConfirm}>Entendido, continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanesTab({ ciclo, setCiclo, waLink, waMsgDemo, waMsgPagar }) {
  return (
    <div className={s.planesWrap}>

      <div className={s.planesSectionHead}>
        <div className={s.sectionLabel}><ion-icon name="storefront-outline" />Sistema comercial</div>
        <CicloToggle ciclo={ciclo} setCiclo={setCiclo} />
      </div>
      <div className={s.moduloGrid}>
        {["pos","creditos","online"].map(id => (
          <ModuloCard key={id} id={id} ciclo={ciclo} waLink={waLink} waMsgDemo={waMsgDemo} waMsgPagar={waMsgPagar} />
        ))}
      </div>

      <div className={s.divider} />

      <div className={s.sectionLabel}><ion-icon name="construct-outline" />Sistema de obras</div>
      <ModuloCard id="obras" ciclo={ciclo} waLink={waLink} waMsgDemo={waMsgDemo} waMsgPagar={waMsgPagar} />

      <div className={s.divider} />

      <div className={s.sectionLabel}><ion-icon name="flash-outline" />Bundles — combina módulos comerciales y ahorra</div>
      <div className={s.bundleGrid}>
        {BUNDLES.map(b => {
          const { precio, sufijo, nota, ahorro } = calcBundle(b, ciclo)
          return (
            <div key={b.id} className={`${s.bundleCard} ${b.popular?s.bundleCardPop:""}`}>
              {b.popular && <div className={s.popularBadge}><ion-icon name="star-outline" />Más popular</div>}
              <div className={s.bundleHead}>
                <div>
                  <div className={s.bundleName}>{b.label}</div>
                  <div><span className={s.bundlePrice}>${precio}</span><span className={s.bundlePer}>{sufijo}</span></div>
                  <div className={s.bundleNota}>{nota}</div>
                </div>
                <span className={s.bundleSave}>Ahorras ${ahorro}</span>
              </div>
              <div className={s.bundleTags}>
                {b.modulos.map(mid => (
                  <span key={mid} className={s.bundleTag}>
                    <ion-icon name={MODULOS[mid].icono} />{MODULOS[mid].label}
                  </span>
                ))}
              </div>
              <div className={s.cardBtns}>
                <a href={waLink(waMsgDemo(b.label))} target="_blank" rel="noopener noreferrer" className={s.demoBtn}>
                  <ion-icon name="play-outline" />Solicitar demo
                </a>
                <a href={waLink(waMsgPagar(b.label, `$${precio}`, ciclo))} target="_blank" rel="noopener noreferrer" className={s.waBtn}>
                  <ion-icon name="logo-whatsapp" />Pagar
                </a>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

function ModuloCard({ id, ciclo, waLink, waMsgDemo, waMsgPagar }) {
  const m        = MODULOS[id]
  const price    = ciclo === "mes" ? m.mes : m.anio
  const anioDesc = Math.round(m.mes * 12 * 0.8)
  return (
    <div className={s.moduloCard}>
      <div className={s.moduloCardTop}>
        <div className={s.moduloIcon}><ion-icon name={m.icono} /></div>
        <div>
          <div className={s.moduloName}>{m.label}</div>
          <div className={s.moduloPrice}>${price}<span className={s.moduloPer}>/mes</span></div>
          {ciclo === "anio"
            ? <div className={s.moduloAnioNota}>${anioDesc}/año</div>
            : <div className={s.moduloAnioNota}>${anioDesc}/año pagando anual</div>
          }
        </div>
      </div>
      <ul className={s.featureList}>
        {FEATURES_MODULO[id].map(f => (
          <li key={f} className={s.featureItem}><ion-icon name="checkmark-circle-outline" />{f}</li>
        ))}
      </ul>
      <div className={s.cardBtns}>
        <a href={waLink(waMsgDemo(m.label))} target="_blank" rel="noopener noreferrer" className={s.demoBtn}>
          <ion-icon name="play-outline" />Solicitar demo
        </a>
        <a href={waLink(waMsgPagar(m.label, `$${price}`, ciclo))} target="_blank" rel="noopener noreferrer" className={s.waBtn}>
          <ion-icon name="logo-whatsapp" />Pagar
        </a>
      </div>
    </div>
  )
}

function PersonalizadoTab({ ciclo, setCiclo, navSel, navOpen, toggleNavPill, toggleNavOpen, precioMes, precioAnio, ahorroAnio, precioDisplay, resumenMods, waLink, waMsgDemoPersonalizado, waMsgPagarPersonalizado, duracion, setDuracion, unidad, setUnidad }) {
  const factorActual  = UNIDADES.find(u => u.id === unidad)?.factor ?? 1
  const mesesTotal    = duracion * factorActual
  const totalProyect  = Math.round((ciclo === "anio" ? precioAnio / 12 : precioMes) * mesesTotal)
  const labelUnidad   = UNIDADES.find(u => u.id === unidad)?.label ?? ""
  const labelDuracion = (() => {
    if (duracion !== 1) return labelUnidad
    switch(unidad) {
      case "dia":  return "Día"
      case "sem":  return "Semana"
      case "mes":  return "Mes"
      case "anio": return "Año"
      default:     return labelUnidad
    }
  })()

  const pct = Math.round(((duracion - 1) / (MAX_SLIDER[unidad] - 1)) * 100)
  const modLabels = resumenMods.map(id => MODULOS[id].label).join(", ")

  return (
    <div className={s.personalWrap}>
      <div className={s.personalLeft}>
        <div className={s.planesSectionHead}>
          <div className={s.sectionLabel}><ion-icon name="toggle-outline" />Activa los módulos que usas</div>
          <CicloToggle ciclo={ciclo} setCiclo={setCiclo} />
        </div>

        <div className={s.sectionLabel}><ion-icon name="storefront-outline" />Sistema comercial</div>
        <div className={s.modList}>
          {["pos","creditos","online"].map(id => (
            <ModRowPersonal key={id} id={id}
              navSel={navSel[id] ?? []} navOpen={!!navOpen[id]}
              onToggleNav={toggleNavOpen} onTogglePill={toggleNavPill}
            />
          ))}
        </div>

        <div className={s.sectionLabel} style={{marginTop:"8px"}}>
          <ion-icon name="construct-outline" />Sistema de obras
          <span className={s.sectionNote}>independiente</span>
        </div>
        <div className={s.modList}>
          <ModRowPersonal id="obras"
            navSel={navSel["obras"] ?? []} navOpen={!!navOpen["obras"]}
            onToggleNav={toggleNavOpen} onTogglePill={toggleNavPill}
          />
        </div>
      </div>

      <div className={s.personalRight}>
        <div className={s.sectionLabel}><ion-icon name="receipt-outline" />Tu resumen</div>
        <div className={s.summary}>
          {resumenMods.length === 0 ? (
            <div className={s.summaryEmpty}>
              <ion-icon name="albums-outline" />
              <span>Selecciona secciones para ver el precio</span>
            </div>
          ) : (
            <>
              {resumenMods.map(modId => {
                const navList    = NAV_MODULOS[modId] ?? []
                const navs       = navSel[modId] ?? []
                const sub        = navs.reduce((a,n) => a + (navList.find(x=>x.nombre===n)?.precio ?? 0), 0)
                const subDisplay = ciclo === "anio" ? Math.round(sub * 12 * 0.8) : sub
                return (
                  <div key={modId} className={s.summaryGroup}>
                    <div className={s.summaryGroupHead}>
                      <ion-icon name={MODULOS[modId].icono} />
                      <span className={s.summaryGroupName}>{MODULOS[modId].label}</span>
                      <span className={s.summaryGroupPrice}>${subDisplay}/{ciclo==="anio"?"año":"mes"}</span>
                    </div>
                    {navs.map(n => {
                      const p        = navList.find(x=>x.nombre===n)?.precio ?? 0
                      const pDisplay = ciclo === "anio" ? Math.round(p * 12 * 0.8) : p
                      return (
                        <div key={`${modId}-${n}`} className={s.summaryNavRow}>
                          <ion-icon name="remove-outline" />
                          <span>{n}</span>
                          <span className={s.summaryNavPrice}>${pDisplay}/{ciclo==="anio"?"año":"mes"}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div className={s.summaryDivider} />

              <div className={s.summaryTotal}>
                <span className={s.summaryTotalLabel}>Total {ciclo==="anio"?"anual":"mensual"}</span>
                <span className={s.summaryTotalPrice}>${precioDisplay}/{ciclo==="anio"?"año":"mes"}</span>
              </div>

              {ciclo === "anio" && (
                <div className={s.summaryAnual}>
                  <div className={s.summaryAhorro}>
                    <ion-icon name="trending-down-outline" />
                    Equiv. ${Math.round(precioDisplay/12)}/mes · Ahorras ${ahorroAnio} al año
                  </div>
                </div>
              )}
              {ciclo === "mes" && precioMes > 0 && (
                <div className={s.summaryAnual}>
                  <div className={s.summaryAnualRow}>
                    <span className={s.summaryTotalLabel}>Si pagas anual</span>
                    <span className={s.summaryTotalPriceSmall}>${precioAnio}/año</span>
                  </div>
                  <div className={s.summaryAhorro}>
                    <ion-icon name="trending-down-outline" />
                    Ahorras ${ahorroAnio} pagando anual
                  </div>
                </div>
              )}

              <div className={s.summaryDivider} />

              <div className={s.tiempoWrap}>
                <div className={s.tiempoHead}>
                  <ion-icon name="time-outline" />
                  <span className={s.tiempoTitle}>Proyecta tu inversión</span>
                </div>

                <div className={s.unidadBtns}>
                  {UNIDADES.map(u => (
                    <button key={u.id} type="button"
                      className={`${s.unidadBtn} ${unidad===u.id?s.unidadBtnOn:""}`}
                      onClick={()=>{ setUnidad(u.id); setDuracion(1) }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>

                <div className={s.sliderWrap}>
                  <div className={s.sliderTrackWrap}>
                    <div className={s.sliderTrackBg}>
                      <div className={s.sliderTrackFill} style={{width:`${pct}%`}} />
                    </div>
                    <div className={s.sliderThumb} style={{left:`${pct}%`}} />
                    <input
                      type="range" min="1" max={MAX_SLIDER[unidad]} step="1"
                      value={duracion}
                      onChange={e => setDuracion(Number(e.target.value))}
                      className={s.slider}
                    />
                  </div>
                  <div className={s.sliderInfo}>
                    <div className={s.sliderDuracion}>
                      <ion-icon name="calendar-number-outline" />
                      <span className={s.sliderVal}>{duracion} {labelDuracion}</span>
                    </div>
                    <div className={s.sliderTotalBox}>
                      <span className={s.sliderTotalLabel}>Total estimado</span>
                      <span className={s.sliderTotalNum}>${totalProyect}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.summaryBtns}>
                <a href={waLink(waMsgDemoPersonalizado(modLabels))} target="_blank" rel="noopener noreferrer" className={s.summaryDemoBtn}>
                  <ion-icon name="play-outline" />Solicitar demo
                </a>
                <a href={waLink(waMsgPagarPersonalizado(modLabels, `$${precioDisplay}`, ciclo))} target="_blank" rel="noopener noreferrer" className={s.summaryWaBtn}>
                  <ion-icon name="logo-whatsapp" />Pagar — ${precioDisplay}/{ciclo==="anio"?"año":"mes"}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ModRowPersonal({ id, navSel, navOpen, onToggleNav, onTogglePill }) {
  const m    = MODULOS[id]
  const navs = NAV_MODULOS[id] ?? []
  const cnt  = navSel.length
  const on   = cnt > 0
  return (
    <div className={`${s.modRow} ${on?s.modRowOn:""}`}>
      <button type="button" className={s.modRowHeader} onClick={()=>onToggleNav(id)}>
        <div className={s.modIcon}><ion-icon name={m.icono} /></div>
        <div className={s.modInfoText}>
          <span className={s.modName}>{m.label}</span>
          <span className={s.modDesc}>{m.desc}</span>
        </div>
        {on && <span className={s.modSelCount}>{cnt} secc.</span>}
        <ion-icon name={navOpen?"chevron-up-outline":"chevron-down-outline"} />
      </button>
      {navOpen && (
        <div className={s.navPillsWrap}>
          {navs.map(nav => {
            const active = navSel.includes(nav.nombre)
            return (
              <button key={`${id}-${nav.nombre}`} type="button"
                className={`${s.navPill} ${active?s.navPillOn:""}`}
                onClick={e=>{ e.stopPropagation(); onTogglePill(id, nav.nombre) }}
              >
                <ion-icon name={active?"checkmark-circle-outline":nav.icono} />
                {nav.nombre}
                <span className={s.navPillPrice}>${nav.precio}/mes</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CicloToggle({ ciclo, setCiclo }) {
  return (
    <div className={s.cicloPill}>
      <button type="button" className={`${s.cicloBtn} ${ciclo==="mes"?s.cicloBtnOn:""}`} onClick={()=>setCiclo("mes")}>
        Mensual
      </button>
      <button type="button" className={`${s.cicloBtn} ${ciclo==="anio"?s.cicloBtnOn:""}`} onClick={()=>setCiclo("anio")}>
        Anual <span className={s.saveChip}>-20%</span>
      </button>
    </div>
  )
}