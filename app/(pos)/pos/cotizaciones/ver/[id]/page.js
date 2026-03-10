import { use } from "react"
import Ver from "@/_Pages/pos/Cotizaciones/ver/Ver"
export default function Page({ params }) {
  const { id } = use(params)
  return <Ver id={Number(id)} />
}