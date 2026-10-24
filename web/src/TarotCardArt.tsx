/**
 * Procedural tarot card art (no image assets). Both faces are SVG drawn from the
 * card definition: Major Arcana show their glyph and Roman numeral, pip cards
 * lay out n suit glyphs like a playing card, court cards show a chess glyph.
 * ViewBox is 200 × 340 (ratio 1 : 1.7, like a real Rider–Waite card).
 */
import { useState } from "react"
import type { TarotCard } from "./api"

/** Card artwork generated with Codex image generation (scripts/gen_tarot_art.sh → public/tarot/<id>.webp). */
const ART = (id: string) => `/tarot/${id}.webp`

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"]
const COURT: Record<number, string> = { 11: "♟", 12: "♞", 13: "♛", 14: "♚" }
const SUIT_COLOR: Record<string, string> = { wands: "#f2a33a", cups: "#6fc3ff", swords: "#d9dde8", pentacles: "#9be37a" }
/** pip positions in a 3 × 5 lattice (x ∈ -1..1, y ∈ -2..2) */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[0, -1.3], [0, 1.3]],
  3: [[0, -1.5], [0, 0], [0, 1.5]],
  4: [[-0.7, -1.2], [0.7, -1.2], [-0.7, 1.2], [0.7, 1.2]],
  5: [[-0.7, -1.2], [0.7, -1.2], [0, 0], [-0.7, 1.2], [0.7, 1.2]],
  6: [[-0.7, -1.5], [0.7, -1.5], [-0.7, 0], [0.7, 0], [-0.7, 1.5], [0.7, 1.5]],
  7: [[-0.7, -1.5], [0.7, -1.5], [0, -0.75], [-0.7, 0], [0.7, 0], [-0.7, 1.5], [0.7, 1.5]],
  8: [[-0.7, -1.6], [0.7, -1.6], [-0.7, -0.55], [0.7, -0.55], [-0.7, 0.55], [0.7, 0.55], [-0.7, 1.6], [0.7, 1.6]],
  9: [[-0.7, -1.6], [0.7, -1.6], [-0.7, -0.55], [0.7, -0.55], [0, 0], [-0.7, 0.55], [0.7, 0.55], [-0.7, 1.6], [0.7, 1.6]],
  10: [[-0.7, -1.7], [0.7, -1.7], [-0.7, -0.85], [0.7, -0.85], [-0.7, 0], [0.7, 0], [-0.7, 0.85], [0.7, 0.85], [-0.7, 1.7], [0.7, 1.7]],
}

function Frame({ accent }: { accent: string }) {
  return (
    <>
      <rect x="2" y="2" width="196" height="336" rx="14" fill="url(#tarot-paper)" stroke={accent} strokeWidth="2.5" />
      <rect x="10" y="10" width="180" height="320" rx="9" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.8" />
      <rect x="16" y="16" width="168" height="308" rx="6" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 3" />
      {[[22, 22, 1, 1], [178, 22, -1, 1], [22, 318, 1, -1], [178, 318, -1, -1]].map(([x, y, sx, sy], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} stroke={accent} fill="none" strokeWidth="1">
          <path d="M0 10 Q0 0 10 0" /><path d="M0 16 Q0 4 16 4" opacity=".6" /><circle cx="3" cy="3" r="1.3" fill={accent} stroke="none" />
        </g>
      ))}
    </>
  )
}

