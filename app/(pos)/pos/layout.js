import PosLayout from "@/_Pages/pos/Header/Principal"
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"

export const metadata = { robots: { index: false, follow: false } }

export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      <PosLayout>
        {children}
      </PosLayout>
    </ClienteWrapper>
  )
}