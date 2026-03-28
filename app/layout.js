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
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Ambrysoft — Sistema de Gestión Empresarial",
    description: "POS, créditos, inventario y obras en un solo sistema. Hecho para negocios que quieren crecer.",
    url: "https://pos.ambrysoft.com",
    siteName: "Ambrysoft",
    locale: "es_DO",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
        <link rel="icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#2563eb" />
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