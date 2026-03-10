// [id]/editar/page.js
import { use } from "react"
import EditarEmpresaPage from "@/_Pages/superadmin/Contenido/empresas/[id]/editar/editar"
export default function Page({ params }) {
    const { id } = use(params)
    return <EditarEmpresaPage id={id} />
}