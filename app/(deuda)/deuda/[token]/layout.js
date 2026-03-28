import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"

export const metadata = { robots: { index: false, follow: false } }

export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      {children}
    </ClienteWrapper>
  )
}