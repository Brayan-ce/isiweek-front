import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import HeaderSuperAdmin from "@/_Pages/superadmin/layout/header/header";
export const metadata = { robots: { index: false, follow: false } }
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
