import { use } from "react"
import VerPlan from "@/_Pages/pos/Creditos/Planes/ver/VerPlan"
export default function Page({ params }) {
    const { id } = use(params)
    return <VerPlan id={id} />
}