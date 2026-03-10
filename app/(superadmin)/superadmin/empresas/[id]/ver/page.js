// [id]/ver/page.js
import { use } from "react"
import VerEmpresaPage from "@/_Pages/superadmin/Contenido/empresas/[id]/ver/ver"
export default function Page({ params }) {
    const { id } = use(params)
    return <VerEmpresaPage id={id} />
}