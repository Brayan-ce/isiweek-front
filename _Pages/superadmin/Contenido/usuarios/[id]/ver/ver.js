"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import s from "./ver.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function obtenerUsuario(id) {
  try {
    const res = await fetch(`${API}/api/superadmin/usuarios/${id}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function fmtFecha(f) {
  if (!f) return "—"
  return new Date(f).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

const TIPO_COLOR = {
  "Administrador": { bg: "rgba(29,111,206,0.1)", color: "#1d6fce" },
  "Vendedor":      { bg: "rgba(34,197,94,0.1)",  color: "#16a34a" },
}

function InfoRow({ icon, label, value }) {
  return (
    <div className={s.infoRow}>
      <span className={s.infoLabel}><ion-icon name={icon} /> {label}</span>
      <span className={s.infoValue}>{value || "—"}</span>
    </div>
  )
}

export default function VerUsuarioPage({ id }) {
  const router = useRouter()
  const [usuario, setUsuario]   = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerUsuario(id).then(data => { setUsuario(data); setCargando(false) })
  }, [id])

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonHeader} />
      <div className={s.skeletonGrid}>{[...Array(4)].map((_, i) => <div key={i} className={s.skeleton} />)}</div>
    </div>
  )

  if (!usuario) return (
    <div className={s.page}>
      <div className={s.empty}>
        <ion-icon name="people-outline" />
        <p>Usuario no encontrado</p>
        <button className={s.btnVolver} onClick={() => router.push("/superadmin/usuarios")}>Volver al listado</button>
      </div>
    </div>
  )

  const tc    = TIPO_COLOR[usuario.tipo_usuario?.nombre] ?? { bg: "#f1f5f9", color: "#64748b" }
  const modos = usuario.usuario_modos?.map(um => um.modo_sistema) ?? []

  return (
    <div className={s.page}>
      <div className={s.topRow}>
        <button className={s.btnBack} onClick={() => router.push("/superadmin/usuarios")}>
          <ion-icon name="arrow-back-outline" /> Usuarios
        </button>
        <button className={s.btnEditar} onClick={() => router.push(`/superadmin/usuarios/${id}/editar`)}>
          <ion-icon name="create-outline" /> Editar usuario
        </button>
      </div>

      <div className={s.heroCard}>
        <div className={s.heroLeft}>
          <div className={s.avatar}>{usuario.nombre_completo?.charAt(0).toUpperCase()}</div>
          <div>
            <div className={s.heroNombre}>{usuario.nombre_completo}</div>
            <div className={s.heroEmail}>{usuario.email}</div>
            <div className={s.heroBadges}>
              <span className={s.tipoBadge} style={{ background: tc.bg, color: tc.color }}>
                {usuario.tipo_usuario?.nombre}
              </span>
              <span className={`${s.chip} ${usuario.estado === "activo" ? s.chipGreen : s.chipRed}`}>
                {usuario.estado === "activo" ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={s.mainGrid}>
        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="information-circle-outline" /> Informacion general</div>
          <div className={s.infoGrid}>
            <InfoRow icon="card-outline"     label="Cedula"      value={usuario.cedula} />
            <InfoRow icon="business-outline" label="Empresa"     value={usuario.empresa?.nombre} />
            <InfoRow icon="calendar-outline" label="Creado"      value={fmtFecha(usuario.created_at)} />
            <InfoRow icon="time-outline"     label="Actualizado" value={fmtFecha(usuario.updated_at)} />
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}><ion-icon name="layers-outline" /> Modos del sistema</div>
          {modos.length === 0 ? (
            <div className={s.modoVacio}>
              <ion-icon name="layers-outline" />
              <span>Sin modos asignados</span>
            </div>
          ) : (
            <div className={s.modosGrid}>
              {modos.map(m => (
                <div key={m.id} className={s.modoChip}>
                  <ion-icon name="checkmark-circle" />
                  {m.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}