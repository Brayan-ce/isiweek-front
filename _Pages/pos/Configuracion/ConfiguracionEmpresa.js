"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import s from "./ConfiguracionEmpresa.module.css"

const API        = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const EMPRESA_ID = 1

const FORM_VACIO = {
  nombre: "", rnc: "", razon_social: "", telefono: "", email: "",
  direccion: "", pais: "DO", estado_geo: "", ciudad: "", moneda_id: "",
}

async function getEmpresa(empresaId) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function getMonedas() {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/monedas`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function guardarEmpresa(empresaId, data) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch { return { error: "No se pudo conectar con el servidor" } }
}

async function subirLogoEmpresa(empresaId, formData) {
  try {
    const res = await fetch(`${API}/api/pos/configuracion/${empresaId}/logo`, {
      method: "POST",
      body: formData,
    })
    return await res.json()
  } catch { return { error: "No se pudo subir el logo" } }
}

export default function ConfiguracionEmpresa() {
  const [form, setForm]               = useState(FORM_VACIO)
  const [monedas, setMonedas]         = useState([])
  const [cargando, setCargando]       = useState(true)
  const [guardando, setGuardando]     = useState(false)
  const [alerta, setAlerta]           = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile]       = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const fileRef                       = useRef(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [emp, mons] = await Promise.all([getEmpresa(EMPRESA_ID), getMonedas()])
    if (emp) {
      setForm({
        nombre:       emp.nombre       ?? "",
        rnc:          emp.rnc          ?? "",
        razon_social: emp.razon_social ?? "",
        telefono:     emp.telefono     ?? "",
        email:        emp.email        ?? "",
        direccion:    emp.direccion    ?? "",
        pais:         emp.pais         ?? "DO",
        estado_geo:   emp.estado_geo   ?? "",
        ciudad:       emp.ciudad       ?? "",
        moneda_id:    String(emp.moneda_id ?? ""),
      })
      const logo = emp.configuracion?.find(c => c.clave === "logo")?.valor
      if (logo) setLogoPreview(`${API}${logo}`)
    }
    setMonedas(mons)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function mostrarAlerta(tipo, msg) {
    setAlerta({ tipo, msg })
    setTimeout(() => setAlerta(null), 3500)
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleLogoChange(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return mostrarAlerta("error", "El logo no puede superar 2MB")
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = e => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return mostrarAlerta("error", "El nombre es obligatorio")
    if (!form.moneda_id)     return mostrarAlerta("error", "Selecciona una moneda")
    setGuardando(true)

    if (logoFile) {
      const fd = new FormData()
      fd.append("file", logoFile)
      const r = await subirLogoEmpresa(EMPRESA_ID, fd)
      if (r?.error) { setGuardando(false); return mostrarAlerta("error", r.error) }
    }

    const res = await guardarEmpresa(EMPRESA_ID, form)
    setGuardando(false)
    if (res?.error) return mostrarAlerta("error", res.error)
    mostrarAlerta("ok", "Configuracion guardada correctamente")
    cargar()
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>
        {[...Array(4)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
      </div>
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
        <button className={s.btnGuardar} onClick={handleGuardar} disabled={guardando}>
          {guardando ? <span className={s.spinner} /> : <><ion-icon name="save-outline" />Guardar cambios</>}
        </button>
      </div>

      <div className={s.grid}>

        <div className={s.card}>
          <div className={s.cardTitulo}><ion-icon name="business-outline" />Datos basicos</div>
          <div className={s.formGrid}>
            <div className={`${s.field} ${s.spanFull}`}>
              <label>Nombre de la empresa *</label>
              <input className={s.input} value={form.nombre} onChange={e => setF("nombre", e.target.value)} placeholder="Mi Empresa S.R.L." />
            </div>
            <div className={s.field}>
              <label>RNC / Cedula</label>
              <input className={s.input} value={form.rnc} onChange={e => setF("rnc", e.target.value)} placeholder="101-12345-6" />
            </div>
            <div className={s.field}>
              <label>Razon social</label>
              <input className={s.input} value={form.razon_social} onChange={e => setF("razon_social", e.target.value)} placeholder="Razon social opcional" />
            </div>
            <div className={s.field}>
              <label>Telefono</label>
              <input className={s.input} value={form.telefono} onChange={e => setF("telefono", e.target.value)} placeholder="809-000-0000" />
            </div>
            <div className={s.field}>
              <label>Email</label>
              <input className={s.input} type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="empresa@correo.com" />
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitulo}><ion-icon name="location-outline" />Direccion y ubicacion</div>
          <div className={s.formGrid}>
            <div className={`${s.field} ${s.spanFull}`}>
              <label>Direccion</label>
              <input className={s.input} value={form.direccion} onChange={e => setF("direccion", e.target.value)} placeholder="Calle Principal #1" />
            </div>
            <div className={s.field}>
              <label>Pais</label>
              <select className={s.input} value={form.pais} onChange={e => setF("pais", e.target.value)}>
                <option value="DO">Republica Dominicana</option>
                <option value="US">Estados Unidos</option>
                <option value="MX">Mexico</option>
                <option value="CO">Colombia</option>
                <option value="CL">Chile</option>
                <option value="ES">Espana</option>
                <option value="GT">Guatemala</option>
                <option value="HN">Honduras</option>
                <option value="PA">Panama</option>
                <option value="PR">Puerto Rico</option>
              </select>
            </div>
            <div className={s.field}>
              <label>Provincia / Estado</label>
              <input className={s.input} value={form.estado_geo} onChange={e => setF("estado_geo", e.target.value)} placeholder="Distrito Nacional" />
            </div>
            <div className={s.field}>
              <label>Ciudad</label>
              <input className={s.input} value={form.ciudad} onChange={e => setF("ciudad", e.target.value)} placeholder="Santo Domingo" />
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitulo}><ion-icon name="cash-outline" />Moneda</div>
          <div className={s.monedasGrid}>
            {monedas.map(m => (
              <button
                key={m.id}
                className={`${s.monedaBtn} ${String(form.moneda_id) === String(m.id) ? s.monedaActiva : ""}`}
                onClick={() => setF("moneda_id", String(m.id))}
              >
                <span className={s.monedaSimbolo}>{m.simbolo}</span>
                <span className={s.monedaNombre}>{m.nombre}</span>
                <span className={s.monedaCodigo}>{m.codigo}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitulo}><ion-icon name="image-outline" />Logo de la empresa</div>
          <div
            className={`${s.dropZone} ${dragOver ? s.dropZoneOver : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleLogoChange(e.dataTransfer.files[0]) }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className={s.logoPreview} />
            ) : (
              <>
                <ion-icon name="cloud-upload-outline" />
                <span>Arrastra el logo aqui o haz clic</span>
                <span className={s.dropHint}>PNG, JPG, WEBP o SVG - max 2MB</span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoChange(e.target.files[0])} />
          </div>
          {logoPreview && (
            <button className={s.btnQuitarLogo} onClick={() => { setLogoPreview(null); setLogoFile(null) }}>
              <ion-icon name="trash-outline" /> Quitar logo
            </button>
          )}
        </div>

      </div>
    </div>
  )
}