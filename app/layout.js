import "./globals.css"
import Script from "next/script"

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://isiweek.com"),
  title: {
    default: "IsiWeek - Sistema Multi Empresa",
    template: "%s | IsiWeek",
  },
  description: "IsiWeek es el sistema de gestion multi empresa para ventas, obras, inventario y mas.",
  keywords: ["sistema pos", "gestion empresarial", "isiweek", "ventas", "inventario"],
  authors: [{ name: "Angel Luis Batista Mendoza" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "IsiWeek - Sistema Multi Empresa",
    description: "Gestion empresarial completa para POS, obras, inventario y mas.",
    url: "https://isiweek.com",
    siteName: "IsiWeek",
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