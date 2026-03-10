import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import HeaderSuperAdmin from "@/_Pages/superadmin/layout/header/header";
export default function MainLayout({ children }) {
  return (
    <>
      <ClienteWrapper>
        <HeaderSuperAdmin />
      </ClienteWrapper>
      <ClienteWrapper>{children}</ClienteWrapper>
    </>
  );
}
