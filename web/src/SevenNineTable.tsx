import type { SevenNine } from "./api"

export default function SevenNineTable({ data }: { data: SevenNine }) {
  return (
    <div className="card">
      <h3>เลข 7 ตัว 9 ฐาน</h3>
      <p className="muted">วัน{data.seeds.weekdayName} เดือน {data.seeds.lunarMonth} (จันทรคติ) ปี{data.seeds.naksat}</p>
      <div className="table-wrap">
        <table className="seven">
          <thead>
            <tr><th></th>{data.columns.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.bases.map((b, i) => (
              <tr key={b.name} className={i === 3 ? "main-row" : ""}>
                <th>{b.name}</th>
                {b.values.map((v, j) => <td key={j}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">อายุ {data.age.completed} ปี (ย่าง {data.age.yang}) ดาวจรประจำปี: {data.age.rowName} ช่อง{data.age.column} = {data.age.value} {data.age.planet}</p>
    </div>
  )
}
