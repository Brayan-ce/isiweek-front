import { use } from "react"
import VerCompra from "@/_Pages/pos/Compras/ver/VerCompra"
export default function Page({ params }) {
    const { id } = use(params)
    return <VerCompra id={id} />
}