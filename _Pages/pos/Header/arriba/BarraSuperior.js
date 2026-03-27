'use client'
import s from './BarraSuperior.module.css'

export default function Topbar({ onOpenSidebar, titulo, data, darkMode, onToggleDark }) {
  const inicialUsuario = data?.usuario?.nombre_completo?.charAt(0).toUpperCase() ?? ''
  const inicialEmpresa = data?.empresa?.nombre?.charAt(0).toUpperCase() ?? ''

  return (
    <header className={s.topbar}>
      <div className={s.left}>
        <button className={s.hamburger} onClick={onOpenSidebar}>
          <span /><span /><span />
        </button>
        <div className={s.empresaBadge}>{inicialEmpresa}</div>
        <span className={s.titulo}>{titulo}</span>
      </div>

      <div className={s.right}>
        <button className={s.iconBtn} onClick={onToggleDark} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
          <ion-icon name={darkMode ? 'sunny-outline' : 'moon-outline'} style={{ fontSize: '16px' }} />
        </button>
        <div className={s.avatar} title="Perfil">{inicialUsuario}</div>
      </div>
    </header>
  )
}