export function TarotFace({ card }: { card: TarotCard }) {
  const accent = "#d8b86a"
  const color = card.suit ? SUIT_COLOR[card.suit] : "#f3e3b2"
  const isMajor = card.arcana === "major"
  const topLabel = isMajor ? ROMAN[card.number] : card.number <= 10 ? String(card.number) : ["", "", "", "", "", "", "", "", "", "", "", "P", "Kn", "Q", "K"][card.number]
  return (
    <svg className="tcard-svg" viewBox="0 0 200 340" aria-label={`${card.nameThai} ${card.reversed ? "กลับหัว" : ""}`}>
      <defs>
        <radialGradient id="tarot-paper" cx="50%" cy="40%" r="75%"><stop offset="0" stopColor="#2a1f3f" /><stop offset="1" stopColor="#120c1c" /></radialGradient>
        <radialGradient id="tarot-halo" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={color} stopOpacity=".55" /><stop offset=".6" stopColor={color} stopOpacity=".12" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
      </defs>
      <Frame accent={accent} />
      <text x="100" y="42" textAnchor="middle" fill={accent} fontFamily="Noto Serif Thai, serif" fontSize="16" letterSpacing="2">{topLabel}</text>
      <line x1="55" y1="52" x2="145" y2="52" stroke={accent} strokeWidth=".6" opacity=".7" />
      {isMajor && (
        <g>
          <circle cx="100" cy="160" r="70" fill="url(#tarot-halo)" />
          <circle cx="100" cy="160" r="52" fill="none" stroke={accent} strokeWidth=".8" opacity=".6" />
          <circle cx="100" cy="160" r="60" fill="none" stroke={accent} strokeWidth=".4" opacity=".4" strokeDasharray="1 4" />
          {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={100 + Math.cos(a) * 60} cy={160 + Math.sin(a) * 60} r="1.2" fill={accent} opacity=".8" /> })}
          <text x="100" y="160" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="78" fontFamily="Noto Serif Thai, serif" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>{card.glyph}</text>
        </g>
      )}
      {!isMajor && card.number <= 10 && (
        <g>
          <circle cx="100" cy="160" r="72" fill="url(#tarot-halo)" />
          {PIPS[card.number].map(([px, py], i) => (
            <text key={i} x={100 + px * 46} y={160 + py * 46} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={card.number === 1 ? 70 : 30} fontFamily="Noto Serif Thai, serif" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>{card.glyph}</text>
          ))}
        </g>
      )}
      {!isMajor && card.number > 10 && (
        <g>
          <circle cx="100" cy="160" r="72" fill="url(#tarot-halo)" />
          <circle cx="100" cy="160" r="54" fill="none" stroke={color} strokeWidth=".8" opacity=".5" />
          <text x="100" y="150" textAnchor="middle" dominantBaseline="central" fill="#f3e3b2" fontSize="76" fontFamily="Noto Serif Thai, serif" style={{ filter: "drop-shadow(0 0 6px #f3e3b2)" }}>{COURT[card.number]}</text>
          <text x="100" y="214" textAnchor="middle" fill={color} fontSize="30" fontFamily="Noto Serif Thai, serif">{card.glyph}</text>
        </g>
      )}
      <line x1="55" y1="268" x2="145" y2="268" stroke={accent} strokeWidth=".6" opacity=".7" />
      <text x="100" y="294" textAnchor="middle" fill="#f6ecd2" fontFamily="Noto Serif Thai, serif" fontWeight="700" fontSize={card.nameThai.length > 10 ? 15 : 18}>{card.nameThai}</text>
      <text x="100" y="314" textAnchor="middle" fill={accent} fontFamily="Noto Serif Thai, serif" fontSize="10" letterSpacing="1" opacity=".9">{card.name.toUpperCase()}</text>
    </svg>
  )
}

