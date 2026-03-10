"use client"

import s from "./Topbar.module.css"

export default function Topbar({ onOpenSidebar, titulo }) {
  return (
    <header className={s.topbar}>
      <button className={s.hamburger} onClick={onOpenSidebar}>
        <ion-icon name="menu-outline" />
      </button>
      <span className={s.titulo}>{titulo}</span>
    </header>
  )
}