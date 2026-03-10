import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

const AZUL       = "FF1D6FCE"
const AZUL_CLARO = "FFE8F0FC"
const GRIS       = "FFF8FAFC"
const BLANCO     = "FFFFFFFF"
const VERDE      = "FF16A34A"
const ROJO       = "FFDC2626"
const NARANJA    = "FFD97706"
const TEXTO      = "FF0F172A"
const TEXTO_SUB  = "FF64748B"
const MONEY_FMT  = '"RD$ "#,##0.00'

function applyCell(cell, opts = {}) {
  const { value, bold = false, size = 10, color = TEXTO, bg = null, halign = "left", wrap = false, border = null } = opts
  if (value !== undefined) cell.value = value
  cell.font      = { name: "Calibri", size, bold, color: { argb: color } }
  cell.alignment = { horizontal: halign, vertical: "middle", wrapText: wrap }
  if (bg)     cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
  if (border) cell.border = border
}

const THIN = {
  top:    { style: "thin", color: { argb: "FFB0C4DE" } },
  bottom: { style: "thin", color: { argb: "FFB0C4DE" } },
  left:   { style: "thin", color: { argb: "FFB0C4DE" } },
  right:  { style: "thin", color: { argb: "FFB0C4DE" } },
}
const HAIR = {
  bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
  left:   { style: "hair", color: { argb: "FFE2E8F0" } },
  right:  { style: "hair", color: { argb: "FFE2E8F0" } },
}
const TOTAL_BORDER = {
  top:    { style: "medium", color: { argb: AZUL } },
  bottom: { style: "medium", color: { argb: AZUL } },
}

function headerBlock(ws, fila, numCols, titulo, metas = []) {
  const lastCol = String.fromCharCode(64 + numCols)
  ws.mergeCells(`A${fila}:${lastCol}${fila}`)
  applyCell(ws.getCell(`A${fila}`), { value: titulo, bold: true, size: 15, color: BLANCO, bg: AZUL, halign: "center" })
  ws.getRow(fila).height = 34

  metas.forEach(([key, val], idx) => {
    const r = fila + 1 + idx
    applyCell(ws.getCell(`A${r}`), { value: key, bold: true, size: 10, color: TEXTO_SUB })
    ws.mergeCells(`B${r}:${lastCol}${r}`)
    applyCell(ws.getCell(`B${r}`), { value: val, bold: true, size: 10, color: TEXTO })
    ws.getRow(r).height = 18
  })

  const spacer = fila + 1 + metas.length
  ws.getRow(spacer).height = 6
  return spacer + 1
}

function writeHeaders(ws, fila, headers) {
  const row = ws.getRow(fila)
  headers.forEach((h, i) => {
    applyCell(row.getCell(i + 1), { value: h, bold: true, size: 10, color: BLANCO, bg: AZUL, halign: "center", wrap: true, border: THIN })
  })
  row.height = 26
}

function writeData(ws, fila, values, isAlt) {
  const row = ws.getRow(fila)
  values.forEach((v, i) => {
    applyCell(row.getCell(i + 1), { value: v, bg: isAlt ? GRIS : BLANCO, border: HAIR })
  })
  row.height = 20
}

function writeTotals(ws, fila, values, dataStartRow, hasData) {
  const row = ws.getRow(fila)
  values.forEach((v, i) => {
    let cellVal = v
    if (typeof v === "object" && v !== null && v.formula) {
      cellVal = hasData ? { formula: v.formula } : 0
    }
    applyCell(row.getCell(i + 1), {
      value: cellVal,
      bold: true,
      size: 10,
      color: i === 0 ? TEXTO : AZUL,
      bg: AZUL_CLARO,
      border: TOTAL_BORDER,
    })
  })
  row.height = 22
}

function autoFit(ws, min = 10, max = 44) {
  ws.columns.forEach(col => {
    let w = min
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value != null ? String(cell.value).length : 0
      if (len > w) w = len
    })
    col.width = Math.min(w + 2, max)
  })
}

function n(v) { return Number(v ?? 0) }

