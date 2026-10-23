/** ราศีจักร wheel: เมษ at the top, signs counter-clockwise (same geometry as the thai-astrology README chart). */
const SIGNS = ["เมษ", "พฤษภ", "เมถุน", "กรกฎ", "สิงห์", "กันย์", "ตุลย์", "พิจิก", "ธนู", "มังกร", "กุมภ์", "มีน"]
const C = { x: 480, y: 490 }
const R = 326
const HALF = 59
const POINTS: [number, number][] = [
  [480, 292], [365, 300], [292, 370], [270, 490],
  [292, 610], [354, 676], [480, 682], [606, 676],
  [668, 610], [685, 490], [668, 370], [593, 300],
]

function divisions(): JSX.Element[] {
  const out: JSX.Element[] = []
  const chord = Math.sqrt(R * R - HALF * HALF)
  let k = 0
  for (const off of [-HALF, HALF]) {
    out.push(<line key={k++} x1={C.x + off} y1={C.y - chord} x2={C.x + off} y2={C.y + chord} />)
    out.push(<line key={k++} x1={C.x - chord} y1={C.y + off} x2={C.x + chord} y2={C.y + off} />)
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    out.push(<line key={k++} x1={C.x + x * HALF} y1={C.y + y * HALF} x2={C.x + (x * R) / Math.SQRT2} y2={C.y + (y * R) / Math.SQRT2} />)
  }
  return out
}

function PlanetText({ channel, x, y }: { channel: string; x: number; y: number }) {
  const parts: JSX.Element[] = []
  let rest = channel
  let i = 0
  while (rest.length) {
    if (rest.startsWith("ลั")) { parts.push(<tspan key={i++} fill="#c0392b">ลั</tspan>); rest = rest.slice(2); continue }
    if (rest.startsWith("*")) { parts.push(<tspan key={i++} fill="#c0392b" fontSize="22">*</tspan>); rest = rest.slice(1); continue }
    parts.push(<tspan key={i++}>{rest[0]}</tspan>); rest = rest.slice(1)
  }
  return <text className="planet" x={x} y={y}>{parts}</text>
}

export default function RasiChart({ channels, centerLabel }: { channels: string[]; centerLabel?: string }) {
  return (
    <svg viewBox="140 150 680 680" className="rasi" role="img" aria-label="ราศีจักร">
      <circle cx={C.x} cy={C.y} r={R} className="rim" />
      <g className="div">{divisions()}</g>
      <circle cx={C.x} cy={C.y} r={285} className="inner" />
      <circle cx={C.x} cy={C.y} r={279} className="inner thin" />
      {SIGNS.map((s, i) => {
        const angle = -90 - i * 30
        const rad = (angle * Math.PI) / 180
        const x = C.x + 305 * Math.cos(rad)
        const y = C.y + 305 * Math.sin(rad)
        let rot = angle + 90
        while (rot < -90) rot += 180
        while (rot > 90) rot -= 180
        if (i === 9) rot += 180
        return <text key={s} className="sign" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`}>{s}</text>
      })}
      {channels.map((ch, i) => (ch ? <PlanetText key={i} channel={ch} x={POINTS[i][0]} y={POINTS[i][1]} /> : null))}
      {centerLabel && <text className="center" x={C.x} y={C.y}>{centerLabel}</text>}
    </svg>
  )
}
