/**
 * โต๊ะไพ่ยิปซี — full-page overlay with the mystical table: ambient smoke, sparks,
 * a slowly turning sigil ring, a shuffle animation, cards dealt face down, then a
 * 3-D flip per card. The draw itself comes from the engine (/api/tarot/draw);
 * this component only animates and displays it.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { api } from "./api"
import type { SpreadId, TarotDraw } from "./api"
import { TarotCardView } from "./TarotCardArt"

type Phase = "idle" | "shuffling" | "dealing" | "ready" | "done"
const SPREADS: { id: SpreadId; name: string; n: number; hint: string }[] = [
  { id: "one", name: "ใบเดียว", n: 1, hint: "คำตอบสั้น หรือพลังงานประจำวัน" },
  { id: "three", name: "อดีต · ปัจจุบัน · อนาคต", n: 3, hint: "เส้นเรื่องของสิ่งที่ถาม" },
  { id: "five", name: "กางเขนห้าใบ", n: 5, hint: "สถานการณ์ อุปสรรค รากเหง้า คำแนะนำ ผลลัพธ์" },
]
const SHUFFLE_MS = 2200
const DEAL_MS = 520

export default function TarotTable({ userId, topic, initial, useTarot, onUseTarot, onDraw, onCombine, onClose, busy }: {
  userId: string; topic: string; initial: TarotDraw | null; useTarot: boolean
  onUseTarot: (v: boolean) => void; onDraw: (d: TarotDraw) => void; onCombine: (d: TarotDraw) => void; onClose: () => void; busy: boolean
}) {
  const [spread, setSpread] = useState<SpreadId>(initial?.spread ?? "three")
  const [question, setQuestion] = useState(initial?.question ?? "")
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle")
  const [draw, setDraw] = useState<TarotDraw | null>(initial)
  const [flipped, setFlipped] = useState<boolean[]>(initial ? initial.cards.map(() => true) : [])
  const [err, setErr] = useState("")
  const timers = useRef<number[]>([])
  const sparks = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ left: `${(i * 37) % 100}%`, top: `${(i * 53 + 11) % 100}%`, delay: `${(i % 9) * 0.7}s`, dur: `${5 + (i % 5)}s`, size: 2 + (i % 3) })), [])
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }; addEventListener("keydown", k); return () => removeEventListener("keydown", k) }, [onClose])

  const n = SPREADS.find(s => s.id === spread)!.n

  async function shuffleAndDeal() {
    setErr(""); setDraw(null); setFlipped([])
    setPhase("shuffling")
    const t0 = Date.now()
    try {
      const d = await api.tarotDraw(userId, spread, question)
      const wait = reduced ? 0 : Math.max(0, SHUFFLE_MS - (Date.now() - t0))
      timers.current.push(window.setTimeout(() => {
        setDraw(d); onDraw(d); setFlipped(d.cards.map(() => false)); setPhase("dealing")
        timers.current.push(window.setTimeout(() => setPhase("ready"), reduced ? 0 : DEAL_MS + d.cards.length * 260))
      }, wait))
    } catch (e) { setErr((e as Error).message); setPhase("idle") }
  }

  function flip(i: number) {
    if (phase !== "ready" || !draw) return
    setFlipped(f => { const g = f.slice(); g[i] = true; if (g.every(Boolean)) timers.current.push(window.setTimeout(() => setPhase("done"), 900)); return g })
  }
  function flipAll() {
    if (!draw) return
    draw.cards.forEach((_, i) => timers.current.push(window.setTimeout(() => flip(i), i * 350)))
  }

  const dealing = phase === "dealing"
  const showCards = draw && (phase === "dealing" || phase === "ready" || phase === "done")
  return (
    <div className="tarot-overlay" role="dialog" aria-modal aria-label="โต๊ะไพ่ยิปซี">
      <div className="tarot-smoke a" /><div className="tarot-smoke b" /><div className="tarot-smoke c" />
      <div className="tarot-candle l" /><div className="tarot-candle r" />
      {sparks.map((s, i) => <span key={i} className="tarot-spark" style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.dur, width: s.size, height: s.size }} />)}
      <button className="tarot-close" onClick={onClose} aria-label="ปิดโต๊ะไพ่">✕</button>

      <div className="tarot-stage">
        <h2 className="tarot-title"><span className="tarot-glyph">☽</span> ไพ่ยิปซี <span className="tarot-glyph">☾</span></h2>
        <p className="tarot-sub">ตั้งจิตให้นิ่ง นึกถึงเรื่องที่อยากถาม แล้วสับไพ่</p>

        {(phase === "idle") && (
          <div className="tarot-controls">
            <input className="tarot-q" value={question} onChange={e => setQuestion(e.target.value)} placeholder={`คำถามของคุณ (ไม่บังคับ) เช่น เรื่อง${topic}ช่วงนี้จะเป็นอย่างไร`} maxLength={160} />
            <div className="tarot-spreads">
              {SPREADS.map(s => <button key={s.id} className={`tarot-pill ${spread === s.id ? "on" : ""}`} onClick={() => setSpread(s.id)} title={s.hint}>{s.name}</button>)}
            </div>
          </div>
        )}

        <div className="tarot-ring" aria-hidden>
          <svg viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 6" />
            <circle cx="200" cy="200" r="176" fill="none" stroke="currentColor" strokeWidth=".5" />
            {Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; const g = "☉☽★✦⚚♥⚔⛤∞⚖☸♆"[i % 12]; return <text key={i} x={200 + Math.cos(a) * 183} y={200 + Math.sin(a) * 183} fontSize="11" textAnchor="middle" dominantBaseline="central" fill="currentColor" transform={`rotate(${(i / 36) * 360 + 90} ${200 + Math.cos(a) * 183} ${200 + Math.sin(a) * 183})`}>{g}</text> })}
            <polygon points="200,40 338,290 62,290" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".55" />
            <polygon points="200,360 62,110 338,110" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".55" />
            <circle cx="200" cy="200" r="60" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".6" />
          </svg>
        </div>

        <div className={`tarot-table spread-${spread} ${phase}`}>
          {(phase === "idle" || phase === "shuffling") && (
            <div className={`tarot-deck ${phase === "shuffling" ? "shuffling" : ""}`} onClick={phase === "idle" ? shuffleAndDeal : undefined} role="button" aria-label="สับไพ่">
              {Array.from({ length: 7 }, (_, i) => <div key={i} className="tarot-deck-card" style={{ ["--i" as string]: i }}><TarotCardView flipped={false} /></div>)}
            </div>
          )}
          {showCards && draw!.cards.map((c, i) => (
            <div key={c.id + i} className={`tarot-slot pos-${i}`} style={{ ["--i" as string]: i }}>
              <TarotCardView card={c} flipped={flipped[i]} onFlip={() => flip(i)} className={dealing ? "dealing" : ""} />
              <div className={`tarot-pos ${flipped[i] ? "show" : ""}`}>{c.position}</div>
            </div>
          ))}
        </div>

        <div className="tarot-actions">
          {phase === "idle" && <button className="tarot-btn gold" onClick={shuffleAndDeal}>สับไพ่ {n} ใบ</button>}
          {phase === "shuffling" && <div className="tarot-status">กำลังสับไพ่…</div>}
          {phase === "dealing" && <div className="tarot-status">กำลังวางไพ่…</div>}
          {phase === "ready" && <><div className="tarot-status">แตะไพ่ทีละใบเพื่อเปิด</div><button className="tarot-btn" onClick={flipAll}>เปิดทั้งหมด</button></>}
          {phase === "done" && draw && (
            <>
              <ul className="tarot-meanings">
                {draw.cards.map((c, i) => <li key={i} style={{ animationDelay: `${i * 0.15}s` }}><b>{c.position}</b> — {c.nameThai} <span className={`tarot-tag ${c.reversed ? "rev" : ""}`}>{c.reversed ? "กลับหัว" : "หัวตั้ง"}</span><br /><span className="tarot-m">{c.meaning}</span></li>)}
              </ul>
              <label className="tarot-opt"><input type="checkbox" checked={useTarot} onChange={e => onUseTarot(e.target.checked)} /> ให้หมอใช้ไพ่ชุดนี้ร่วมกับคำทำนายหลัก (ดวงไทย · สากล · จีน)</label>
              <div className="tarot-row">
                <button className="tarot-btn gold" disabled={busy} onClick={() => { onUseTarot(true); onCombine(draw) }}>ให้หมอทำนายรวมกับดวง</button>
                <button className="tarot-btn" onClick={() => { setPhase("idle") }}>สับใหม่</button>
                <button className="tarot-btn ghost" onClick={onClose}>ปิด</button>
              </div>
            </>
          )}
          {err && <p className="tarot-err">{err}</p>}
        </div>
      </div>
    </div>
  )
}
