import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { api } from "./api"
import type { BirthForm, ChartResult } from "./api"
import RasiChart from "./RasiChart"
import SevenNineTable from "./SevenNineTable"
import WesternCard from "./WesternCard"
import ChineseCard from "./ChineseCard"

type Msg = { role: "user" | "assistant" | "system"; content: string }

const TAKSA_LABEL: Record<string, string> = { boriwan: "บริวาร", ayu: "อายุ", det: "เดช", si: "ศรี", mula: "มูละ", utsaha: "อุตสาหะ", montri: "มนตรี", kalakini: "กาลกิณี" }
const ACTIVITY: [RegExp, string][] = [[/compute_chart|seven_nine/, "กำลังผูกดวง"], [/recall_user/, "กำลังนึกถึงคุณ"], [/remember_user/, "กำลังจดจำข้อมูล"], [/log_reading|log_feedback/, "กำลังบันทึก"], [/No tool_calls|returning text/, "กำลังเขียนคำทำนาย"]]
const TOPICS = ["การงาน", "การเงิน", "ความรัก", "สุขภาพ", "ครอบครัว", "การเรียน", "ดวงรวมปีนี้"]
const LS = { user: "mordoo.userId", session: "mordoo.sessionId", form: "mordoo.form" }

function uid(): string {
  try { const v = localStorage.getItem(LS.user); if (v) return v } catch {}
  const id = "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  try { localStorage.setItem(LS.user, id) } catch {}
  return id
}
function savedForm(): BirthForm {
  const d: BirthForm = { name: "", day: 1, month: 1, year: 2535, era: "BE", timeKnown: true, hour: 12, minute: 0, province: "กรุงเทพมหานคร", topic: "การงาน", gender: "" }
  try { const raw = localStorage.getItem(LS.form); if (raw) return { ...d, ...JSON.parse(raw) } } catch {}
  return d
}

