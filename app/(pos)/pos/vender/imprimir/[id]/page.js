import { use } from "react"
import ImprimirVentaPage from "@/_Pages/pos/Vender/imprimir/imprimir"
export default function Page({ params }) {
  const { id } = use(params)
  return <ImprimirVentaPage id={id} />
}