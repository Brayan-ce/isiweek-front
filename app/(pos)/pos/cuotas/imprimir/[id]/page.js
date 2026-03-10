import { use } from "react"
import ImprimirCuotaPage from "@/_Pages/pos/Cuotas/Imprimir/ImprimirCuota"

export default function Page({ params }) {
  const { id } = use(params)
  return <ImprimirCuotaPage id={id} />
}