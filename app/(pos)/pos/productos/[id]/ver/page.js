import { use } from "react"
import Ver from "@/_Pages/pos/Productos/ver/Ver"

export default function VerProductoPage({ params }) {
  const { id } = use(params)
  return <Ver productoId={id} />
}
