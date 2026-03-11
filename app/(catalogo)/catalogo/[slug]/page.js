import { notFound } from "next/navigation"
import { getConfigCatalogoPublico, getProductosCatalogoPublico } from "@/_Pages/catalogo/[slug]/servidor"
import CatalogoPublico from "@/_Pages/catalogo/[slug]/CatalogoPublico"

export const dynamic = "force-dynamic"

export default async function CatalogoPage({ params }) {
  const { slug } = await params
  const [config, productos] = await Promise.all([
    getConfigCatalogoPublico(slug),
    getProductosCatalogoPublico(slug),
  ])
  if (!config) notFound()
  return <CatalogoPublico config={config} productos={productos} />
}