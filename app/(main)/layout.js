import LoginHeader from "@/_Pages/main/layout/header/header"
import Footer from "@/_Pages/main/layout/footer/footer"
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper"
export default function Layout({ children }) {
  return (
    <ClienteWrapper>
      <div>
        <LoginHeader></LoginHeader>
      </div>
      {children}
      <div>
        <Footer></Footer>
      </div>
    </ClienteWrapper>
  )
}