"use client"

import { useState, useEffect, useRef } from "react"
import { obtenerConfiguracion, guardarConfiguracion, subirLogo } from "./servidor"
import s from "./configuracion.module.css"

export default function ConfiguracionPage() {
  const fileRef = useRef(null)
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [subiendoLogo, setSubiendo] = useState(false)
  const [exito, setExito]           = useState(false)
  const [error, setError]           = useState("")

  const [form, setForm] = useState({
    sistema_nombre:   "",
    sistema_email:    "",
    sistema_logo:     "",
    whatsapp_numero:  "",
    whatsapp_mensaje: "",
  })

  const [preview, setPreview] = useState("")

  useEffect(() => {
    obtenerConfiguracion().then(cfg => {
      if (cfg) {
        setForm({
          sistema_nombre:   cfg.sistema_nombre   ?? "",
          sistema_email:    cfg.sistema_email    ?? "",
          sistema_logo:     cfg.sistema_logo     ?? "",
          whatsapp_numero:  cfg.whatsapp_numero  ?? "",
          whatsapp_mensaje: cfg.whatsapp_mensaje ?? "",
        })
        if (cfg.sistema_logo) setPreview(cfg.sistema_logo)
      }
      setCargando(false)
    })
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setSubiendo(true)
    setError("")
    const fd = new FormData()
    fd.append("file", file)
    const res = await subirLogo(fd)
    setSubiendo(false)
    if (res.error) { setError(res.error); return }
    setPreview(res.url)
    setForm(f => ({ ...f, sistema_logo: res.url }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setExito(false)
    if (!form.sistema_nombre.trim()) { setError("El nombre del sistema es obligatorio"); return }
    setGuardando(true)
    const res = await guardarConfiguracion(form)
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  if (cargando) return (
    <div className={s.page}>
      <div className={s.skeletonGrid}>
        {[...Array(2)].map((_, i) => <div key={i} className={s.skeleton} />)}
      </div>
    </div>
  )

  return (
    <div className={s.page}>
      <form onSubmit={handleSubmit} className={s.formGrid}>

        <div className={`${s.section} ${s.sectionLogo}`}>
          <div className={s.sectionTitle}><ion-icon name="image-outline" /> Logo del sistema</div>
          <div className={s.logoArea}>
            <div className={s.logoPreview} onClick={() => fileRef.current?.click()}>
              {subiendoLogo ? (
                <span className={s.spinnerDark} />
              ) : preview ? (
                <img src={preview} alt="logo" className={s.logoImg} />
              ) : (
                <div className={s.logoPlaceholder}>
                  <ion-icon name="cloud-upload-outline" />
                  <span>Subir logo</span>
                </div>
              )}
            </div>
            <div className={s.logoInfo}>
              <p>PNG, JPG, SVG o WEBP. Máximo 2MB.</p>
              <button type="button" className={s.btnSubir} onClick={() => fileRef.current?.click()} disabled={subiendoLogo}>
                <ion-icon name="cloud-upload-outline" /> {subiendoLogo ? "Subiendo..." : "Cambiar logo"}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className={s.fileHidden} onChange={handleLogoChange} />
          </div>
        </div>

        <div className={`${s.section} ${s.sectionDatos}`}>
          <div className={s.sectionTitle}><ion-icon name="settings-outline" /> Datos del sistema</div>
          <div className={s.fieldGrid}>
            <div className={s.field}>
              <label className={s.label}>Nombre del sistema <span className={s.req}>*</span></label>
              <input className={s.input} name="sistema_nombre" value={form.sistema_nombre} onChange={handleChange} placeholder="IsiWeek" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Email de contacto</label>
              <input className={s.input} type="email" name="sistema_email" value={form.sistema_email} onChange={handleChange} placeholder="contacto@sistema.com" />
            </div>
          </div>
        </div>

        <div className={`${s.section} ${s.sectionWhatsapp}`}>
          <div className={s.sectionTitle}><ion-icon name="logo-whatsapp" /> WhatsApp soporte</div>
          <div className={s.fieldGridWhatsapp}>
            <div className={s.field}>
              <label className={s.label}>Número</label>
              <div className={s.inputWrap}>
                <span className={s.inputPrefix}>+</span>
                <input className={`${s.input} ${s.inputWithPrefix}`} name="whatsapp_numero" value={form.whatsapp_numero} onChange={handleChange} placeholder="18494324597" />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Mensaje predeterminado</label>
              <textarea className={s.textarea} name="whatsapp_mensaje" value={form.whatsapp_mensaje} onChange={handleChange} placeholder="Hola, necesito soporte con..." rows={3} />
            </div>
          </div>
        </div>

        <div className={s.sectionFooter}>
          {error && <div className={s.errorMsg}><ion-icon name="alert-circle-outline" /> {error}</div>}
          {exito && <div className={s.exitoMsg}><ion-icon name="checkmark-circle-outline" /> Configuracion guardada correctamente</div>}
          <div className={s.formFooter}>
            <button type="submit" className={s.btnGuardar} disabled={guardando}>
              {guardando ? <span className={s.spinner} /> : <><ion-icon name="save-outline" /> Guardar cambios</>}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}