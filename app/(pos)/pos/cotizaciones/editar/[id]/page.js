import { use } from "react"
import Editar from "@/_Pages/pos/Cotizaciones/editar/Editar"
export default function Page({ params }) {
  const { id } = use(params)
  return <Editar id={Number(id)} />
}
