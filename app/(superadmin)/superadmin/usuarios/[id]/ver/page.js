// [id]/ver/page.js
import { use } from "react"
import VerUsuarioPage from "@/_Pages/superadmin/Contenido/usuarios/[id]/ver/ver"
export default function Page({ params }) {
    const { id } = use(params)
    return <VerUsuarioPage id={id} />
}