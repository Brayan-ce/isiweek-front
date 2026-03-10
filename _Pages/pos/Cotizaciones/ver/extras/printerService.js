"use client"

const ESC = 0x1b
const GS  = 0x1d

function textToBytes(str) {
  return Array.from(new TextEncoder().encode(str))
}

function buildTicket(venta, ancho, opciones) {
  const bytes = []
  const sim   = venta.empresa?.moneda?.simbolo ?? "RD$"

  function fmt(n) {
    return `${sim} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  function line(text = "")  { return [...textToBytes(text + "\n")] }
  function sep()             { return line("-".repeat(ancho)) }
  function center(text)      { const p = Math.max(0, Math.floor((ancho - text.length) / 2)); return line(" ".repeat(p) + text) }
  function row(left, right)  { const sp = Math.max(1, ancho - left.length - right.length); return line(left + " ".repeat(sp) + right) }

  bytes.push(ESC, 0x40)

  if (opciones.mostrarDatosEmpresa) {
    if (venta.empresa?.nombre)    bytes.push(...center(venta.empresa.nombre.toUpperCase()))
    if (venta.empresa?.rnc)       bytes.push(...line(`RNC: ${venta.empresa.rnc}`))
    if (venta.empresa?.telefono)  bytes.push(...line(venta.empresa.telefono))
    if (venta.empresa?.direccion) bytes.push(...line(venta.empresa.direccion))
  }

  bytes.push(...sep())
  bytes.push(...center("RECIBO DE VENTA"))
  bytes.push(...center(`#${String(venta.id).padStart(6, "0")}`))
  bytes.push(...line(new Date(venta.created_at).toLocaleString("es-DO")))
  bytes.push(...sep())

  if (opciones.mostrarDatosCliente) {
    if (venta.cliente?.nombre)     bytes.push(...line(`Cliente: ${venta.cliente.nombre}`))
    if (venta.cliente?.cedula_rnc) bytes.push(...line(`Ced/RNC: ${venta.cliente.cedula_rnc}`))
  }
  if (venta.comprobante) bytes.push(...line(`NCF: ${venta.comprobante.codigo} ${venta.comprobante.descripcion}`))
  if (venta.caja_sesion?.caja?.nombre) bytes.push(...line(`Caja: ${venta.caja_sesion.caja.nombre}`))
  if (opciones.mostrarVendedor && venta.usuario?.nombre_completo) {
    bytes.push(...line(`Vendedor: ${venta.usuario.nombre_completo}`))
  }

  bytes.push(...sep())

  const colCant   = 5
  const colPrecio = 10
  const colTotal  = 10
  const colDesc   = ancho - colCant - colPrecio - colTotal - 3

  bytes.push(...line(
    "Desc".padEnd(colDesc) + " " +
    "Cant".padStart(colCant) + " " +
    "Precio".padStart(colPrecio) + " " +
    "Total".padStart(colTotal)
  ))
  bytes.push(...sep())

  for (const d of venta.venta_detalles) {
    const nombre = String(d.nombre_producto).substring(0, colDesc).padEnd(colDesc)
    const cant   = String(d.cantidad).padStart(colCant)
    const precio = fmt(d.precio_unitario).padStart(colPrecio)
    const total  = fmt(d.subtotal).padStart(colTotal)
    bytes.push(...line(`${nombre} ${cant} ${precio} ${total}`))
  }

  bytes.push(...sep())
  bytes.push(...row("Subtotal:", fmt(venta.subtotal)))
  bytes.push(...row("ITBIS:", fmt(venta.itbis)))
  if (Number(venta.descuento) > 0) bytes.push(...row("Descuento:", `-${fmt(venta.descuento)}`))
  bytes.push(...sep())

  bytes.push(ESC, 0x45, 0x01)
  bytes.push(...row("TOTAL:", fmt(venta.total)))
  bytes.push(ESC, 0x45, 0x00)

  bytes.push(...sep())

  if (opciones.mostrarMetodoPago) {
    if (venta.es_pago_mixto && venta.venta_pagos?.length > 0) {
      for (const p of venta.venta_pagos) bytes.push(...row(p.metodo_pago.nombre + ":", fmt(p.monto)))
    } else {
      if (venta.metodo_pago?.nombre) bytes.push(...row("Metodo:", venta.metodo_pago.nombre))
      if (Number(venta.efectivo_recibido) > 0) bytes.push(...row("Efectivo:", fmt(venta.efectivo_recibido)))
      if (Number(venta.efectivo_recibido) > Number(venta.total)) {
        bytes.push(...row("Cambio:", fmt(Number(venta.efectivo_recibido) - Number(venta.total))))
      }
    }
  }

  if (opciones.mostrarMensajeFinal) {
    bytes.push(...sep())
    bytes.push(...center("Gracias por su compra"))
  }

  bytes.push(...line(""))
  bytes.push(...line(""))
  bytes.push(...line(""))
  bytes.push(GS, 0x56, 0x41, 0x10)

  return new Uint8Array(bytes)
}

async function connectBluetooth() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ["000018f0-0000-1000-8000-00805f9b34fb"] },
      { namePrefix: "POS" },
      { namePrefix: "Printer" },
      { namePrefix: "RPP" },
      { namePrefix: "MTP" },
      { namePrefix: "BlueTooth Printer" },
    ],
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  })

  const server = await device.gatt.connect()
  let service, characteristic

  for (const uuid of [
    "000018f0-0000-1000-8000-00805f9b34fb",
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  ]) {
    try { service = await server.getPrimaryService(uuid); break } catch {}
  }

  if (!service) throw new Error("No se encontro servicio de impresion compatible")

  const chars = await service.getCharacteristics()
  for (const c of chars) {
    if (c.properties.writeWithoutResponse || c.properties.write) { characteristic = c; break }
  }

  if (!characteristic) throw new Error("No se encontro caracteristica de escritura")
  return { device, characteristic }
}

