import type { Chinese } from "./api"

export default function ChineseCard({ c }: { c: Chinese }) {
  return (
    <div className="card">
      <h3>ดวงจีน ปาจื้อ (八字)</h3>
      <div className="table-wrap">
        <table className="seven">
          <thead><tr>{c.pillars.map(p => <th key={p.name}>เสา{p.name}</th>)}</tr></thead>
          <tbody>
            <tr>{c.pillars.map(p => <td key={p.name} style={{ fontSize: 22 }}>{p.ganZhi}</td>)}</tr>
            <tr>{c.pillars.map(p => <td key={p.name}>{p.stemThai} {p.stemElement}<br /><span className="muted small">{p.godStem === "日主" ? "วันธาตุ" : p.godStemThai}</span></td>)}</tr>
            <tr>{c.pillars.map(p => <td key={p.name}>{p.animal}<br /><span className="muted small">{p.branchElement}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="small">วันธาตุ <b>{c.dayMaster.label}</b> กำลัง{c.support.strength} · {Object.entries(c.elements).map(([k, v]) => `${k} ${v}`).join(" · ")}{c.missing.length ? ` · ขาด ${c.missing.join(" ")}` : ""}</p>
      <div className="chips">{c.luck.pillars.map(p => <span key={p.startYear} className={`chip ${p.current ? "bad" : ""}`}>{p.startAge}–{p.startAge + 9} {p.ganZhi}</span>)}</div>
      <p className="muted small">ปีนี้ {c.currentYear.ganZhi} ปี{c.currentYear.animal}: {c.currentYear.relation}</p>
      {c.notes.map((n, i) => <p key={i} className="muted small">{n}</p>)}
    </div>
  )
}