export function TarotBack() {
  const accent = "#d8b86a"
  return (
    <svg className="tcard-svg" viewBox="0 0 200 340" aria-hidden>
      <defs>
        <radialGradient id="tarot-back" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#3a2458" /><stop offset="1" stopColor="#0d0914" /></radialGradient>
        <pattern id="tarot-lattice" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 7 H14 M7 0 V14" stroke={accent} strokeWidth=".35" opacity=".35" /></pattern>
      </defs>
      <rect x="2" y="2" width="196" height="336" rx="14" fill="url(#tarot-back)" stroke={accent} strokeWidth="2.5" />
      <rect x="10" y="10" width="180" height="320" rx="9" fill="url(#tarot-lattice)" stroke={accent} strokeWidth=".8" />
      <g transform="translate(100 170)">
        <circle r="78" fill="none" stroke={accent} strokeWidth=".8" opacity=".8" />
        <circle r="70" fill="none" stroke={accent} strokeWidth=".4" strokeDasharray="2 5" opacity=".8" />
        <circle r="46" fill="#0d0914" stroke={accent} strokeWidth="1" />
        {Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return <line key={i} x1={Math.cos(a) * 48} y1={Math.sin(a) * 48} x2={Math.cos(a) * (i % 2 ? 56 : 64)} y2={Math.sin(a) * (i % 2 ? 56 : 64)} stroke={accent} strokeWidth={i % 2 ? .5 : 1} opacity=".9" /> })}
        <path d="M-40 10 Q0 -38 40 10 Q0 38 -40 10 Z" fill="#1c1230" stroke={accent} strokeWidth="1.2" />
        <circle r="15" fill="#5b3a8a" stroke={accent} strokeWidth="1" />
        <circle r="7" fill="#0d0914" />
        <circle cx="-3" cy="-3" r="2.2" fill="#f6ecd2" />
        <path d="M-60 -62 L60 -62 L0 -150 Z" fill="none" stroke={accent} strokeWidth=".7" opacity=".45" />
        <path d="M-60 82 L60 82 L0 150 Z" fill="none" stroke={accent} strokeWidth=".7" opacity=".45" />
        {[[-62, -118], [62, -118], [-62, 118], [62, 118]].map(([x, y], i) => <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={accent} fontSize="16" opacity=".9">{["☽", "☉", "★", "✦"][i]}</text>)}
      </g>
      <text x="100" y="322" textAnchor="middle" fill={accent} fontSize="9" letterSpacing="3" fontFamily="Noto Serif Thai, serif" opacity=".9">MORDOO · ไพ่ยิปซี</text>
    </svg>
  )
}

function RankBadge({ card }: { card: TarotCard }) {
  const isMajor = card.arcana === "major"
  const label = isMajor ? ROMAN[card.number] : card.number <= 10 ? String(card.number) : ["", "", "", "", "", "", "", "", "", "", "", "P", "Kn", "Q", "K"][card.number]
  return <span className="tcard-badge">{label}{!isMajor && <span className="tcard-badge-suit">{card.glyph}</span>}</span>
}

/** Image face with a name band; falls back to the procedural SVG face if the artwork is missing. */
function ImageFace({ card }: { card: TarotCard }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <TarotFace card={card} />
  return (
    <div className="tcard-img">
      <img src={ART(card.id)} alt={`${card.nameThai}${card.reversed ? " กลับหัว" : ""}`} draggable={false} onError={() => setBroken(true)} />
      <RankBadge card={card} />
      <div className="tcard-name"><b>{card.nameThai}</b><small>{card.name}</small></div>
    </div>
  )
}

function ImageBack() {
  const [broken, setBroken] = useState(false)
  if (broken) return <TarotBack />
  return <div className="tcard-img"><img src={ART("back")} alt="" draggable={false} onError={() => setBroken(true)} /></div>
}

/** One physical card: 3-D flip between back and face; reversed cards show the face upside down. */
export function TarotCardView({ card, flipped, onFlip, small, style, className = "" }: { card?: TarotCard; flipped: boolean; onFlip?: () => void; small?: boolean; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`tcard ${small ? "small" : ""} ${flipped ? "flipped" : ""} ${card?.reversed ? "rev" : ""} ${onFlip && !flipped ? "clickable" : ""} ${className}`} style={style} onClick={onFlip} role={onFlip ? "button" : undefined} tabIndex={onFlip ? 0 : undefined} onKeyDown={e => { if (onFlip && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onFlip() } }}>
      <div className="tcard-inner">
        <div className="tcard-side back"><ImageBack /></div>
        <div className="tcard-side face">{card && <ImageFace card={card} />}</div>
      </div>
    </div>
  )
}
