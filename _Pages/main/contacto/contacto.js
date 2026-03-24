"use client"

import { useEffect, useState } from "react"
import s from "./contacto.module.css"

const API    = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const CORREO = "ambrysoft@gmail.com"
const SITIO  = "https://pos.ambrysoft.com"

export default function ContactoPage() {
  const [config, setConfig]     = useState({})
  const [form, setForm]         = useState({ nombre: "", email: "", mensaje: "" })
  const [estado, setEstado]     = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/auth/config`)
      .then(r => r.ok ? r.json() : {})
      .then(setConfig)
      .catch(() => {})
  }, [])

  const nombre   = config.sistema_nombre  ?? "Ambrysoft"
  const waNumero = config.whatsapp_numero ?? "18494324597"
  const waUrl    = `https://wa.me/${waNumero}?text=${encodeURIComponent("Hola, necesito soporte con " + nombre)}`

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { nombre: n, email, mensaje } = form
    if (!n.trim() || !email.trim() || !mensaje.trim()) {
      return setEstado({ tipo: "error", msg: "Completa todos los campos antes de enviar." })
    }
    setCargando(true)
    setEstado(null)
    try {
      const res = await fetch(`${API}/api/registro/contacto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: n, email, mensaje }),
      })
      if (res.ok) {
        setEstado({ tipo: "ok", msg: "Mensaje enviado. Te responderemos a la brevedad." })
        setForm({ nombre: "", email: "", mensaje: "" })
      } else {
        setEstado({ tipo: "error", msg: "No se pudo enviar. Escríbenos directamente por WhatsApp." })
      }
    } catch {
      setEstado({ tipo: "error", msg: "Error de conexión. Por favor, escríbenos por WhatsApp." })
    } finally {
      setCargando(false)
    }
  }

  const CANALES = [
    {
      icono: "logo-whatsapp",
      color: "verde",
      titulo: "WhatsApp",
      desc: "Respuesta rápida en horario hábil",
      valor: `+${waNumero}`,
      href: waUrl,
    },
    {
      icono: "mail-outline",
      color: "azul",
      titulo: "Correo electrónico",
      desc: "Para consultas formales",
      valor: CORREO,
      href: `mailto:${CORREO}`,
    },
    {
      icono: "globe-outline",
      color: "gris",
      titulo: "Sitio web",
      desc: "Información sobre planes",
      valor: `${SITIO}/planes`,
      href: `${SITIO}/planes`,
    },
  ]

  return (
    <div className={s.page}>
      <div className={s.inner}>

        <div className={s.header}>
          <div className={s.headerIconWrap}>
            <ion-icon name="chatbubbles-outline" />
          </div>
          <div>
            <h1 className={s.titulo}>Contacto</h1>
            <p className={s.meta}>Estamos para ayudarte · {nombre}</p>
          </div>
        </div>

        <div className={s.canalesGrid}>
          {CANALES.map(c => (
            <a key={c.titulo} href={c.href} target="_blank" rel="noopener noreferrer"
              className={`${s.canalCard} ${s[`canal_${c.color}`]}`}>
              <div className={s.canalIconWrap}>
                <ion-icon name={c.icono} />
              </div>
              <div className={s.canalBody}>
                <div className={s.canalTitulo}>{c.titulo}</div>
                <div className={s.canalDesc}>{c.desc}</div>
                <div className={s.canalValor}>{c.valor}</div>
              </div>
              <div className={s.canalArrow}>
                <ion-icon name="arrow-forward-outline" />
              </div>
            </a>
          ))}
        </div>

        <div className={s.horario}>
          <ion-icon name="time-outline" />
          <span>Horario de atención: <strong>lunes a viernes, 9:00 – 18:00</strong> (hora de Perú, GMT-5)</span>
        </div>

        <div className={s.legalCard}>
          <div className={s.legalHead}>
            <ion-icon name="shield-checkmark-outline" />
            <span>Información legal</span>
          </div>
          <div className={s.legalGrid}>
            <div className={s.legalRow}>
              <span className={s.legalLabel}>Responsable</span>
              <span className={s.legalVal}>Brayan Jhoan Curasma Espinoza</span>
            </div>
            <div className={s.legalRow}>
              <span className={s.legalLabel}>País</span>
              <span className={s.legalVal}>Perú</span>
            </div>
            <div className={s.legalRow}>
              <span className={s.legalLabel}>RUC</span>
              <span className={s.legalVal}>10709019193</span>
            </div>
            <div className={s.legalRow}>
              <span className={s.legalLabel}>Correo</span>
              <span className={s.legalVal}>{CORREO}</span>
            </div>
          </div>
        </div>

        <div className={s.formCard}>
          <div className={s.formHead}>
            <ion-icon name="send-outline" />
            <span>Envíanos un mensaje</span>
          </div>

          {estado && (
            <div className={`${s.alerta} ${estado.tipo === "ok" ? s.alertaOk : s.alertaError}`}>
              <ion-icon name={estado.tipo === "ok" ? "checkmark-circle-outline" : "alert-circle-outline"} />
              {estado.msg}
            </div>
          )}

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>Nombre completo</label>
                <div className={s.inputWrap}>
                  <ion-icon name="person-outline" class={s.inputIcon} />
                  <input
                    name="nombre"
                    type="text"
                    placeholder="Tu nombre"
                    className={s.input}
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Correo electrónico</label>
                <div className={s.inputWrap}>
                  <ion-icon name="mail-outline" class={s.inputIcon} />
                  <input
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    className={s.input}
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Mensaje</label>
              <textarea
                name="mensaje"
                placeholder="Cuéntanos en qué podemos ayudarte..."
                className={s.textarea}
                rows={4}
                value={form.mensaje}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className={s.submitBtn} disabled={cargando}>
              {cargando
                ? <span className={s.spinner} />
                : <><ion-icon name="send-outline" />Enviar mensaje</>
              }
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}