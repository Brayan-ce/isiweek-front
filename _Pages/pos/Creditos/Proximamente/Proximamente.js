"use client"

import s from "./Proximamente.module.css"

export default function Proximamente({ titulo = "Sección en desarrollo" }) {
  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.iconWrap}>
          <ion-icon name="construct-outline" />
        </div>
        <h2 className={s.titulo}>Estamos trabajando en esto</h2>
        <p className={s.sub}>
          La sección <strong>{titulo}</strong> estará disponible muy pronto.
          Estamos construyendo algo increíble para ti. 🚀
        </p>
        <div className={s.badges}>
          <span className={s.badge}><ion-icon name="time-outline" />En desarrollo</span>
          <span className={s.badge}><ion-icon name="flash-outline" />Próximamente</span>
        </div>
      </div>
    </div>
  )
}