function fmtFecha(f) {
  if (!f) return ""
  return new Date(f).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function moneyLabel(val) {
  return `RD$ ${n(val).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`
}

export async function exportarExcelVentas(data, label) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "IsiWeek"
  wb.created = new Date()

  const ws = wb.addWorksheet("Ventas", { views: [{ state: "frozen", ySplit: 7 }] })
  const heads = ["Fecha","Cliente","Vendedor","Metodo Pago","Comprobante","Subtotal","ITBIS","Descuento","Total","Estado"]

  const dStart = headerBlock(ws, 1, heads.length, "REPORTE DE VENTAS", [
    ["Periodo:",      label],
    ["Total ventas:", `${moneyLabel(data?.resumen?.total)} — ${data?.resumen?.cantidad ?? 0} transacciones`],
    ["ITBIS total:",  moneyLabel(data?.resumen?.itbis)],
  ])

  writeHeaders(ws, dStart, heads)

  const detalles = data?.detalles ?? []
  let f = dStart + 1

  for (const v of detalles) {
    writeData(ws, f, [
      fmtFecha(v.created_at),
      v.cliente?.nombre ?? "Consumidor final",
      v.usuario?.nombre_completo ?? "-",
      v.metodo_pago?.nombre ?? "-",
      v.comprobante?.codigo ?? "-",
      n(v.subtotal),
      n(v.itbis),
      n(v.descuento),
      n(v.total),
      v.estado ?? "-",
    ], f % 2 === 0)
    ;["F","G","H","I"].forEach(c => { ws.getCell(`${c}${f}`).numFmt = MONEY_FMT })
    const ec = v.estado === "completada" ? VERDE : v.estado === "cancelada" ? ROJO : NARANJA
    ws.getCell(`J${f}`).font = { name: "Calibri", bold: true, size: 10, color: { argb: ec } }
    f++
  }

  const hasData = detalles.length > 0
  writeTotals(ws, f, [
    "TOTALES","","","","",
    { formula: `SUM(F${dStart+1}:F${f-1})` },
    { formula: `SUM(G${dStart+1}:G${f-1})` },
    { formula: `SUM(H${dStart+1}:H${f-1})` },
    { formula: `SUM(I${dStart+1}:I${f-1})` },
    "",
  ], dStart + 1, hasData)
  ;["F","G","H","I"].forEach(c => { ws.getCell(`${c}${f}`).numFmt = MONEY_FMT })
  autoFit(ws)

  const wsM = wb.addWorksheet("Por Metodo Pago")
  const mStart = headerBlock(wsM, 1, 3, "VENTAS POR METODO DE PAGO", [["Periodo:", label]])
  writeHeaders(wsM, mStart, ["Metodo","Cantidad","Total"])
  let fm = mStart + 1
  const metodos = data?.ventasPorMetodo ?? []
  for (const m of metodos) {
    writeData(wsM, fm, [m.nombre, m.cantidad, n(m.total)], fm % 2 === 0)
    wsM.getCell(`C${fm}`).numFmt = MONEY_FMT
    fm++
  }
  writeTotals(wsM, fm, [
    "TOTAL",
    { formula: `SUM(B${mStart+1}:B${fm-1})` },
    { formula: `SUM(C${mStart+1}:C${fm-1})` },
  ], mStart + 1, metodos.length > 0)
  wsM.getCell(`C${fm}`).numFmt = MONEY_FMT
  autoFit(wsM)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `ventas_${label.replace(/\s/g, "_")}.xlsx`)
}

export async function exportarExcelProductos(data, label) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "IsiWeek"

  const ws = wb.addWorksheet("Top Productos", { views: [{ state: "frozen", ySplit: 5 }] })
  const heads = ["#","Producto","Categoria","Precio Unit.","Uds Vendidas","Total Ingresos"]

  const dStart = headerBlock(ws, 1, heads.length, "TOP PRODUCTOS VENDIDOS", [["Periodo:", label]])
  writeHeaders(ws, dStart, heads)

  const top = data?.topVendidos ?? []
  let f = dStart + 1
  for (const [i, p] of top.entries()) {
    writeData(ws, f, [i + 1, p.nombre, p.categoria, n(p.precio), n(p.cantidad), n(p.total)], f % 2 === 0)
    ws.getCell(`D${f}`).numFmt = MONEY_FMT
    ws.getCell(`F${f}`).numFmt = MONEY_FMT
    ws.getCell(`A${f}`).alignment = { horizontal: "center", vertical: "middle" }
    f++
  }
  writeTotals(ws, f, [
    "","TOTALES","",
    { formula: `SUM(D${dStart+1}:D${f-1})` },
    { formula: `SUM(E${dStart+1}:E${f-1})` },
    { formula: `SUM(F${dStart+1}:F${f-1})` },
  ], dStart + 1, top.length > 0)
  ws.getCell(`D${f}`).numFmt = MONEY_FMT
  ws.getCell(`F${f}`).numFmt = MONEY_FMT
  autoFit(ws)

  const wsC = wb.addWorksheet("Por Categoria")
  const cStart = headerBlock(wsC, 1, 2, "VENTAS POR CATEGORIA", [["Periodo:", label]])
  writeHeaders(wsC, cStart, ["Categoria","Total Ingresos"])
  let fc = cStart + 1
  const cats = data?.resumenCategorias ?? []
  for (const c of cats) {
    writeData(wsC, fc, [c.nombre, n(c.total)], fc % 2 === 0)
    wsC.getCell(`B${fc}`).numFmt = MONEY_FMT
    fc++
  }
  writeTotals(wsC, fc, [
    "TOTAL",
    { formula: `SUM(B${cStart+1}:B${fc-1})` },
  ], cStart + 1, cats.length > 0)
  wsC.getCell(`B${fc}`).numFmt = MONEY_FMT
  autoFit(wsC)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `productos_${label.replace(/\s/g, "_")}.xlsx`)
}

