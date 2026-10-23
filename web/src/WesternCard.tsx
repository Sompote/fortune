import type { Western } from "./api"

const SIGN_SYMBOL: Record<string, string> = { Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" }

export default function WesternCard({ w, timeKnown }: { w: Western; timeKnown: boolean }) {
  return (
    <div className="card">
      <h3>โหราศาสตร์สากล (Tropical)</h3>
      <div className="chips">
        <span className="chip">☉ Sun {SIGN_SYMBOL[w.sun.sign]} {w.sun.signThai}</span>
        <span className="chip">☽ Moon {SIGN_SYMBOL[w.moon.sign]} {w.moon.signThai}</span>
        {timeKnown && w.rising && <span className="chip">↑ Rising {SIGN_SYMBOL[w.rising.sign]} {w.rising.signThai}</span>}
      </div>
      <p className="muted small">ธาตุ: ไฟ {w.elements.fire} · ดิน {w.elements.earth} · ลม {w.elements.air} · น้ำ {w.elements.water}</p>
      <ul className="planet-list">
        {w.planets.map(p => <li key={p.key}>{p.label} {SIGN_SYMBOL[p.sign]} {p.signThai} {p.degrees}°{timeKnown ? ` เรือน ${p.house}` : ""}{p.retrograde ? " ℞" : ""}</li>)}
      </ul>
      {w.aspects.length > 0 && (
        <details>
          <summary>มุมสัมพันธ์เด่น ({w.aspects.length})</summary>
          <ul className="planet-list">{w.aspects.map((a, i) => <li key={i}>{a.p1} {a.typeThai} {a.p2} (orb {a.orb}°)</li>)}</ul>
        </details>
      )}
      <p className="muted small">ราศีสากลต่างจากไทยประมาณ 24° (tropical กับ sidereal) ดาวดวงเดียวกันจึงอาจอยู่คนละราศี</p>
    </div>
  )
}
