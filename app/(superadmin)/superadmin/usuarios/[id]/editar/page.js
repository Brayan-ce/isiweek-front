// [id]/ver/page.js
import { use } from "react"
import EditarUsuarioPage from "@/_Pages/superadmin/Contenido/usuarios/[id]/editar/editar"
export default function Page({ params }) {
    const { id } = use(params)
    return <EditarUsuarioPage id={id} />
}