export async function exportarExcelClientes(data, label) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "IsiWeek"

  const ws = wb.addWorksheet("Top Clientes", { views: [{ state: "frozen", ySplit: 5 }] })
  const heads = ["#","Cliente","Telefono","Compras","Total Comprado"]

  const dStart = headerBlock(ws, 1, heads.length, "TOP CLIENTES", [["Periodo:", label]])
  writeHeaders(ws, dStart, heads)

  const clientes = data?.topClientes ?? []
  let f = dStart + 1
  for (const [i, c] of clientes.entries()) {
    writeData(ws, f, [i + 1, c.nombre, c.telefono, c.compras, n(c.total)], f % 2 === 0)
    ws.getCell(`E${f}`).numFmt = MONEY_FMT
    ws.getCell(`A${f}`).alignment = { horizontal: "center", vertical: "middle" }
    f++
  }
  writeTotals(ws, f, [
    "","TOTALES","",
    { formula: `SUM(D${dStart+1}:D${f-1})` },
    { formula: `SUM(E${dStart+1}:E${f-1})` },
  ], dStart + 1, clientes.length > 0)
  ws.getCell(`E${f}`).numFmt = MONEY_FMT
  autoFit(ws)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `clientes_${label.replace(/\s/g, "_")}.xlsx`)
}

export async function exportarExcelGastos(data, label) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "IsiWeek"

  const ws = wb.addWorksheet("Gastos", { views: [{ state: "frozen", ySplit: 6 }] })
  const heads = ["Fecha","Concepto","Tipo","Registrado por","Monto"]

  const dStart = headerBlock(ws, 1, heads.length, "REPORTE DE GASTOS", [
    ["Periodo:",      label],
    ["Total gastos:", `${moneyLabel(data?.resumen?.total)} — ${data?.resumen?.cantidad ?? 0} registros`],
  ])
  writeHeaders(ws, dStart, heads)

  const gastos = data?.detalles ?? []
  let f = dStart + 1
  for (const g of gastos) {
    writeData(ws, f, [
      fmtFecha(g.created_at),
      g.concepto,
      g.tipo ?? "-",
      g.usuario?.nombre_completo ?? "-",
      n(g.monto),
    ], f % 2 === 0)
    ws.getCell(`E${f}`).numFmt = MONEY_FMT
    ws.getCell(`E${f}`).font = { name: "Calibri", bold: true, size: 10, color: { argb: ROJO } }
    f++
  }
  writeTotals(ws, f, [
    "TOTAL","","","",
    { formula: `SUM(E${dStart+1}:E${f-1})` },
  ], dStart + 1, gastos.length > 0)
  ws.getCell(`E${f}`).numFmt = MONEY_FMT
  autoFit(ws)

  const wsT = wb.addWorksheet("Por Tipo")
  const tStart = headerBlock(wsT, 1, 3, "GASTOS POR TIPO", [["Periodo:", label]])
  writeHeaders(wsT, tStart, ["Tipo","Cantidad","Total"])
  let ft = tStart + 1
  const tipos = data?.porTipo ?? []
  for (const t of tipos) {
    writeData(wsT, ft, [t.tipo, t.cantidad, n(t.total)], ft % 2 === 0)
    wsT.getCell(`C${ft}`).numFmt = MONEY_FMT
    ft++
  }
  writeTotals(wsT, ft, [
    "TOTAL",
    { formula: `SUM(B${tStart+1}:B${ft-1})` },
    { formula: `SUM(C${tStart+1}:C${ft-1})` },
  ], tStart + 1, tipos.length > 0)
  wsT.getCell(`C${ft}`).numFmt = MONEY_FMT
  autoFit(wsT)

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `gastos_${label.replace(/\s/g, "_")}.xlsx`)
}