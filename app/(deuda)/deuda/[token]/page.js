import DeudaPublica from "@/_Pages/pos/Creditos/Control/deuda/DeudaPublica"
import { use } from "react"
export default function Page({ params }) {
  const { token } = use(params)
  return <DeudaPublica token={token} />
}