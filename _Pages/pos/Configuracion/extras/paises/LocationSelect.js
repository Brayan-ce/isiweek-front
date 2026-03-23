"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useMemo, useEffect } from "react"
import { Country, State, City } from "country-state-city"
import s from "./LocationSelect.module.css"

export default function LocationSelect({ form, onChange }) {
  const paises   = useMemo(() => Country.getAllCountries(), [])
  const estados  = useMemo(() => form.pais      ? State.getStatesOfCountry(form.pais)              : [], [form.pais])
  const ciudades = useMemo(() => form.estado_geo ? City.getCitiesOfState(form.pais, form.estado_geo) : [], [form.pais, form.estado_geo])

  useEffect(() => {
    onChange({ target: { name: "estado_geo", value: "" } })
    onChange({ target: { name: "ciudad",     value: "" } })
  }, [form.pais])

  useEffect(() => {
    onChange({ target: { name: "ciudad", value: "" } })
  }, [form.estado_geo])

  return (
    <>
      <div className={s.field}>
        <label className={s.label}>País</label>
        <select className={s.select} name="pais" value={form.pais} onChange={onChange}>
          <option value="">Seleccionar país</option>
          {paises.map(p => (
            <option key={p.isoCode} value={p.isoCode}>
              {p.flag} {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={s.field}>
        <label className={s.label}>Provincia / Estado</label>
        <select className={s.select} name="estado_geo" value={form.estado_geo} onChange={onChange} disabled={!form.pais}>
          <option value="">{form.pais ? "Seleccionar provincia" : "Primero elige un país"}</option>
          {estados.map(e => (
            <option key={e.isoCode} value={e.isoCode}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className={s.field}>
        <label className={s.label}>Ciudad</label>
        <select className={s.select} name="ciudad" value={form.ciudad} onChange={onChange} disabled={!form.estado_geo}>
          <option value="">{form.estado_geo ? "Seleccionar ciudad" : "Primero elige una provincia"}</option>
          {ciudades.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
    </>
  )
}