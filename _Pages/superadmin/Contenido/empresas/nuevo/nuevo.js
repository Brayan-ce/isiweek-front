"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LocationSelect from "../extras/paises/LocationSelect"
import s from "./nuevo.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function obtenerMonedas() {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/monedas`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function obtenerModulos() {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/modulos`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function crearEmpresa(data) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? "Error al crear empresa" }
    return { ok: true, empresa: json }
  } catch { return { error: "Error de conexion" } }
}

const HIJOS_POS = ["CREDITOS", "VENTAS_ONLINE"]

const MODO_META = {
  General:       { icon: "grid-outline",      color: "#64748b", label: "General",       desc: "Modulos base del sistema" },
  POS:           { icon: "storefront-outline", color: "#1d6fce", label: "POS",           desc: "Punto de venta y gestion comercial" },
  CREDITOS:      { icon: "card-outline",       color: "#8b5cf6", label: "Creditos",      desc: "Cartera de creditos y financiamiento" },
  VENTAS_ONLINE: { icon: "globe-outline",      color: "#10b981", label: "Ventas Online", desc: "Tienda y ventas por internet" },
  OBRAS:         { icon: "construct-outline",  color: "#f59e0b", label: "OBRAS",         desc: "Gestion de construccion y obras" },
}

export default function NuevaEmpresaPage() {
  const router = useRouter()
  const [cargando, setCargando]     = useState(true)
  const [monedas, setMonedas]       = useState([])
  const [modulos, setModulos]       = useState([])
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState("")
  const [modoActivo, setModoActivo] = useState(null)
  const [modulosSeleccionados, setModulosSeleccionados] = useState([])

  const [form, setForm] = useState({
    nombre: "", rnc: "", razon_social: "", telefono: "", email: "",
    direccion: "", pais: "DO", estado_geo: "", ciudad: "",
    moneda_id: "", estado: "activa",
  })

  useEffect(() => {
    Promise.all([obtenerMonedas(), obtenerModulos()]).then(([mon, mods]) => {
      setMonedas(mon)
      setModulos(mods)
      setCargando(false)
    })
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const modulosPorModo = modulos.reduce((acc, m) => {
    const modo = m.modo_sistema?.nombre ?? "General"
    if (!acc[modo]) acc[modo] = []
    acc[modo].push(m)
    return acc
  }, {})

  function idsDelModo(modo) {
    return (modulosPorModo[modo] ?? []).map(m => m.id)
  }

  function selEnModo(modo) {
    return idsDelModo(modo).filter(id => modulosSeleccionados.includes(id))
  }

  function toggleModulo(id, modo) {
    setModulosSeleccionados(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      let base = [...prev]
      if (modo === "OBRAS") {
        const limpiar = ["POS", ...HIJOS_POS].flatMap(idsDelModo)
        base = base.filter(x => !limpiar.includes(x))
      } else if (modo === "POS" || HIJOS_POS.includes(modo)) {
        base = base.filter(x => !idsDelModo("OBRAS").includes(x))
      }
      return [...base, id]
    })
  }

  function toggleTodoModo(modo) {
    const ids = idsDelModo(modo)
    const todosOn = ids.every(id => modulosSeleccionados.includes(id))
    if (todosOn) {
      setModulosSeleccionados(prev => prev.filter(x => !ids.includes(x)))
    } else {
      setModulosSeleccionados(prev => {
        let base = [...prev]
        if (modo === "OBRAS") {
          const limpiar = ["POS", ...HIJOS_POS].flatMap(idsDelModo)
          base = base.filter(x => !limpiar.includes(x))
        } else if (modo === "POS" || HIJOS_POS.includes(modo)) {
          base = base.filter(x => !idsDelModo("OBRAS").includes(x))
        }
        return [...base, ...ids.filter(id => !base.includes(id))]
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (!form.moneda_id)     { setError("Selecciona una moneda"); return }
    setGuardando(true)
    const res = await crearEmpresa({
      ...form,
      moneda_id: Number(form.moneda_id),
      modulosIds: modulosSeleccionados,
    })
    setGuardando(false)
    if (res?.error) { setError(res.error); return }
    router.push("/superadmin/empresas")
  }

  function renderGrupo(modo) {
    const meta  = MODO_META[modo] ?? MODO_META.General
    const mods  = modulosPorModo[modo] ?? []
    const todos = mods.length > 0 && mods.every(m => modulosSeleccionados.includes(m.id))
    const algun = mods.some(m => modulosSeleccionados.includes(m.id))
    const open  = modoActivo === modo

    return (
      <div key={modo} className={`${s.grupoWrap} ${open ? s.grupoWrapOpen : ""}`} style={{ "--g-color": meta.color }}>
        <button type="button" className={s.grupoHeader} onClick={() => setModoActivo(open ? null : modo)}>
          <div className={s.grupoHeaderLeft}>
            <span className={s.grupoIcono}><ion-icon name={meta.icon} /></span>
            <div>
              <div className={s.grupoNombre}>{meta.label}</div>
              <div className={s.grupoDesc}>{meta.desc}</div>
            </div>
          </div>
          <div className={s.grupoHeaderRight}>
            {algun && (
              <span className={s.grupoBadge} style={{ background: meta.color }}>
                {selEnModo(modo).length}/{mods.length}
              </span>
            )}
            <ion-icon name={open ? "chevron-up-outline" : "chevron-down-outline"} />
          </div>
        </button>

        {open && (
          <div className={s.grupoBody}>
            {modo === "OBRAS" && (
              <div className={s.obraNote}>
                <ion-icon name="warning-outline" />
                Activar OBRAS desactiva POS y todos sus modulos adicionales
              </div>
            )}
            <div className={s.grupoAcciones}>
              <button type="button" className={`${s.btnToggleAll} ${todos ? s.btnToggleAllOn : ""}`} onClick={() => toggleTodoModo(modo)}>
                <ion-icon name={todos ? "checkmark-done-outline" : "add-outline"} />
                {todos ? "Quitar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className={s.modulosGrid}>
              {mods.map(m => {
                const activo = modulosSeleccionados.includes(m.id)
                return (
                  <button key={m.id} type="button"
                    className={`${s.moduloCard} ${activo ? s.moduloCardOn : ""}`}
                    onClick={() => toggleModulo(m.id, modo)}
                  >
                    <ion-icon name={activo ? "checkmark-circle" : "ellipse-outline"} />
                    <span>{m.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHeader} />
      <div className={s.skeletonGrid}>{[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}</div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <button className={s.btnBack} onClick={() => router.push("/superadmin/empresas")}>
          <ion-icon name="arrow-back-outline" /> Empresas
        </button>
      </div>

      <form onSubmit={handleSubmit} className={s.formGrid}>
        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="business-outline" /> Datos principales</div>
          <div className={s.fieldGrid}>
            <div className={`${s.field} ${s.fieldFull}`}>
              <label className={s.label}>Nombre <span className={s.req}>*</span></label>
              <input className={s.input} name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre de la empresa" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Razon social</label>
              <input className={s.input} name="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Razon social" />
            </div>
            <div className={s.field}>
              <label className={s.label}>RNC</label>
              <input className={s.input} name="rnc" value={form.rnc} onChange={handleChange} placeholder="RNC de la empresa" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Telefono</label>
              <input className={s.input} name="telefono" value={form.telefono} onChange={handleChange} placeholder="(809) 000-0000" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Email</label>
              <input className={s.input} type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@empresa.com" />
            </div>

            <LocationSelect form={form} onChange={handleChange} />

            <div className={s.field}>
              <label className={s.label}>Moneda <span className={s.req}>*</span></label>
              <select className={s.select} name="moneda_id" value={form.moneda_id} onChange={handleChange}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Estado</label>
              <select className={s.select} name="estado" value={form.estado} onChange={handleChange}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
            <div className={`${s.field} ${s.fieldFull}`}>
              <label className={s.label}>Direccion</label>
              <textarea className={s.textarea} name="direccion" value={form.direccion} onChange={handleChange} placeholder="Direccion completa" rows={3} />
            </div>
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}>
            <ion-icon name="apps-outline" /> Modulos habilitados
            <span className={s.countBadge}>{modulosSeleccionados.length} seleccionados</span>
          </div>

          {renderGrupo("General")}

          <div className={s.modeSeparator}>
            <ion-icon name="storefront-outline" />
            Modo POS — elige el punto de venta y sus extensiones
          </div>

          <div className={s.posGroup}>
            {renderGrupo("POS")}
            <div className={s.posHijos}>
              {HIJOS_POS.map(m => renderGrupo(m))}
            </div>
          </div>

          <div className={s.modeSeparator} style={{ "--sep-color": "#f59e0b" }}>
            <ion-icon name="construct-outline" />
            Modo OBRAS — exclusivo, no compatible con POS
          </div>

          {renderGrupo("OBRAS")}
        </div>

        {error && (
          <div className={s.errorMsg}>
            <ion-icon name="alert-circle-outline" /> {error}
          </div>
        )}

        <div className={s.formFooter}>
          <button type="button" className={s.btnCancelar} onClick={() => router.push("/superadmin/empresas")}>Cancelar</button>
          <button type="submit" className={s.btnGuardar} disabled={guardando}>
            {guardando ? <span className={s.spinner} /> : <><ion-icon name="add-circle-outline" /> Crear empresa</>}
          </button>
        </div>
      </form>
    </div>
  )
}