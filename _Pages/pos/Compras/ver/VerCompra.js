"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCompra } from "./servidor"
import s from "./VerCompra.module.css"

const EMPRESA_ID = 1

function fmt(n) {
  return `RD$ ${Number(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })
}

const ESTADO_META = {
  completada: { label: "Completada", cls: "estadoCompletada" },
  pendiente:  { label: "Pendiente",  cls: "estadoPendiente" },
  cancelada:  { label: "Cancelada",  cls: "estadoCancelada" },
}

export default function VerCompra({ id }) {
  const router = useRouter()
  const [compra, setCompra] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getCompra(EMPRESA_ID, id).then(d => { setCompra(d); setCargando(false) })
  }, [id])

  if (cargando) return (
    <div className={s.loading}>
      <span className={s.spinner} />
      <p>Cargando compra...</p>
    </div>
  )

  if (!compra) return (
    <div className={s.loading}>
      <ion-icon name="alert-circle-outline" style={{ fontSize: "40px", color: "#ef4444" }} />
      <p>Compra no encontrada</p>
      <button className={s.btnVolver} onClick={() => router.back()}>Volver</button>
    </div>
  )

  const meta = ESTADO_META[compra.estado] ?? ESTADO_META.pendiente
  const subtotal = compra.compra_detalles.reduce((a, d) => a + Number(d.subtotal), 0)

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <button className={s.btnVolver} onClick={() => router.back()}>
          <ion-icon name="arrow-back-outline" />
          Volver
        </button>
        <div className={s.topRight}>
          <span className={`${s.estadoBadge} ${s[meta.cls]}`}>{meta.label}</span>
        </div>
      </div>

      <div className={s.layout}>
        <div className={s.mainCol}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <div className={s.cardHeadLeft}>
                <div className={s.compraIcon}><ion-icon name="bag-handle-outline" /></div>
                <div>
                  <div className={s.compraNumero}>Compra #{String(compra.id).padStart(5, "0")}</div>
                  <div className={s.compraFecha}>{fmtFecha(compra.created_at)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="list-outline" />Productos</div>
            <div className={s.detallesHead}>
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Precio costo</span>
              <span>Subtotal</span>
            </div>
            {compra.compra_detalles.map(d => (
              <div key={d.id} className={s.detalleRow}>
                <div className={s.detalleInfo}>
                  <span className={s.detalleNombre}>{d.nombre_producto ?? d.producto?.nombre ?? "—"}</span>
                  {d.producto?.codigo && <span className={s.detalleCodigo}>{d.producto.codigo}</span>}
                </div>
                <span className={s.detalleCant}>{d.cantidad}</span>
                <span className={s.detallePrecio}>{fmt(d.precio_unitario)}</span>
                <span className={s.detalleSubtotal}>{fmt(d.subtotal)}</span>
              </div>
            ))}
            <div className={s.totalWrap}>
              <div className={s.totalRow}>
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className={`${s.totalRow} ${s.totalFinal}`}>
                <span>Total</span>
                <span>{fmt(compra.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={s.sideCol}>
          {compra.proveedor && (
            <div className={s.card}>
              <div className={s.cardTitle}><ion-icon name="business-outline" />Proveedor</div>
              <div className={s.infoItem}>
                <span className={s.infoLabel}>Nombre</span>
                <span className={s.infoVal}>{compra.proveedor.nombre}</span>
              </div>
              {compra.proveedor.rnc && (
                <div className={s.infoItem}>
                  <span className={s.infoLabel}>RNC</span>
                  <span className={s.infoVal}>{compra.proveedor.rnc}</span>
                </div>
              )}
              {compra.proveedor.telefono && (
                <div className={s.infoItem}>
                  <span className={s.infoLabel}>Teléfono</span>
                  <span className={s.infoVal}>{compra.proveedor.telefono}</span>
                </div>
              )}
            </div>
          )}

          <div className={s.card}>
            <div className={s.cardTitle}><ion-icon name="information-circle-outline" />Detalles</div>
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Registrado por</span>
              <span className={s.infoVal}>{compra.usuario?.nombre_completo ?? "—"}</span>
            </div>
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Estado</span>
              <span className={`${s.estadoBadge} ${s[meta.cls]}`}>{meta.label}</span>
            </div>
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Fecha</span>
              <span className={s.infoVal}>{fmtFecha(compra.created_at)}</span>
            </div>
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Ítems</span>
              <span className={s.infoVal}>{compra.compra_detalles.length}</span>
            </div>
          </div>

          <div className={s.resumenCard}>
            <div className={s.resumenLabel}>Total de la compra</div>
            <div className={s.resumenMonto}>{fmt(compra.total)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}