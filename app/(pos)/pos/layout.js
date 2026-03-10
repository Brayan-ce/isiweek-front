import PosLayout from "@/_Pages/pos/Header/PosLayout"
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"

export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      <PosLayout>
        {children}
      </PosLayout>
    </ClienteWrapper>
  )
}