export default function App() {
  const [userId, setUserId] = useState(uid)
  const [confirmReset, setConfirmReset] = useState(false)
  const [provinces, setProvinces] = useState<string[]>([])
  const [form, setForm] = useState<BirthForm>(savedForm)
  const [chart, setChart] = useState<ChartResult | null>(null)
  const [chartErr, setChartErr] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(() => { try { return localStorage.getItem(LS.session) } catch { return null } })
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [activity, setActivity] = useState("")
  const [harness, setHarness] = useState("")
  const [known, setKnown] = useState<string | null>(null)
  const pane = useRef<HTMLDivElement>(null)

  useEffect(() => { api.provinces().then(r => setProvinces(r.provinces)).catch(() => {}) }, [])
  useEffect(() => { api.health().then(r => setHarness(r.harness)).catch(() => setHarness("backend unreachable")) }, [])
  useEffect(() => { api.user(userId).then(r => setKnown(r.known ? r.digest ?? "" : null)).catch(() => {}) }, [userId, busy])
  useEffect(() => {
    if (!sessionId) return
    api.history(sessionId).then(r => setMsgs(r.messages.filter(m => m.role === "user" || m.role === "assistant") as Msg[])).catch(() => { setSessionId(null); try { localStorage.removeItem(LS.session) } catch {} })
  }, [sessionId])
  useEffect(() => { const el = pane.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }) }, [msgs, busy])
  useEffect(() => {
    if (!busy || !sessionId) return
    const t = setInterval(() => api.status(sessionId).then(r => setActivity(r.tail.at(-1) ?? "")).catch(() => {}), 1500)
    return () => clearInterval(t)
  }, [busy, sessionId])

  const set = <K extends keyof BirthForm>(k: K, v: BirthForm[K]) => setForm(f => ({ ...f, [k]: v }))

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId
    const r = await api.start(userId)
    setSessionId(r.sessionId)
    try { localStorage.setItem(LS.session, r.sessionId) } catch {}
    return r.sessionId
  }

  async function send(text: string) {
    if (!text.trim() || busy) return
    setMsgs(m => [...m, { role: "user", content: text }])
    setInput("")
    setBusy(true); setActivity("")
    try {
      const sid = await ensureSession()
      const r = await api.send(sid, userId, text)
      setMsgs(m => [...m, { role: "assistant", content: r.reply }])
    } catch (e) {
      setMsgs(m => [...m, { role: "system", content: `เกิดข้อผิดพลาด: ${(e as Error).message}` }])
    } finally { setBusy(false); setActivity("") }
  }

  async function computeAndStart() {
    setChartErr("")
    try { localStorage.setItem(LS.form, JSON.stringify(form)) } catch {}
    try {
      const r = await api.chart(form)
      setChart(r)
      await api.remember(userId, form)
      await send(`${form.name ? `ผมชื่อ ${form.name} ` : ""}อยากดูเรื่อง${form.topic}ครับ/ค่ะ`)
    } catch (e) { setChartErr((e as Error).message) }
  }

  function newChat() {
    setSessionId(null); setMsgs([])
    try { localStorage.removeItem(LS.session) } catch {}
  }

  async function newUser() {
    if (busy) return
    try { await api.forget(userId) } catch {}
    try { localStorage.removeItem(LS.user); localStorage.removeItem(LS.session); localStorage.removeItem(LS.form) } catch {}
    setSessionId(null); setMsgs([]); setChart(null); setKnown(null); setConfirmReset(false)
    setForm(savedForm()); setUserId(uid())
  }

  const s = chart?.summary
  return (
    <div className="app">
      <header className="top">
        <div><h1>MorDoo หมอดู AI โหราศาสตร์ไทย</h1><div className="status">สุริยยาตร์ · ลัคนา · ทักษา · เลข 7 ตัว 9 ฐาน · {harness === "ok" ? "เชื่อมต่อหมอแล้ว" : `หมอยังไม่พร้อม (${harness || "…"})`}</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn secondary" onClick={newChat} disabled={busy}>เริ่มบทสนทนาใหม่</button>
          {confirmReset
            ? <><button className="btn" onClick={newUser} disabled={busy}>ยืนยันลบทั้งหมด</button><button className="btn secondary" onClick={() => setConfirmReset(false)}>ยกเลิก</button></>
            : <button className="btn secondary" onClick={() => setConfirmReset(true)} disabled={busy} title="ลบประวัติแชตและความจำของผู้ใช้นี้ แล้วเริ่มเป็นผู้ใช้ใหม่">ผู้ใช้ใหม่</button>}
        </div>
      </header>
      <div className="layout">
        <main className="card chat">
          <div className="messages" ref={pane}>
            {msgs.length === 0 && <div className="msg system">กรอกวันเกิดทางขวา (หรือด้านบนบนมือถือ) แล้วกด "ผูกดวงและเริ่มคุย" หรือพิมพ์ทักทายหมอได้เลย</div>}
            {msgs.map((m, i) => m.role === "assistant" ? <div key={i} className="msg assistant"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
            {busy && <div className="typing">{ACTIVITY.find(([re]) => re.test(activity))?.[1] ?? "หมอกำลังดูดวง"}…</div>}
          </div>
          <form className="composer" onSubmit={e => { e.preventDefault(); send(input) }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="พิมพ์ข้อความถึงหมอ…" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }} />
            <button className="btn" disabled={busy || !input.trim()}>ส่ง</button>
          </form>
        </main>
        <aside className="side">
          <div className="card">
            <h3>ข้อมูลเกิด</h3>
            <div className="row">
              <div style={{ gridColumn: "1 / 3" }}><label>ชื่อหรือชื่อเล่น</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="เช่น มะลิ" /></div>
              <div><label>เพศ</label><select value={form.gender} onChange={e => set("gender", e.target.value as "male" | "female" | "")}><option value="">ไม่ระบุ</option><option value="male">ชาย</option><option value="female">หญิง</option></select></div>
            </div>
            <div className="row">
              <div><label>วัน</label><input type="number" min={1} max={31} value={form.day} onChange={e => set("day", +e.target.value)} /></div>
              <div><label>เดือน</label><input type="number" min={1} max={12} value={form.month} onChange={e => set("month", +e.target.value)} /></div>
              <div><label>ปี</label><input type="number" value={form.year} onChange={e => set("year", +e.target.value)} /></div>
              <div><label>ศักราช</label><select value={form.era} onChange={e => set("era", e.target.value as "BE" | "CE")}><option value="BE">พ.ศ.</option><option value="CE">ค.ศ.</option></select></div>
            </div>
            <div className="row">
              <div><label>เวลาเกิด</label><select value={form.timeKnown ? "yes" : "no"} onChange={e => set("timeKnown", e.target.value === "yes")}><option value="yes">ทราบ</option><option value="no">ไม่ทราบ</option></select></div>
              {form.timeKnown && <><div><label>ชั่วโมง</label><input type="number" min={0} max={23} value={form.hour} onChange={e => set("hour", +e.target.value)} /></div><div><label>นาที</label><input type="number" min={0} max={59} value={form.minute} onChange={e => set("minute", +e.target.value)} /></div></>}
            </div>
            <div className="row">
              <div><label>จังหวัดที่เกิด</label><select value={form.province} onChange={e => set("province", e.target.value)}>{(provinces.length ? provinces : [form.province]).map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label>เรื่องที่อยากดู</label><select value={form.topic} onChange={e => set("topic", e.target.value)}>{TOPICS.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <button className="btn" onClick={computeAndStart} disabled={busy}>ผูกดวงและเริ่มคุย</button>
            {chartErr && <p className="error">{chartErr}</p>}
            {known !== null && <details style={{ marginTop: 10 }}><summary>หมอจำคุณได้</summary><pre className="summary">{known}</pre></details>}
          </div>
          {s && (
            <div className="card">
              <h3>ราศีจักร</h3>
              <p className="muted small">{s.birth.dayLabel} วัน{s.birth.weekdayAstro}{s.birth.lunar ? ` ${s.birth.lunar}` : ""} ปี{s.birth.naksat}</p>
              <RasiChart channels={s.rasiChannels} centerLabel={s.ascendant ? `ลั ${s.ascendant.sign}` : "ไม่ใช้ลัคนา"} />
              {s.ascendant && <p className="small">ลัคนาราศี{s.ascendant.sign} {s.ascendant.degrees}°{s.ascendant.minutes}′ · ตนุลัคน์ {s.ascendant.ruler} (ภพ {s.ascendant.rulerHouse}) · ตนุเศษ {s.ascendant.tanuseth}</p>}
              <div className="chips">{Object.entries(s.taksa).map(([k, v]) => <span key={k} className={`chip ${k === "kalakini" ? "bad" : ""}`}>{TAKSA_LABEL[k]} {v}</span>)}</div>
              <ul className="planet-list">{s.planets.map(p => <li key={p.name}>{p.name} ราศี{p.sign} {p.degrees}°{s.ascendant ? ` ภพ ${p.house} ${p.houseName}` : ""}{p.dignities.length ? ` [${p.dignities.join(", ")}]` : ""}</li>)}</ul>
              {s.notes.map((n, i) => <p key={i} className="muted small">{n}</p>)}
              <details><summary>ข้อมูลดวงฉบับเต็ม (ที่หมอใช้)</summary><pre className="summary">{chart!.summaryThai}</pre></details>
            </div>
          )}
          {s?.western && <WesternCard w={s.western} timeKnown={s.birth.timeKnown} />}
          {s?.chinese && <ChineseCard c={s.chinese} />}
          {s?.sevenNine && <SevenNineTable data={s.sevenNine} />}
        </aside>
      </div>
    </div>
  )
}
