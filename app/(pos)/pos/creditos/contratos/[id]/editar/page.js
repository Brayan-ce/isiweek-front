// [id]/ver/page.js
import { use } from "react"
import EditarContrato from "@/_Pages/pos/Creditos/Contratos/editar/EditarContrato"
export default function Page({ params }) {
    const { id } = use(params)
    return <EditarContrato id={id} />
}