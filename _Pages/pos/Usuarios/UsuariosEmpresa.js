"use client"

import { useState, useEffect, useCallback } from "react"
import { getUsuarios, crearUsuario, editarUsuario, toggleUsuario, resetPassword } from "./servidor"
import s from "./UsuariosEmpresa.module.css"

const EMPRESA_ID = 1

const TIPOS = [
  { id: 2, label: "Administrador" },
  { id: 3, label: "Vendedor" },
]
const MODOS = [
  { id: 1, label: "POS" },
  { id: 2, label: "Obras" },
  { id: 3, label: "Créditos" },
  { id: 4, label: "Ventas Online" },
]

const FORM_VACIO = {
  nombre_completo: "", cedula: "", email: "",
  password: "", tipo_usuario_id: "3", modo_sistema_id: "1",
}

function Avatar({ nombre }) {
  const letra = nombre?.charAt(0).toUpperCase() ?? "?"
  const colores = ["#1d6fce","#10b981","#8b5cf6","#f59e0b","#ef4444","#0ea5e9"]
  const color   = colores[letra.charCodeAt(0) % colores.length]
  return (
    <div className={s.avatar} style={{ background: color }}>
      {letra}
    </div>
  )
}

export default function UsuariosEmpresa() {
  const [usuarios, setUsuarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [alerta, setAlerta]       = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(FORM_VACIO)
  const [modalReset, setModalReset] = useState(null)
  const [nuevaPass, setNuevaPass] = useState("")
  const [verPass, setVerPass]     = useState(false)
  const [verNuevaPass, setVerNuevaPass] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setUsuarios(await getUsuarios(EMPRESA_ID))
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function abrirCrear() {
    setForm(FORM_VACIO)
    setVerPass(false)
    setModal("crear")
  }

  function abrirEditar(u) {
    setForm({
      nombre_completo: u.nombre_completo ?? "",
      cedula:          u.cedula          ?? "",
      email:           u.email           ?? "",
      password:        "",
      tipo_usuario_id: String(u.tipo_usuario?.id ?? 3),
      modo_sistema_id: String(u.modo_sistema?.id ?? 1),
    })
    setVerPass(false)
    setModal({ tipo: "editar", id: u.id })
  }

  async function handleGuardar() {
    if (!form.nombre_completo.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (!form.email.trim())           return mostrarAlerta("error", "El email es obligatorio")
    if (modal === "crear" && !form.password.trim()) return mostrarAlerta("error", "La contraseña es obligatoria")
    setProcesando(true)
    const res = modal === "crear"
      ? await crearUsuario(EMPRESA_ID, form)
      : await editarUsuario(modal.id, form)
    setProcesando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", modal === "crear" ? "Usuario creado" : "Usuario actualizado")
    setModal(null)
    cargar()
  }

  async function handleToggle(u) {
    const nuevoEstado = u.estado === "activo" ? "inactivo" : "activo"
    const res = await toggleUsuario(u.id, nuevoEstado)
    if (res?.error) return mostrarAlerta("error", res.error)
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, estado: nuevoEstado } : x))
  }

  async function handleReset() {
    if (!nuevaPass.trim() || nuevaPass.length < 6)
      return mostrarAlerta("error", "Mínimo 6 caracteres")
    setProcesando(true)
    const res = await resetPassword(modalReset.id, nuevaPass)
    setProcesando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Contraseña actualizada")
    setModalReset(null)
    setNuevaPass("")
  }

  const activos   = usuarios.filter(u => u.estado === "activo").length
  const inactivos = usuarios.filter(u => u.estado === "inactivo").length

  return (
    <div className={s.page}>
      {alerta && (
        <div className={`${s.toast} ${s["toast_" + alerta.tipo]}`}>
          <ion-icon name={alerta.tipo === "error" ? "alert-circle-outline" : "checkmark-circle-outline"} />
          {alerta.msg}
        </div>
      )}

      <div className={s.topBar}>
        <div className={s.topStats}>
          <span><strong>{usuarios.length}</strong> usuarios</span>
          <span className={s.dot} />
          <span><strong className={s.verde}>{activos}</strong> activos</span>
          {inactivos > 0 && <><span className={s.dot} /><span><strong className={s.gris}>{inactivos}</strong> inactivos</span></>}
        </div>
        <button className={s.btnNuevo} onClick={abrirCrear}>
          <ion-icon name="person-add-outline" /> Nuevo usuario
        </button>
      </div>

      <div className={s.tabla}>
        <div className={s.tablaHead}>
          <span>Usuario</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Modo</span>
          <span>Estado</span>
          <span />
        </div>
        <div className={s.tablaBody}>
          {cargando ? (
            [...Array(5)].map((_, i) => <div key={i} className={s.skeletonRow} />)
          ) : usuarios.length === 0 ? (
            <div className={s.empty}>
              <ion-icon name="people-outline" />
              <p>No hay usuarios registrados</p>
            </div>
          ) : usuarios.map((u, idx) => (
            <div key={u.id} className={`${s.fila} ${idx % 2 === 1 ? s.filaAlt : ""} ${u.estado === "inactivo" ? s.filaInactiva : ""}`}>
              <div className={s.usuarioCell}>
                <Avatar nombre={u.nombre_completo} />
                <div>
                  <div className={s.usuarioNombre}>{u.nombre_completo}</div>
                  {u.cedula && <div className={s.usuarioCedula}>{u.cedula}</div>}
                </div>
              </div>
              <span className={s.cellGris}>{u.email}</span>
              <span className={`${s.rolBadge} ${u.tipo_usuario?.id === 2 ? s.rolAdmin : s.rolVendedor}`}>
                {u.tipo_usuario?.nombre ?? "—"}
              </span>
              <span className={s.cellGris}>{u.modo_sistema?.nombre ?? "—"}</span>
              <button
                className={`${s.toggleBtn} ${u.estado === "activo" ? s.toggleOn : ""}`}
                onClick={() => handleToggle(u)}
                title={u.estado === "activo" ? "Desactivar" : "Activar"}
              >
                <span className={s.toggleThumb} />
              </button>
              <div className={s.acciones}>
                <button className={s.btnIcono} onClick={() => abrirEditar(u)} title="Editar">
                  <ion-icon name="pencil-outline" />
                </button>
                <button className={s.btnIcono} onClick={() => { setModalReset(u); setNuevaPass(""); setVerNuevaPass(false) }} title="Resetear contraseña">
                  <ion-icon name="key-outline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className={s.modal}>
            <button className={s.modalClose} onClick={() => setModal(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="person-outline" />
              {modal === "crear" ? "Nuevo usuario" : "Editar usuario"}
            </div>

            <div className={s.modalGrid}>
              <div className={`${s.field} ${s.spanFull}`}>
                <label>Nombre completo *</label>
                <input className={s.input} value={form.nombre_completo} onChange={e => setF("nombre_completo", e.target.value)} placeholder="Juan Pérez" autoFocus />
              </div>
              <div className={s.field}>
                <label>Cédula</label>
                <input className={s.input} value={form.cedula} onChange={e => setF("cedula", e.target.value)} placeholder="001-0000000-0" />
              </div>
              <div className={s.field}>
                <label>Email *</label>
                <input className={s.input} type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="usuario@correo.com" />
              </div>
              <div className={s.field}>
                <label>Rol *</label>
                <select className={s.input} value={form.tipo_usuario_id} onChange={e => setF("tipo_usuario_id", e.target.value)}>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label>Modo del sistema</label>
                <select className={s.input} value={form.modo_sistema_id} onChange={e => setF("modo_sistema_id", e.target.value)}>
                  {MODOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              {modal === "crear" && (
                <div className={`${s.field} ${s.spanFull}`}>
                  <label>Contraseña *</label>
                  <div className={s.passWrap}>
                    <input
                      className={s.input}
                      type={verPass ? "text" : "password"}
                      value={form.password}
                      onChange={e => setF("password", e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button className={s.verBtn} type="button" onClick={() => setVerPass(v => !v)}>
                      <ion-icon name={verPass ? "eye-off-outline" : "eye-outline"} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={s.modalFooter}>
              <button className={s.btnSecundario} onClick={() => setModal(null)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleGuardar} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : modal === "crear" ? "Crear usuario" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReset && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setModalReset(null)}>
          <div className={s.modalSmall}>
            <button className={s.modalClose} onClick={() => setModalReset(null)}>
              <ion-icon name="close-outline" />
            </button>
            <div className={s.modalTitulo}>
              <ion-icon name="key-outline" />
              Resetear contraseña
            </div>
            <p className={s.resetSub}>Usuario: <strong>{modalReset.nombre_completo}</strong></p>
            <div className={s.passWrap}>
              <input
                className={s.input}
                type={verNuevaPass ? "text" : "password"}
                value={nuevaPass}
                onChange={e => setNuevaPass(e.target.value)}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                autoFocus
              />
              <button className={s.verBtn} type="button" onClick={() => setVerNuevaPass(v => !v)}>
                <ion-icon name={verNuevaPass ? "eye-off-outline" : "eye-outline"} />
              </button>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecundario} onClick={() => setModalReset(null)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleReset} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : "Actualizar contraseña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}