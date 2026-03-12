"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import s from "./UsuariosEmpresa.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const TIPOS = [
  { id: 2, label: "Administrador" },
  { id: 3, label: "Vendedor" },
]
const MODOS = [
  { id: 1, label: "POS" },
  { id: 2, label: "Obras" },
  { id: 3, label: "Creditos" },
  { id: 4, label: "Ventas Online" },
]

const FORM_VACIO = {
  nombre_completo: "", cedula: "", email: "",
  password: "", tipo_usuario_id: "3", modo_sistema_id: "1",
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("isiweek_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

async function getUsuarios(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${empresaId}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function crearUsuario(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function editarUsuario(id, data) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function toggleUsuario(id, estado) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function resetPassword(id, nuevaPassword) {
  try {
    const res = await fetch(`${API}/api/pos/usuarios/${id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: nuevaPassword }),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

function Avatar({ nombre }) {
  const letra   = nombre?.charAt(0).toUpperCase() ?? "?"
  const colores = ["#1d6fce","#10b981","#8b5cf6","#f59e0b","#ef4444","#0ea5e9"]
  const color   = colores[letra.charCodeAt(0) % colores.length]
  return <div className={s.avatar} style={{ background: color }}>{letra}</div>
}

export default function UsuariosEmpresa() {
  const router                          = useRouter()
  const [empresaId, setEmpresaId]       = useState(null)
  const [usuarios, setUsuarios]         = useState([])
  const [cargando, setCargando]         = useState(true)
  const [alerta, setAlerta]             = useState(null)
  const [procesando, setProcesando]     = useState(false)
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState(FORM_VACIO)
  const [modalReset, setModalReset]     = useState(null)
  const [nuevaPass, setNuevaPass]       = useState("")
  const [verPass, setVerPass]           = useState(false)
  const [verNuevaPass, setVerNuevaPass] = useState(false)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  const cargar = useCallback(async () => {
    if (!empresaId) return
    setCargando(true)
    setUsuarios(await getUsuarios(empresaId))
    setCargando(false)
  }, [empresaId])

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
    if (modal === "crear" && !form.password.trim()) return mostrarAlerta("error", "La contrasena es obligatoria")
    setProcesando(true)
    const res = modal === "crear"
      ? await crearUsuario(empresaId, form)
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
      return mostrarAlerta("error", "Minimo 6 caracteres")
    setProcesando(true)
    const res = await resetPassword(modalReset.id, nuevaPass)
    setProcesando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Contrasena actualizada")
    setModalReset(null)
    setNuevaPass("")
  }

  const activos   = usuarios.filter(u => u.estado === "activo").length
  const inactivos = usuarios.filter(u => u.estado === "inactivo").length

  if (!empresaId || cargando) return (
    <div className={s.page}>
      {[...Array(5)].map((_, i) => <div key={i} className={s.skeletonRow} />)}
    </div>
  )

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
          {usuarios.length === 0 ? (
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
                <button className={s.btnIcono} onClick={() => { setModalReset(u); setNuevaPass(""); setVerNuevaPass(false) }} title="Resetear contrasena">
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
                <input className={s.input} value={form.nombre_completo} onChange={e => setF("nombre_completo", e.target.value)} placeholder="Juan Perez" autoFocus />
              </div>
              <div className={s.field}>
                <label>Cedula</label>
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
                  <label>Contrasena *</label>
                  <div className={s.passWrap}>
                    <input
                      className={s.input}
                      type={verPass ? "text" : "password"}
                      value={form.password}
                      onChange={e => setF("password", e.target.value)}
                      placeholder="Minimo 6 caracteres"
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
              Resetear contrasena
            </div>
            <p className={s.resetSub}>Usuario: <strong>{modalReset.nombre_completo}</strong></p>
            <div className={s.passWrap}>
              <input
                className={s.input}
                type={verNuevaPass ? "text" : "password"}
                value={nuevaPass}
                onChange={e => setNuevaPass(e.target.value)}
                placeholder="Nueva contrasena (min. 6 caracteres)"
                autoFocus
              />
              <button className={s.verBtn} type="button" onClick={() => setVerNuevaPass(v => !v)}>
                <ion-icon name={verNuevaPass ? "eye-off-outline" : "eye-outline"} />
              </button>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecundario} onClick={() => setModalReset(null)}>Cancelar</button>
              <button className={s.btnPrimario} onClick={handleReset} disabled={procesando}>
                {procesando ? <span className={s.spinner} /> : "Actualizar contrasena"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}