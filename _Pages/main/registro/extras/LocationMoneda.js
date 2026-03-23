"use client"

import { useMemo, useEffect, useState } from "react"
import { Country } from "country-state-city"
import Flag from "react-world-flags"
import s from "./LocationMoneda.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export default function LocationMoneda({ form, onChange }) {
  const paises   = useMemo(() => Country.getAllCountries(), [])
  const [monedas, setMonedas] = useState([])

  useEffect(() => {
    fetch(`${API}/api/registro/monedas`)
      .then(r => r.ok ? r.json() : [])
      .then(setMonedas)
      .catch(() => {})
  }, [])

  const paisActual = useMemo(
    () => paises.find(p => p.isoCode === form.pais),
    [paises, form.pais]
  )

  const prefijo = paisActual?.phonecode
    ? `+${paisActual.phonecode.replace(/[^0-9]/g, "")}`
    : ""

  useEffect(() => {
    onChange({ target: { name: "prefijo",  value: prefijo } })
    onChange({ target: { name: "telefono", value: "" } })
  }, [form.pais])

  return (
    <>
      <div className={s.field}>
        <label className={s.label}>Pais</label>
        <div className={s.selectWrap}>
          {form.pais
            ? <Flag code={form.pais} className={s.flagIcon} fallback={<ion-icon name="globe-outline" class={s.selectIcon} />} />
            : <ion-icon name="globe-outline" class={s.selectIcon} />
          }
          <select className={s.select} name="pais" value={form.pais} onChange={onChange}>
            <option value="">Seleccionar pais</option>
            {paises.map(p => (
              <option key={p.isoCode} value={p.isoCode}>
                {p.flag} {p.name}
              </option>
            ))}
          </select>
          <ion-icon name="chevron-down-outline" class={s.chevron} />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Telefono / WhatsApp</label>
        <div className={s.telWrap}>
          {prefijo && (
            <div className={s.prefijo}>
              {form.pais && <Flag code={form.pais} className={s.prefijoFlag} fallback={null} />}
              <span>{prefijo}</span>
            </div>
          )}
          <input
            name="telefono"
            value={form.telefono}
            onChange={onChange}
            type="tel"
            placeholder="000 000 0000"
            className={`${s.telInput} ${prefijo ? s.telInputConPrefijo : ""}`}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Moneda de la empresa</label>
        <div className={s.selectWrap}>
          <ion-icon name="cash-outline" class={s.selectIcon} />
          <select name="moneda" value={form.moneda} onChange={onChange} className={s.select} disabled={monedas.length === 0}>
            <option value="">Seleccionar moneda</option>
            {monedas.map(m => (
              <option key={m.id} value={m.codigo}>
                {m.simbolo} — {m.nombre} ({m.codigo})
              </option>
            ))}
          </select>
          <ion-icon name="chevron-down-outline" class={s.chevron} />
        </div>
      </div>
    </>
  )
}