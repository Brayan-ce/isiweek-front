import LoginHeader from "@/_Pages/main/layout/header"
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"
export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      <div>
        <LoginHeader></LoginHeader>
      </div>

      {children}
    </ClienteWrapper>
  )
}