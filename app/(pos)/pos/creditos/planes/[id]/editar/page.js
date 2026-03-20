// [id]/ver/page.js
import { use } from "react"
import EditarPlan from "@/_Pages/pos/Creditos/Planes/editar/EditarPlan"
export default function Page({ params }) {
    const { id } = use(params)
    return <EditarPlan id={id} />
}