"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Country, State } from "country-state-city"
import s from "./ver.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function obtenerEmpresa(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/empresas/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtUbicacion(pais, estado_geo, ciudad) {
  const paisNombre   = pais                  ? Country.getCountryByCode(pais)?.name                    : null
  const estadoNombre = (pais && estado_geo)  ? State.getStateByCodeAndCountry(estado_geo, pais)?.name  : null
  const partes = [ciudad, estadoNombre, paisNombre].filter(Boolean)
  return partes.length ? partes.join(", ") : "—"
}

const MODO_META = {
  General:       { icon: "grid-outline",      color: "#64748b" },
  POS:           { icon: "storefront-outline", color: "#1d6fce" },
  CREDITOS:      { icon: "card-outline",       color: "#8b5cf6" },
  VENTAS_ONLINE: { icon: "globe-outline",      color: "#10b981" },
  OBRAS:         { icon: "construct-outline",  color: "#f59e0b" },
}

function InfoRow({ icon, label, value, full }) {
  return (
    <div className={`${s.infoRow} ${full ? s.infoRowFull : ""}`}>
      <span className={s.infoLabel}><ion-icon name={icon} /> {label}</span>
      <span className={s.infoValue}>{value || "—"}</span>
    </div>
  )
}

export default function VerEmpresaPage({ id }) {
  const router = useRouter()
  const [empresa, setEmpresa]   = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerEmpresa(id).then(data => {
      setEmpresa(data)
      setCargando(false)
    })
  }, [id])

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHeader} />
      <div className={s.skeletonGrid}>{[...Array(6)].map((_, i) => <div key={i} className={s.skeleton} />)}</div>
    </div>
  )

  if (!empresa) return (
    <div className={s.page}>
      <div className={s.empty}>
        <ion-icon name="business-outline" />
        <p>Empresa no encontrada</p>
        <button className={s.btnVolver} onClick={() => router.push("/superadmin/empresas")}>Volver al listado</button>
      </div>
    </div>
  )

  const modulosPorModo = empresa.empresa_modulos?.reduce((acc, em) => {
    const modo = em.modulo?.modo_sistema?.nombre ?? "General"
    if (!acc[modo]) acc[modo] = []
    acc[modo].push(em.modulo)
    return acc
  }, {}) ?? {}

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <button className={s.btnBack} onClick={() => router.push("/superadmin/empresas")}>
          <ion-icon name="arrow-back-outline" /> Empresas
        </button>
        <button className={s.btnEditar} onClick={() => router.push(`/superadmin/empresas/${id}/editar`)}>
          <ion-icon name="create-outline" /> Editar empresa
        </button>
      </div>

      <div className={s.heroCard}>
        <div className={s.heroLeft}>
          <div className={s.heroIcon}><ion-icon name="business-outline" /></div>
          <div>
            <div className={s.heroNombre}>{empresa.nombre}</div>
            {empresa.razon_social && <div className={s.heroRazon}>{empresa.razon_social}</div>}
            <span className={`${s.chip} ${empresa.estado === "activa" ? s.chipGreen : s.chipRed}`}>
              {empresa.estado === "activa" ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
        <div className={s.heroStats}>
          <div className={s.heroStat}>
            <ion-icon name="people-outline" />
            <span className={s.heroStatNum}>{empresa._count?.usuarios ?? 0}</span>
            <span className={s.heroStatLabel}>Usuarios</span>
          </div>
          <div className={s.heroStat}>
            <ion-icon name="cart-outline" />
            <span className={s.heroStatNum}>{empresa._count?.ventas ?? 0}</span>
            <span className={s.heroStatLabel}>Ventas</span>
          </div>
          <div className={s.heroStat}>
            <ion-icon name="cube-outline" />
            <span className={s.heroStatNum}>{empresa._count?.productos ?? 0}</span>
            <span className={s.heroStatLabel}>Productos</span>
          </div>
          <div className={s.heroStat}>
            <ion-icon name="person-outline" />
            <span className={s.heroStatNum}>{empresa._count?.clientes ?? 0}</span>
            <span className={s.heroStatLabel}>Clientes</span>
          </div>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="information-circle-outline" /> Informacion general</div>
          <div className={s.infoGrid}>
            <InfoRow icon="card-outline"     label="RNC"         value={empresa.rnc} />
            <InfoRow icon="cash-outline"     label="Moneda"      value={empresa.moneda ? `${empresa.moneda.nombre} (${empresa.moneda.simbolo} ${empresa.moneda.codigo})` : null} />
            <InfoRow icon="call-outline"     label="Telefono"    value={empresa.telefono} />
            <InfoRow icon="mail-outline"     label="Email"       value={empresa.email} />
            <InfoRow icon="location-outline" label="Ubicacion"   value={fmtUbicacion(empresa.pais, empresa.estado_geo, empresa.ciudad)} full />
            <InfoRow icon="map-outline"      label="Direccion"   value={empresa.direccion} full />
            <InfoRow icon="calendar-outline" label="Creada"      value={fmtFecha(empresa.created_at)} />
            <InfoRow icon="time-outline"     label="Actualizada" value={fmtFecha(empresa.updated_at)} />
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="apps-outline" /> Modulos habilitados</div>
          {Object.keys(modulosPorModo).length === 0 ? (
            <p className={s.noModulos}>Sin modulos asignados</p>
          ) : (
            Object.entries(modulosPorModo).map(([modo, mods]) => {
              const meta = MODO_META[modo] ?? { icon: "grid-outline", color: "#64748b" }
              return (
                <div key={modo} className={s.modoGroup}>
                  <div className={s.modoLabel} style={{ "--m-color": meta.color }}>
                    <ion-icon name={meta.icon} /> {modo}
                  </div>
                  <div className={s.modulosList}>
                    {mods.map(m => (
                      <span key={m.id} className={s.moduloBadge} style={{ "--m-color": meta.color }}>
                        <ion-icon name="checkmark-outline" /> {m.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}