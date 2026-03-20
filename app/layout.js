import "./globals.css"
import Script from "next/script"

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pos.ambrysoft.com"),
  title: {
    default: "Ambrysoft — Sistema de Gestión Empresarial",
    template: "%s | Ambrysoft",
  },
  description: "Ambrysoft es el sistema todo-en-uno para ventas, inventario, créditos y obras. Gestiona tu negocio desde cualquier lugar.",
  keywords: ["sistema pos", "gestion empresarial", "ambrysoft", "ventas", "inventario", "creditos", "financiamiento", "obras"],
  authors: [{ name: "Ambrysoft" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Ambrysoft — Sistema de Gestión Empresarial",
    description: "POS, créditos, inventario y obras en un solo sistema. Hecho para negocios que quieren crecer.",
    url: "https://pos.ambrysoft.com",
    siteName: "Ambrysoft",
    locale: "es_DO",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
      </head>
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.esm.js"
          type="module"
          strategy="lazyOnload"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.js"
          noModule
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}