async function writeBluetooth(characteristic, data) {
  const CHUNK = 512
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
    await new Promise(r => setTimeout(r, 50))
  }
}

let _btConn = null

export async function printerConnect() {
  if (typeof window === "undefined" || !navigator.bluetooth) {
    throw new Error("Web Bluetooth no disponible en este navegador")
  }
  const conn = await connectBluetooth()
  _btConn = conn
  return { platform: "bluetooth", deviceName: conn.device.name }
}

export async function printerPrint(venta, ancho, opciones) {
  if (!_btConn) throw new Error("No hay impresora conectada")
  const bytes = buildTicket(venta, ancho, opciones)
  await writeBluetooth(_btConn.characteristic, bytes)
}

export async function printerDisconnect() {
  if (_btConn?.device?.gatt?.connected) _btConn.device.gatt.disconnect()
  _btConn = null
}

export function printerIsConnected() {
  return !!_btConn?.device?.gatt?.connected
}

export function printerPlatformAvailable() {
  if (typeof window === "undefined") return false
  return !!navigator.bluetooth
}

export function buildRawBTText(venta, ancho, opciones) {
  const sim = venta.empresa?.moneda?.simbolo ?? "RD$"
  function fmt(n) {
    return `${sim} ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  function sep()        { return "-".repeat(ancho) + "\n" }
  function center(t)    { const p = Math.max(0, Math.floor((ancho - t.length) / 2)); return " ".repeat(p) + t + "\n" }
  function row(l, r)    { const sp = Math.max(1, ancho - l.length - r.length); return l + " ".repeat(sp) + r + "\n" }

  let t = ""

  if (opciones.mostrarDatosEmpresa) {
    if (venta.empresa?.nombre)    t += center(venta.empresa.nombre.toUpperCase())
    if (venta.empresa?.rnc)       t += `RNC: ${venta.empresa.rnc}\n`
    if (venta.empresa?.telefono)  t += venta.empresa.telefono + "\n"
    if (venta.empresa?.direccion) t += venta.empresa.direccion + "\n"
  }

  t += sep()
  t += center("RECIBO DE VENTA")
  t += center(`#${String(venta.id).padStart(6, "0")}`)
  t += new Date(venta.created_at).toLocaleString("es-DO") + "\n"
  t += sep()

  if (opciones.mostrarDatosCliente) {
    if (venta.cliente?.nombre)     t += `Cliente: ${venta.cliente.nombre}\n`
    if (venta.cliente?.cedula_rnc) t += `Ced/RNC: ${venta.cliente.cedula_rnc}\n`
  }
  if (venta.comprobante) t += `NCF: ${venta.comprobante.codigo}\n`
  if (opciones.mostrarVendedor && venta.usuario?.nombre_completo) t += `Vendedor: ${venta.usuario.nombre_completo}\n`

  t += sep()
  for (const d of venta.venta_detalles) {
    t += `${d.nombre_producto}\n`
    t += row(`  ${d.cantidad} x ${fmt(d.precio_unitario)}`, fmt(d.subtotal))
  }
  t += sep()
  t += row("Subtotal:", fmt(venta.subtotal))
  t += row("ITBIS:", fmt(venta.itbis))
  if (Number(venta.descuento) > 0) t += row("Descuento:", `-${fmt(venta.descuento)}`)
  t += sep()
  t += row("TOTAL:", fmt(venta.total))

  if (opciones.mostrarMetodoPago) {
    t += sep()
    if (venta.es_pago_mixto && venta.venta_pagos?.length > 0) {
      for (const p of venta.venta_pagos) t += row(p.metodo_pago.nombre + ":", fmt(p.monto))
    } else {
      if (venta.metodo_pago?.nombre) t += row("Metodo:", venta.metodo_pago.nombre)
      if (Number(venta.efectivo_recibido) > Number(venta.total)) {
        t += row("Cambio:", fmt(Number(venta.efectivo_recibido) - Number(venta.total)))
      }
    }
  }

  if (opciones.mostrarMensajeFinal) {
    t += sep()
    t += center("Gracias por su compra")
  }

  t += "\n\n\n"
  return t
}