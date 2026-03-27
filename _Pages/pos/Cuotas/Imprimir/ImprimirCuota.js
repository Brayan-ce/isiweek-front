"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  printerConnect,
  printerDisconnect,
  printerIsConnected,
  printerPlatformAvailable,
  printerPrintCuota,
} from "../../Vender/imprimir/extras/printerService"
import s from "./ImprimirCuota.module.css"

const OPCIONES_DEFAULT = {
  mostrarDatosEmpresa: true,
  mostrarDatosCliente: true,
  mostrarVendedor:     true,
  mostrarProductos:    true,
  mostrarMetodoPago:   true,
  mostrarMensajeFinal: true,
}

function getTokenPayload() {
  try {
    const token = localStorage.getItem("ambrysoft_token")
    if (!token) return null
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch { return null }
}

function fmt(n, simbolo = "RD$") {
  return `${simbolo} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
}

function buildCuotaRawText(venta, cols, opciones) {
  const sim     = venta.empresa?.moneda?.simbolo ?? "RD$"
  const cuotas  = venta.venta_cuotas ?? []
  const pagadas = cuotas.filter(c => c.estado === "pagada")
  const montoPagado = pagadas.reduce((a, c) => a + Number(c.monto), 0)
  const montoPend   = cuotas.filter(c => c.estado === "pendiente").reduce((a, c) => a + Number(c.monto), 0)
  const line    = "-".repeat(cols)
  const center  = str => {
    const pad = Math.max(0, Math.floor((cols - str.length) / 2))
    return " ".repeat(pad) + str
  }
  const row = (l, r) => l + r.padStart(Math.max(1, cols - l.length))
  const lines = []

  if (opciones.mostrarDatosEmpresa && venta.empresa?.nombre) {
    lines.push(center(venta.empresa.nombre))
    if (venta.empresa.rnc)       lines.push(center(`RNC: ${venta.empresa.rnc}`))
    if (venta.empresa.telefono)  lines.push(center(venta.empresa.telefono))
    if (venta.empresa.direccion) lines.push(center(venta.empresa.direccion))
  }
  lines.push(line)
  lines.push(center("ESTADO DE CUOTAS"))
  lines.push(center(`#${String(venta.id).padStart(6, "0")}`))
  lines.push(center(new Date(venta.created_at).toLocaleString("es-DO")))
  lines.push(line)

  if (opciones.mostrarDatosCliente && venta.cliente?.nombre) {
    lines.push(row("Cliente: ", venta.cliente.nombre))
    if (venta.cliente.cedula_rnc) lines.push(row("Ced/RNC: ", venta.cliente.cedula_rnc))
  }
  if (opciones.mostrarVendedor && venta.usuario?.nombre_completo) {
    lines.push(row("Vendedor: ", venta.usuario.nombre_completo))
  }

  if (opciones.mostrarProductos && venta.venta_detalles?.length) {
    lines.push(line)
    for (const d of venta.venta_detalles) {
      lines.push((d.nombre_producto ?? "").slice(0, cols))
      lines.push(row(`  ${d.cantidad}x ${fmt(d.precio_unitario, sim)}`, fmt(d.subtotal, sim)))
    }
    lines.push(row("Subtotal:  ", fmt(venta.subtotal, sim)))
    if (Number(venta.itbis) > 0) lines.push(row("ITBIS:     ", fmt(venta.itbis, sim)))
    if (Number(venta.descuento) > 0) lines.push(row("Descuento: ", `-${fmt(venta.descuento, sim)}`))
    lines.push(row("TOTAL:     ", fmt(venta.total, sim)))
  }

  if (opciones.mostrarMetodoPago && venta.metodo_pago?.nombre) {
    lines.push(row("Metodo: ", venta.metodo_pago.nombre))
  }

  lines.push(line)
  lines.push(row("Total venta: ",  fmt(venta.total, sim)))
  lines.push(row("Pagado: ",        fmt(montoPagado, sim)))
  lines.push(row("Pendiente: ",     fmt(montoPend, sim)))
  lines.push(row("Cuotas: ",        `${pagadas.length}/${cuotas.length}`))
  lines.push(line)

  const cc = Math.floor(cols / 4)
  lines.push(`${'#'.padEnd(4)}${fmt(0,"").replace(/\d/g,"M").slice(0, cc).padEnd(cc)}Estado    Fecha`)
  lines.push("-".repeat(cols))
  for (const c of cuotas) {
    const num   = String(c.numero).padEnd(4)
    const monto = fmt(c.monto, sim).padEnd(cc)
    const est   = (c.estado === "pagada" ? "Pagada" : "Pendiente").padEnd(10)
    const fecha = c.pagada_at ? fmtFecha(c.pagada_at) : "—"
    lines.push(`${num}${monto}${est}${fecha}`)
  }
  lines.push(line)
  if (opciones.mostrarMensajeFinal) lines.push(center("Gracias por su preferencia"))
  lines.push("\n\n\n")
  return lines.join("\n")
}

async function getVentaCuota(ventaId, empresaId) {
  try {
    const res = await apiFetch(`/api/pos/cuotas/imprimir/${empresaId}/${ventaId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function ImprimirCuotaPage({ id }) {
  const router     = useRouter()
  const boucherRef = useRef(null)

  const [empresaId,   setEmpresaId]   = useState(null)
  const [venta,       setVenta]       = useState(null)
  const [cargando,    setCargando]    = useState(true)
  const [platform,    setPlatform]    = useState(null)
  const [connected,   setConnected]   = useState(false)
  const [btStatus,    setBtStatus]    = useState("idle")
  const [btMsg,       setBtMsg]       = useState("")
  const [ancho,       setAncho]       = useState("58")
  const [opciones,    setOpciones]    = useState(OPCIONES_DEFAULT)
  const [modalWA,     setModalWA]     = useState(false)
  const [numeroWA,    setNumeroWA]    = useState("")
  const [enviandoWA,  setEnviandoWA]  = useState(false)
  const [errorWA,     setErrorWA]     = useState("")

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) { router.push("/login"); return }
    setEmpresaId(payload.empresa_id)
  }, [])

  useEffect(() => {
    if (!empresaId) return
    getVentaCuota(id, empresaId).then(d => { setVenta(d); setCargando(false) })
  }, [id, empresaId])

  useEffect(() => {
    if (typeof window === "undefined") return
    setPlatform(printerPlatformAvailable() ? "bluetooth" : null)
    setConnected(printerIsConnected())
    const saved = localStorage.getItem("opcionesImpresionCuota")
    if (saved) { try { setOpciones({ ...OPCIONES_DEFAULT, ...JSON.parse(saved) }) } catch {} }
    const savedAncho = localStorage.getItem("tamanoPapelImpresion")
    if (savedAncho) setAncho(savedAncho)
  }, [])

  const toggleOpcion = useCallback((key) => {
    setOpciones(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem("opcionesImpresionCuota", JSON.stringify(next))
      return next
    })
  }, [])

  const cambiarAncho = useCallback((val) => {
    setAncho(val)
    localStorage.setItem("tamanoPapelImpresion", val)
  }, [])

  const handleConnect = useCallback(async () => {
    setBtStatus("loading"); setBtMsg("Buscando impresora...")
    try {
      const res = await printerConnect()
      setConnected(true); setBtStatus("success")
      setBtMsg(res.deviceName ? `Conectado: ${res.deviceName}` : "Conectado")
    } catch (err) {
      setConnected(false); setBtStatus("error"); setBtMsg(err.message ?? "Error al conectar")
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await printerDisconnect(); setConnected(false); setBtStatus("idle"); setBtMsg("")
  }, [])

  const handlePrintBluetooth = useCallback(async () => {
    if (!venta) return
    setBtStatus("loading"); setBtMsg("Imprimiendo...")
    try {
      const cols = ancho === "58" ? 32 : ancho === "A4" ? 64 : 42
      await printerPrintCuota(venta, cols, opciones)
      setBtStatus("success"); setBtMsg("Impresion enviada")
    } catch (err) {
      setBtStatus("error"); setBtMsg(err.message ?? "Error al imprimir")
    }
  }, [venta, ancho, opciones])

  const handlePrintBrowser = useCallback(() => { window.print() }, [])

  const handleRawBT = useCallback(async () => {
    if (!venta) return
    const cols  = ancho === "58" ? 32 : 42
    const texto = buildCuotaRawText(venta, cols, opciones)
    const esAndroidNav = /Android/i.test(navigator.userAgent)
    const blob  = new Blob([texto], { type: "text/plain" })
    const file  = new File([blob], "cuota.txt", { type: "text/plain" })

    if (esAndroidNav && navigator.canShare?.({ files: [file] })) {
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
      backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true,
      width: boucherRef.current.scrollWidth, height: boucherRef.current.scrollHeight,
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
    setEnviandoWA(true); setErrorWA("")
    const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    try {
      if (esMobile && navigator.share) {
        try {
          const blob = await capturarImagen()
          const file = new File([blob], `cuotas_${venta.id}.png`, { type: "image/png" })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "Estado de Cuotas" })
            cerrarModalWA()
            return
          }
        } catch {}
      }

      const blob   = await capturarImagen()
      const imgUrl = URL.createObjectURL(blob)
      const link   = document.createElement("a")
      link.href = imgUrl; link.download = `cuotas_${venta.id}.png`
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(imgUrl), 100)

      const sim      = venta.empresa?.moneda?.simbolo ?? "RD$"
      const _cuotas  = venta.venta_cuotas ?? []
      const _pagadas = _cuotas.filter(c => c.estado === "pagada")
      const _montoPag = _pagadas.reduce((a, c) => a + Number(c.monto), 0)
      const _montoPen = _cuotas.filter(c => c.estado === "pendiente").reduce((a, c) => a + Number(c.monto), 0)
      const text = [
        `*${venta.empresa?.nombre ?? ""}*`,
        `Estado de cuotas — ${venta.cliente?.nombre ?? ""}`,
        `Total: ${fmt(venta.total, sim)}`,
        `Pagado: ${fmt(_montoPag, sim)}`,
        `Pendiente: ${fmt(_montoPen, sim)}`,
        `Cuotas: ${_pagadas.length}/${_cuotas.length}`,
        "",
        "Ver imagen adjunta para el detalle completo.",
      ].join("\n")
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

  if (!empresaId || cargando) return (
    <div className={s.loading}><span className={s.spinner} /><p>Cargando boucher...</p></div>
  )
  if (!venta) return (
    <div className={s.loading}><p>Venta no encontrada</p><button className={s.btnVolver} onClick={() => router.back()}>Volver</button></div>
  )

  const simbolo     = venta.empresa?.moneda?.simbolo ?? "RD$"
  const esAndroid   = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  const cuotas      = venta.venta_cuotas ?? []
  const pagadas     = cuotas.filter(c => c.estado === "pagada")
  const montoPagado = pagadas.reduce((a, c) => a + Number(c.monto), 0)
  const montoPend   = cuotas.filter(c => c.estado === "pendiente").reduce((a, c) => a + Number(c.monto), 0)
  const pct         = cuotas.length > 0 ? Math.round((pagadas.length / cuotas.length) * 100) : 0

  const detalles = venta.venta_detalles ?? []

  const SWITCHES = [
    { key: "mostrarDatosEmpresa", label: "Datos Empresa" },
    { key: "mostrarDatosCliente", label: "Datos Cliente" },
    { key: "mostrarVendedor",     label: "Vendedor" },
    { key: "mostrarProductos",    label: "Productos" },
    { key: "mostrarMetodoPago",   label: "Metodo Pago" },
    { key: "mostrarMensajeFinal", label: "Mensaje Final" },
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
                <button key={a} className={`${s.btnAncho} ${ancho === a ? s.anchoActivo : ""}`} onClick={() => cambiarAncho(a)}>
                  {a === "A4" ? "A4" : `${a}mm`}
                </button>
              ))}
            </div>

            {platform === "bluetooth" && (
              <div className={s.metodo}>
                <div className={s.metodoHeader}>
                  <span className={s.metodoBadge}>Bluetooth</span>
                  <span className={`${s.dot} ${connected ? s.dotOn : s.dotOff}`} />
                </div>
                {btMsg && <p className={`${s.btMsg} ${btStatus === "error" ? s.btMsgError : btStatus === "success" ? s.btMsgOk : ""}`}>{btMsg}</p>}
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
                  <button className={`${s.switch} ${opciones[key] ? s.switchOn : ""}`} onClick={() => toggleOpcion(key)}>
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
                <div className={s.reciboTitulo}>ESTADO DE CUOTAS</div>
                <div className={s.reciboNum}>#{String(venta.id).padStart(6, "0")}</div>
                <div className={s.reciboFecha}>{new Date(venta.created_at).toLocaleString("es-DO")}</div>
              </div>
              <div className={s.sep} />

              <div className={s.infoWrap}>
                {opciones.mostrarDatosCliente && venta.cliente && (
                  <div className={s.infoRow}><span className={s.infoLabel}>Cliente:</span><span>{venta.cliente.nombre}</span></div>
                )}
                {opciones.mostrarDatosCliente && venta.cliente?.cedula_rnc && (
                  <div className={s.infoRow}><span className={s.infoLabel}>Ced/RNC:</span><span>{venta.cliente.cedula_rnc}</span></div>
                )}
                {venta.comprobante && (
                  <div className={s.infoRow}><span className={s.infoLabel}>NCF:</span><span>{venta.comprobante.codigo} — {venta.comprobante.descripcion}</span></div>
                )}
                {opciones.mostrarVendedor && venta.usuario?.nombre_completo && (
                  <div className={s.infoRow}><span className={s.infoLabel}>Vendedor:</span><span>{venta.usuario.nombre_completo}</span></div>
                )}
              </div>

              {opciones.mostrarProductos && detalles.length > 0 && (
                <>
                  <div className={s.sep} />
                  <div className={s.itemsHeader}>
                    <span>Producto</span>
                    <span className={s.itemHDer}>Cant × Precio = Total</span>
                  </div>
                  <div className={s.sepFino} />
                  {detalles.map(d => (
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
                    {Number(venta.itbis) > 0 && (
                      <div className={s.totalRow}><span>ITBIS</span><span>{fmt(venta.itbis, simbolo)}</span></div>
                    )}
                    {Number(venta.descuento) > 0 && (
                      <div className={s.totalRow}><span>Descuento</span><span>-{fmt(venta.descuento, simbolo)}</span></div>
                    )}
                    <div className={s.sepFino} />
                    <div className={`${s.totalRow} ${s.totalFinal}`}>
                      <span>TOTAL</span><span>{fmt(venta.total, simbolo)}</span>
                    </div>
                  </div>
                </>
              )}

              {opciones.mostrarMetodoPago && venta.metodo_pago?.nombre && (
                <>
                  <div className={s.sepFino} />
                  <div className={s.totalRow}>
                    <span>Metodo pago</span>
                    <span>{venta.metodo_pago.nombre}</span>
                  </div>
                </>
              )}

              <div className={s.sep} />

              <div className={s.resumenCuotas}>
                <div className={s.resumenRow}><span>Total venta</span><span>{fmt(venta.total, simbolo)}</span></div>
                <div className={s.resumenRow}><span>Cuotas pagadas</span><span>{pagadas.length} de {cuotas.length}</span></div>
                <div className={s.resumenRow}><span>Monto pagado</span><span className={s.montoOk}>{fmt(montoPagado, simbolo)}</span></div>
                <div className={s.resumenRow}><span>Monto pendiente</span><span className={s.montoPend}>{fmt(montoPend, simbolo)}</span></div>
              </div>

              <div className={s.progresoWrap}>
                <div className={s.progresoBar}>
                  <div className={s.progresoFill} style={{ width: `${pct}%` }} />
                </div>
                <div className={s.progresoTexto}>{pct}% completado</div>
              </div>

              <div className={s.sep} />

              <div className={s.cuotasHead}>
                <span>#</span>
                <span>Monto</span>
                <span>Estado</span>
                <span>Fecha</span>
              </div>
              <div className={s.sepFino} />

              {cuotas.map(c => (
                <div key={c.id} className={`${s.cuotaRow} ${c.estado === "pagada" ? s.cuotaRowPagada : ""}`}>
                  <span className={s.cuotaNum}>{c.numero}</span>
                  <span className={s.cuotaMonto}>{fmt(c.monto, simbolo)}</span>
                  <span className={`${s.cuotaEstado} ${c.estado === "pagada" ? s.estPagada : s.estPendiente}`}>
                    {c.estado === "pagada" ? "Pagada" : "Pendiente"}
                  </span>
                  <span className={s.cuotaFecha}>{c.pagada_at ? fmtFecha(c.pagada_at) : "—"}</span>
                </div>
              ))}

              {opciones.mostrarMensajeFinal && (
                <>
                  <div className={s.sep} />
                  <div className={s.footer}><p>Gracias por su preferencia</p></div>
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
              <p className={s.modalDesc}>Ingresa el numero del cliente con codigo de pais sin el signo +</p>
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