import { use } from "react"
import Editar from "@/_Pages/pos/Productos/editar/Editar"

export default function EditarProductoPage({ params }) {
  const { id } = use(params)
  return <Editar productoId={id} />
}
