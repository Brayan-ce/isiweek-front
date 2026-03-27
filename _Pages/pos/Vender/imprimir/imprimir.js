"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import JsBarcode from "jsbarcode"
import {
  printerConnect,
  printerPrint,
  printerDisconnect,
  printerIsConnected,
  printerPlatformAvailable,
  buildRawBTText,
} from "./extras/printerService"
import s from "./imprimir.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const OPCIONES_DEFAULT = {
  mostrarDatosEmpresa:  true,
  mostrarDatosCliente:  true,
  mostrarVendedor:      true,
  mostrarMetodoPago:    true,
  mostrarNotas:         true,
  mostrarMensajeFinal:  true,
  mostrarCodigoBarras:  false,
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

async function getVenta(id) {
  try {
    const res = await apiFetch(`/api/pos/vender/recibo/${id}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default function ImprimirVentaPage({ id }) {
  const router     = useRouter()
  const boucherRef = useRef(null)

  const [venta,    setVenta]    = useState(null)
  const [cargando, setCargando] = useState(true)

  const [platform,  setPlatform]  = useState(null)
  const [connected, setConnected] = useState(false)
  const [btStatus,  setBtStatus]  = useState("idle")
  const [btMsg,     setBtMsg]     = useState("")
  const [ancho,     setAncho]     = useState("80")

  const [opciones, setOpciones] = useState(OPCIONES_DEFAULT)

  const [modalWA,    setModalWA]    = useState(false)
  const [numeroWA,   setNumeroWA]   = useState("")
  const [enviandoWA, setEnviandoWA] = useState(false)
  const [errorWA,    setErrorWA]    = useState("")

  const barcodeRef = useRef(null)

  useEffect(() => {
    getVenta(id).then(data => { setVenta(data); setCargando(false) })
  }, [id])

  useEffect(() => {
    if (!venta || !barcodeRef.current) return
    try {
      JsBarcode(barcodeRef.current, String(venta.id).padStart(8, "0"), {
        format:       "CODE128",
        width:        ancho === "58" ? 1.2 : 1.5,
        height:       ancho === "58" ? 36  : 44,
        displayValue: true,
        fontSize:     ancho === "58" ? 9   : 11,
        margin:       4,
        background:   "#ffffff",
        lineColor:    "#000000",
      })
    } catch {}
  }, [venta, opciones.mostrarCodigoBarras, ancho])

  useEffect(() => {
    if (typeof window === "undefined") return
    setPlatform(printerPlatformAvailable() ? "bluetooth" : null)
    setConnected(printerIsConnected())

    const saved = localStorage.getItem("opcionesImpresion")
    if (saved) {
      try { setOpciones({ ...OPCIONES_DEFAULT, ...JSON.parse(saved) }) } catch {}
    }
    const savedAncho = localStorage.getItem("tamañoPapelImpresion")
    if (savedAncho) setAncho(savedAncho)
  }, [])

  const toggleOpcion = useCallback((key) => {
    setOpciones(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem("opcionesImpresion", JSON.stringify(next))
      return next
    })
  }, [])

  const cambiarAncho = useCallback((val) => {
    setAncho(val)
    localStorage.setItem("tamañoPapelImpresion", val)
  }, [])

  const handleConnect = useCallback(async () => {
    setBtStatus("loading")
    setBtMsg("Buscando impresora...")
    try {
      const res = await printerConnect()
      setConnected(true)
      setBtStatus("success")
      setBtMsg(res.deviceName ? `Conectado: ${res.deviceName}` : "Conectado")
    } catch (err) {
      setConnected(false)
      setBtStatus("error")
      setBtMsg(err.message ?? "Error al conectar")
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await printerDisconnect()
    setConnected(false)
    setBtStatus("idle")
    setBtMsg("")
  }, [])

  const handlePrintBluetooth = useCallback(async () => {
    if (!venta) return
    setBtStatus("loading")
    setBtMsg("Imprimiendo...")
    try {
      const cols = ancho === "58" ? 32 : ancho === "A4" ? 64 : 42
      await printerPrint(venta, cols, opciones)
      setBtStatus("success")
      setBtMsg("Impresion enviada")
    } catch (err) {
      setBtStatus("error")
      setBtMsg(err.message ?? "Error al imprimir")
    }
  }, [venta, ancho, opciones])

  const handlePrintBrowser = useCallback(() => { window.print() }, [])

  const handleRawBT = useCallback(async () => {
    if (!venta) return
    const cols  = ancho === "58" ? 32 : 42
    const texto = buildRawBTText(venta, cols, opciones)
    const esAndroid = /Android/i.test(navigator.userAgent)
    const blob  = new Blob([texto], { type: "text/plain" })
    const file  = new File([blob], "ticket.txt", { type: "text/plain" })

    if (esAndroid && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Imprimir con RawBT" }) } catch {}
      return
    }
    if (navigator.share) {
      try { await navigator.share({ text: texto, title: "Imprimir con RawBT" }) } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      alert("Ticket copiado. Abre RawBT y pega el texto.")
    } catch {
      const ta = document.createElement("textarea")
      ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0"
      document.body.appendChild(ta); ta.select()
      document.execCommand("copy"); document.body.removeChild(ta)
      alert("Ticket copiado. Abre RawBT y pega el texto.")
    }
  }, [venta, ancho, opciones])

  const capturarImagen = useCallback(async () => {
    if (!boucherRef.current) throw new Error("No se encontro el boucher")
    const html2canvas = (await import("html2canvas")).default
    const canvas = await html2canvas(boucherRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      width:  boucherRef.current.scrollWidth,
      height: boucherRef.current.scrollHeight,
    })
    return new Promise(res => canvas.toBlob(blob => res(blob), "image/png", 0.95))
  }, [])

  const abrirModalWA = useCallback(() => {
    setNumeroWA(venta?.cliente?.telefono ?? "")
    setErrorWA("")
    setModalWA(true)
  }, [venta])

  const cerrarModalWA = useCallback(() => {
    setModalWA(false)
    setNumeroWA("")
    setErrorWA("")
  }, [])

  const enviarWhatsApp = useCallback(async () => {
    const limpio = numeroWA.replace(/\D/g, "")
    if (limpio.length < 8) { setErrorWA("Ingresa un numero valido"); return }

    setEnviandoWA(true)
    setErrorWA("")

    const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    try {
      if (esMobile && navigator.share) {
        try {
          const blob = await capturarImagen()
          const file = new File([blob], `comprobante_${venta.id}.png`, { type: "image/png" })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "Comprobante de Venta" })
            cerrarModalWA()
            return
          }
        } catch {}
      }

      const blob    = await capturarImagen()
      const imgUrl  = URL.createObjectURL(blob)
      const link    = document.createElement("a")
      link.href     = imgUrl
      link.download = `comprobante_${venta.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(imgUrl), 100)

      const sim  = venta.empresa?.moneda?.simbolo ?? "RD$"
      const text = [
        `*${venta.empresa?.nombre ?? ""}*`,
        `Recibo #${String(venta.id).padStart(6, "0")}`,
        `Total: ${fmt(venta.total, sim)}`,
        `Fecha: ${new Date(venta.created_at).toLocaleString("es-DO")}`,
        venta.cliente?.nombre ? `Cliente: ${venta.cliente.nombre}` : null,
        "",
        "Ver imagen adjunta para detalle completo.",
      ].filter(Boolean).join("\n")

      const url = esMobile
        ? `https://wa.me/${limpio}?text=${encodeURIComponent(text)}`
        : `https://web.whatsapp.com/send?phone=${limpio}&text=${encodeURIComponent(text)}`

      window.open(url, "_blank")
      cerrarModalWA()
    } catch (err) {
      setErrorWA("Error al generar imagen: " + (err.message ?? ""))
    } finally {
      setEnviandoWA(false)
    }
  }, [numeroWA, venta, capturarImagen, cerrarModalWA])

  if (cargando) return (
    <div className={s.loading}>
      <span className={s.spinner} />
      <p>Cargando recibo...</p>
    </div>
  )

  if (!venta) return (
    <div className={s.loading}>
      <p>Venta no encontrada</p>
      <button className={s.btnVolver} onClick={() => router.back()}>Volver</button>
    </div>
  )

  const simbolo   = venta.empresa?.moneda?.simbolo ?? "RD$"
  const esAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)

  const SWITCHES = [
    { key: "mostrarDatosEmpresa", label: "Datos Empresa" },
    { key: "mostrarDatosCliente", label: "Datos Cliente" },
    { key: "mostrarVendedor",     label: "Vendedor" },
    { key: "mostrarMetodoPago",   label: "Metodo Pago" },
    { key: "mostrarNotas",        label: "Notas" },
    { key: "mostrarMensajeFinal", label: "Mensaje Final" },
    { key: "mostrarCodigoBarras", label: "Codigo Barras" },
  ]

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.back()}>Volver</button>
        <button className={s.btnImprimir} onClick={handlePrintBrowser}>Imprimir</button>
        <button className={s.btnWA} onClick={abrirModalWA}>WhatsApp</button>
      </div>

      <div className={s.layout}>
        <div className={s.columnaIzq}>

          <div className={s.card}>
            <p className={s.cardTitulo}>Impresion termica</p>

            <div className={s.anchosWrap}>
              <span className={s.anchoLabel}>Papel:</span>
              {["58", "80", "A4"].map(a => (
                <button key={a}
                  className={`${s.btnAncho} ${ancho === a ? s.anchoActivo : ""}`}
                  onClick={() => cambiarAncho(a)}
                >{a === "A4" ? "A4" : `${a}mm`}</button>
              ))}
            </div>

            {platform === "bluetooth" && (
              <div className={s.metodo}>
                <div className={s.metodoHeader}>
                  <span className={s.metodoBadge}>Bluetooth</span>
                  <span className={`${s.dot} ${connected ? s.dotOn : s.dotOff}`} />
                </div>
                {btMsg && (
                  <p className={`${s.btMsg} ${btStatus === "error" ? s.btMsgError : btStatus === "success" ? s.btMsgOk : ""}`}>
                    {btMsg}
                  </p>
                )}
                <div className={s.metodoBtns}>
                  {!connected ? (
                    <button className={s.btnConectar} onClick={handleConnect} disabled={btStatus === "loading"}>
                      {btStatus === "loading" ? "Conectando..." : "Conectar impresora"}
                    </button>
                  ) : (
                    <>
                      <button className={s.btnPrintBt} onClick={handlePrintBluetooth} disabled={btStatus === "loading"}>
                        {btStatus === "loading" ? "Imprimiendo..." : "Imprimir"}
                      </button>
                      <button className={s.btnDesconectar} onClick={handleDisconnect}>Desconectar</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {!platform && !esAndroid && (
              <p className={s.noDisponible}>Web Bluetooth no disponible. Usa Chrome o Edge.</p>
            )}

            {esAndroid && (
              <div className={s.metodo}>
                <div className={s.metodoHeader}>
                  <span className={s.metodoBadge}>RawBT</span>
                  <span className={s.metodoBadgeSub}>Android</span>
                </div>
                <button className={s.btnRawBT} onClick={handleRawBT}>Compartir con RawBT</button>
              </div>
            )}
          </div>

          <div className={s.card}>
            <p className={s.cardTitulo}>Mostrar en boucher</p>
            <div className={s.switchList}>
              {SWITCHES.map(({ key, label }) => (
                <label key={key} className={s.switchRow}>
                  <span className={s.switchLabel}>{label}</span>
                  <button
                    className={`${s.switch} ${opciones[key] ? s.switchOn : ""}`}
                    onClick={() => toggleOpcion(key)}
                  >
                    <span className={s.switchThumb} />
                  </button>
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className={s.columnaDer}>
          <div className={s.preview}>
            <div ref={boucherRef} className={`${s.recibo} ${ancho === "A4" ? s.reciboA4 : ""} ${ancho === "58" ? s.recibo58 : ""}`} id="recibo-print">

              {opciones.mostrarDatosEmpresa && (
                <div className={s.reciboHeader}>
                  {venta.empresa?.nombre    && <div className={s.empresaNombre}>{venta.empresa.nombre}</div>}
                  {venta.empresa?.rnc       && <div className={s.empresaInfo}>RNC: {venta.empresa.rnc}</div>}
                  {venta.empresa?.telefono  && <div className={s.empresaInfo}>{venta.empresa.telefono}</div>}
                  {venta.empresa?.direccion && <div className={s.empresaInfo}>{venta.empresa.direccion}</div>}
                </div>
              )}

              <div className={s.sep} />
              <div className={s.reciboTituloWrap}>
                <div className={s.reciboTitulo}>RECIBO DE VENTA</div>
                <div className={s.reciboNum}>#{String(venta.id).padStart(6, "0")}</div>
                <div className={s.reciboFecha}>{new Date(venta.created_at).toLocaleString("es-DO")}</div>
              </div>
              <div className={s.sep} />

              <div className={s.infoWrap}>
                {opciones.mostrarDatosCliente && venta.cliente && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Cliente:</span>
                    <span>{venta.cliente.nombre}</span>
                  </div>
                )}
                {opciones.mostrarDatosCliente && venta.cliente?.cedula_rnc && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Ced/RNC:</span>
                    <span>{venta.cliente.cedula_rnc}</span>
                  </div>
                )}
                {venta.comprobante && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>NCF:</span>
                    <span>{venta.comprobante.codigo} — {venta.comprobante.descripcion}</span>
                  </div>
                )}
                {venta.caja_sesion?.caja?.nombre && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Caja:</span>
                    <span>{venta.caja_sesion.caja.nombre}</span>
                  </div>
                )}
                {opciones.mostrarVendedor && venta.usuario?.nombre_completo && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Vendedor:</span>
                    <span>{venta.usuario.nombre_completo}</span>
                  </div>
                )}
              </div>

              <div className={s.sep} />

              <div className={s.itemsHeader}>
                <span>Producto</span>
                <span className={s.itemHDer}>Cant × Precio = Total</span>
              </div>
              <div className={s.sepFino} />

              {venta.venta_detalles.map(d => (
                <div key={d.id} className={s.itemRow}>
                  <div className={s.itemNombre}>{d.nombre_producto}</div>
                  <div className={s.itemMath}>
                    {d.cantidad} &times; {fmt(d.precio_unitario, simbolo)} = {fmt(d.subtotal, simbolo)}
                  </div>
                </div>
              ))}

              <div className={s.sep} />

              <div className={s.totalesWrap}>
                <div className={s.totalRow}><span>Subtotal</span><span>{fmt(venta.subtotal, simbolo)}</span></div>
                <div className={s.totalRow}><span>ITBIS</span><span>{fmt(venta.itbis, simbolo)}</span></div>
                {Number(venta.descuento) > 0 && (
                  <div className={s.totalRow}>
                    <span>Descuento</span><span>-{fmt(venta.descuento, simbolo)}</span>
                  </div>
                )}
                <div className={s.sepFino} />
                <div className={`${s.totalRow} ${s.totalFinal}`}>
                  <span>TOTAL</span><span>{fmt(venta.total, simbolo)}</span>
                </div>
                <div className={s.sepFino} />

                {opciones.mostrarMetodoPago && (
                  venta.es_pago_mixto && venta.venta_pagos?.length > 0 ? (
                    venta.venta_pagos.map((p, i) => (
                      <div key={i} className={s.totalRow}>
                        <span>{p.metodo_pago.nombre}</span>
                        <span>{fmt(p.monto, simbolo)}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className={s.totalRow}>
                        <span>Metodo</span><span>{venta.metodo_pago?.nombre}</span>
                      </div>
                      {Number(venta.efectivo_recibido) > 0 && (
                        <div className={s.totalRow}>
                          <span>Efectivo</span><span>{fmt(venta.efectivo_recibido, simbolo)}</span>
                        </div>
                      )}
                      {Number(venta.efectivo_recibido) > Number(venta.total) && (
                        <div className={`${s.totalRow} ${s.cambioRow}`}>
                          <span>Cambio</span>
                          <span>{fmt(Number(venta.efectivo_recibido) - Number(venta.total), simbolo)}</span>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>

              {opciones.mostrarNotas && venta.notas && (
                <>
                  <div className={s.sep} />
                  <div className={s.notas}><strong>Nota:</strong> {venta.notas}</div>
                </>
              )}

              {opciones.mostrarCodigoBarras && (
                <>
                  <div className={s.sep} />
                  <div className={s.barraWrap}>
                    <svg ref={barcodeRef} className={s.barrasvg} />
                  </div>
                </>
              )}

              {opciones.mostrarMensajeFinal && (
                <>
                  <div className={s.sep} />
                  <div className={s.footer}><p>Gracias por su compra</p></div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {modalWA && (
        <div className={s.overlay} onClick={cerrarModalWA}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitulo}>Enviar por WhatsApp</span>
              <button className={s.modalClose} onClick={cerrarModalWA}>✕</button>
            </div>
            <div className={s.modalBody}>
              <p className={s.modalDesc}>
                Ingresa el numero del cliente con codigo de pais sin el signo +
              </p>
              <input
                className={s.modalInput}
                type="tel"
                placeholder="Ej: 18091234567"
                value={numeroWA}
                onChange={e => setNumeroWA(e.target.value)}
                onKeyDown={e => e.key === "Enter" && enviarWhatsApp()}
                autoFocus
              />
              {errorWA && <p className={s.modalError}>{errorWA}</p>}
              <p className={s.modalHint}>
                Se descargara la imagen del boucher y se abrira WhatsApp con el numero ingresado.
              </p>
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnCancelar} onClick={cerrarModalWA}>Cancelar</button>
              <button className={s.btnEnviarWA} onClick={enviarWhatsApp} disabled={enviandoWA}>
                {enviandoWA ? "Generando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}