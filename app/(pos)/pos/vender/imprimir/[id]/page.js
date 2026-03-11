import ImprimirVentaPage from "@/_Pages/pos/Vender/imprimir/imprimir"

export default async function Page({ params }) {
  const { id } = await params
  return <ImprimirVentaPage id={id} />
}