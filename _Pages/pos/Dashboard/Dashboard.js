"use client"

import { useState, useEffect } from "react"
import { obtenerDatosHeader } from "../Header/servidor"
import DashboardAdmin from "./admin/DashboardAdmin"
import DashboardVendedor from "./vendedor/DashboardVendedor"

const USUARIO_ID = 2
const TIPO_ADMIN = 2
const TIPO_VENDEDOR = 3

export default function DashboardPOS() {
  const [tipo, setTipo]         = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerDatosHeader(USUARIO_ID).then(data => {
      setTipo(data?.usuario?.tipo_usuario_id ?? null)
      setCargando(false)
    })
  }, [])

  if (cargando) return null

  if (tipo === TIPO_ADMIN || tipo === TIPO_SUPER_ADMIN) return <DashboardAdmin />
  if (tipo === TIPO_VENDEDOR) return <DashboardVendedor />
  return <DashboardAdmin />
}

const TIPO_SUPER_ADMIN = 1