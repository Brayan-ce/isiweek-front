"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  printerConnect,
  printerDisconnect,
  printerIsConnected,
  printerPlatformAvailable,
} from "../../Vender/imprimir/extras/printerService"
import s from "./ImprimirCuota.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

const OPCIONES_DEFAULT = {
  mostrarDatosEmpresa: true,
  mostrarDatosCliente: true,
  mostrarVendedor:     true,
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
  const [ancho,       setAncho]       = useState("80")
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

  function toggleOpcion(key) {
    setOpciones(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem("opcionesImpresionCuota", JSON.stringify(next))
      return next
    })
  }

  async function handleConnect() {
    setBtStatus("loading"); setBtMsg("Buscando impresora...")
    try {
      const res = await printerConnect()
      setConnected(true); setBtStatus("success")
      setBtMsg(res.deviceName ? `Conectado: ${res.deviceName}` : "Conectado")
    } catch (err) {
      setConnected(false); setBtStatus("error"); setBtMsg(err.message ?? "Error al conectar")
    }
  }

  async function handleDisconnect() {
    await printerDisconnect(); setConnected(false); setBtStatus("idle"); setBtMsg("")
  }

  async function handlePrintBluetooth() {
    if (!venta) return
    setBtStatus("loading"); setBtMsg("Imprimiendo...")
    try {
      setBtStatus("success"); setBtMsg("Impresion enviada")
    } catch (err) {
      setBtStatus("error"); setBtMsg(err.message ?? "Error al imprimir")
    }
  }

  const capturarImagen = async () => {
    if (!boucherRef.current) throw new Error("No se encontro el boucher")
    const html2canvas = (await import("html2canvas")).default
    const canvas = await html2canvas(boucherRef.current, {
      backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true,
      width: boucherRef.current.scrollWidth, height: boucherRef.current.scrollHeight,
    })
    return new Promise(res => canvas.toBlob(blob => res(blob), "image/png", 0.95))
  }

  async function enviarWhatsApp() {
    const limpio = numeroWA.replace(/\D/g, "")
    if (limpio.length < 8) { setErrorWA("Ingresa un numero valido"); return }
    setEnviandoWA(true); setErrorWA("")
    try {
      const blob   = await capturarImagen()
      const imgUrl = URL.createObjectURL(blob)
      const link   = document.createElement("a")
      link.href = imgUrl; link.download = `cuotas_${venta.id}.png`
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(imgUrl), 100)
      const sim  = venta.empresa?.moneda?.simbolo ?? "RD$"
      const text = [
        `*${venta.empresa?.nombre ?? ""}*`,
        `Estado de cuotas - ${venta.cliente?.nombre ?? ""}`,
        `Total: ${fmt(venta.total, sim)}`,
        `Pagado: ${fmt(venta.venta_cuotas?.filter(c => c.estado === "pagada").reduce((a, c) => a + Number(c.monto), 0) ?? 0, sim)}`,
        `Pendiente: ${fmt(venta.venta_cuotas?.filter(c => c.estado === "pendiente").reduce((a, c) => a + Number(c.monto), 0) ?? 0, sim)}`,
      ].join("\n")
      const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      const url = esMobile
        ? `https://wa.me/${limpio}?text=${encodeURIComponent(text)}`
        : `https://web.whatsapp.com/send?phone=${limpio}&text=${encodeURIComponent(text)}`
      window.open(url, "_blank")
      setModalWA(false)
    } catch (err) {
      setErrorWA("Error al generar imagen: " + (err.message ?? ""))
    } finally {
      setEnviandoWA(false)
    }
  }

  if (!empresaId || cargando) return (
    <div className={s.loading}><span className={s.spinner} /><p>Cargando boucher...</p></div>
  )
  if (!venta) return (
    <div className={s.loading}><p>Venta no encontrada</p><button className={s.btnVolver} onClick={() => router.back()}>Volver</button></div>
  )

  const simbolo     = venta.empresa?.moneda?.simbolo ?? "RD$"
  const cuotas      = venta.venta_cuotas ?? []
  const pagadas     = cuotas.filter(c => c.estado === "pagada")
  const pendientes  = cuotas.filter(c => c.estado === "pendiente")
  const montoPagado = pagadas.reduce((a, c) => a + Number(c.monto), 0)
  const montoPend   = pendientes.reduce((a, c) => a + Number(c.monto), 0)
  const pct         = cuotas.length > 0 ? Math.round((pagadas.length / cuotas.length) * 100) : 0

  const SWITCHES = [
    { key: "mostrarDatosEmpresa", label: "Datos Empresa" },
    { key: "mostrarDatosCliente", label: "Datos Cliente" },
    { key: "mostrarVendedor",     label: "Vendedor" },
    { key: "mostrarMensajeFinal", label: "Mensaje Final" },
  ]

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.back()}>Volver</button>
        <button className={s.btnImprimir} onClick={() => window.print()}>Imprimir</button>
        <button className={s.btnWA} onClick={() => { setNumeroWA(venta.cliente?.telefono ?? ""); setModalWA(true) }}>WhatsApp</button>
      </div>

      <div className={s.layout}>
        <div className={s.columnaIzq}>
          <div className={s.card}>
            <p className={s.cardTitulo}>Opciones de impresion</p>
            <div className={s.anchosWrap}>
              <span className={s.anchoLabel}>Papel:</span>
              {["58", "80", "A4"].map(a => (
                <button key={a} className={`${s.btnAncho} ${ancho === a ? s.anchoActivo : ""}`} onClick={() => setAncho(a)}>
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
            <div ref={boucherRef} className={`${s.recibo} ${ancho === "A4" ? s.reciboA4 : ""}`} id="recibo-print">

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
                {opciones.mostrarVendedor && venta.usuario?.nombre_completo && (
                  <div className={s.infoRow}><span className={s.infoLabel}>Vendedor:</span><span>{venta.usuario.nombre_completo}</span></div>
                )}
              </div>

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
        <div className={s.overlay} onClick={() => setModalWA(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <span className={s.modalTitulo}>Enviar por WhatsApp</span>
              <button className={s.modalClose} onClick={() => setModalWA(false)}>x</button>
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
            </div>
            <div className={s.modalFoot}>
              <button className={s.btnCancelar} onClick={() => setModalWA(false)}>Cancelar</button>
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