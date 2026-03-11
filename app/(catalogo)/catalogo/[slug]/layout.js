import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"

export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      {children}
    </ClienteWrapper>
  )
}