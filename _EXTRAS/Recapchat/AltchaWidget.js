"use client"
import { apiFetch } from "@/_EXTRAS/peticion"

import { useState, useEffect, useRef } from "react"
import s from "./AltchaWidget.module.css"

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function fetchChallenge() {
  const res = await apiFetch(`/api/auth/captcha`)
  if (!res.ok) throw new Error("No se pudo obtener el challenge")
  return res.json()
}

async function solveChallenge(challenge, onProgress) {
  const { algorithm, challenge: ch, maxnumber, salt } = challenge
  const total = maxnumber ?? 1000000
  for (let n = 0; n <= total; n++) {
    if (n % 5000 === 0) onProgress?.(Math.round((n / total) * 100))
    const buf = new TextEncoder().encode(`${salt}${n}`)
    const hashBuf = await crypto.subtle.digest("SHA-256", buf)
    const hex = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
    if (hex === ch) return n
  }
  return null
}

export default function AltchaWidget({ onVerified, onReset }) {
  const [estado, setEstado] = useState("idle")
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState([false, false, false])
  const dotTimer = useRef(null)

  useEffect(() => () => clearInterval(dotTimer.current), [])

  function animateDots() {
    let i = 0
    dotTimer.current = setInterval(() => {
      i = (i + 1) % 4
      setDots([i > 0, i > 1, i > 2])
    }, 300)
  }

  async function handleClick() {
    if (estado !== "idle") return
    setEstado("solving")
    setProgress(0)
    animateDots()

    try {
      const challenge = await fetchChallenge()
      const number = await solveChallenge(challenge, setProgress)
      clearInterval(dotTimer.current)

      if (number === null) throw new Error("No se pudo resolver")

      const solution = {
        algorithm: challenge.algorithm,
        challenge: challenge.challenge,
        number,
        salt: challenge.salt,
        signature: challenge.signature,
      }

      setProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setEstado("verified")
      onVerified?.(btoa(JSON.stringify(solution)))
    } catch {
      clearInterval(dotTimer.current)
      setEstado("error")
      setTimeout(() => { setEstado("idle"); setProgress(0) }, 2500)
    }
  }

  function handleReset(e) {
    e.stopPropagation()
    setEstado("idle")
    setProgress(0)
    onReset?.()
  }

  return (
    <div
      className={`${s.wrap} ${s[estado]}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === " " || e.key === "Enter") && handleClick()}
      aria-label="Verificación de seguridad"
    >
      <div className={s.inner}>
        <div className={s.iconZone}>
          {estado === "idle" && (
            <div className={s.checkboxIdle}>
              <div className={s.checkboxBox} />
            </div>
          )}
          {estado === "solving" && (
            <div className={s.spinnerWrap}>
              <svg className={s.spinRing} viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeDasharray="60 28" strokeLinecap="round"/>
              </svg>
              <svg className={s.spinRingInner} viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="8" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeDasharray="30 20" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {estado === "verified" && (
            <div className={s.successWrap}>
              <svg className={s.checkIcon} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          {estado === "error" && (
            <div className={s.errorWrap}>
              <svg className={s.xIcon} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        <div className={s.textZone}>
          {estado === "idle" && (
            <>
              <span className={s.mainLabel}>No soy un robot</span>
              <span className={s.subLabel}>Haz clic para verificar</span>
            </>
          )}
          {estado === "solving" && (
            <>
              <span className={s.mainLabel}>
                Verificando
                <span className={s.dotGroup}>
                  {dots.map((on, i) => (
                    <span key={i} className={`${s.dot} ${on ? s.dotOn : ""}`} />
                  ))}
                </span>
              </span>
              <div className={s.progressTrack}>
                <div className={s.progressBar} style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
          {estado === "verified" && (
            <>
              <span className={s.mainLabel}>Verificado</span>
              <span className={s.subLabel}>Puedes continuar</span>
            </>
          )}
          {estado === "error" && (
            <>
              <span className={s.mainLabel}>Error</span>
              <span className={s.subLabel}>Intenta de nuevo</span>
            </>
          )}
        </div>

        <div className={s.rightZone}>
          {estado === "verified" ? (
            <button className={s.resetBtn} onClick={handleReset} type="button" title="Restablecer">
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                <path d="M4 10a6 6 0 1 0 1.6-4M4 6v4h4"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className={s.badge}>
              <div className={s.badgeLock}>
                <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
                  <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <span className={s.badgeText}>ALTCHA</span>
            </div>
          )}
        </div>
      </div>

      {estado === "solving" && (
        <div className={s.scanLine} />
      )}
    </div>
  )
}