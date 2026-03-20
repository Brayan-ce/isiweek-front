// [id]/ver/page.js
import { use } from "react"
import VerContrato from "@/_Pages/pos/Creditos/Contratos/ver/VerContrato"
export default function Page({ params }) {
    const { id } = use(params)
    return <VerContrato id={id} />
}