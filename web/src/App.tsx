import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { api } from "./api"
import type { BirthForm, ChartResult, TarotDraw } from "./api"
import TarotTable from "./TarotTable"
import { TarotCardView } from "./TarotCardArt"
import RasiChart from "./RasiChart"
import SevenNineTable from "./SevenNineTable"
import WesternCard from "./WesternCard"
import ChineseCard from "./ChineseCard"

type Msg = { role: "user" | "assistant" | "system"; content: string }

const TAKSA_LABEL: Record<string, string> = { boriwan: "บริวาร", ayu: "อายุ", det: "เดช", si: "ศรี", mula: "มูละ", utsaha: "อุตสาหะ", montri: "มนตรี", kalakini: "กาลกิณี" }
const ACTIVITY: [RegExp, string][] = [[/compute_chart|seven_nine/, "กำลังผูกดวง"], [/recall_user/, "กำลังนึกถึงคุณ"], [/remember_user/, "กำลังจดจำข้อมูล"], [/log_reading|log_feedback/, "กำลังบันทึก"], [/draw_tarot/, "กำลังสับไพ่ยิปซี"], [/No tool_calls|returning text/, "กำลังเขียนคำทำนาย"]]
const TOPICS = ["การงาน", "การเงิน", "ความรัก", "สุขภาพ", "ครอบครัว", "การเรียน", "ดวงรวมปีนี้"]
const LS = { user: "mordoo.userId", session: "mordoo.sessionId", form: "mordoo.form", useTarot: "mordoo.useTarot" }

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
  const [tarot, setTarot] = useState<TarotDraw | null>(null)
  const [tableOpen, setTableOpen] = useState(() => typeof location !== "undefined" && /^#tarot/.test(location.hash))
  const [sideOpen, setSideOpen] = useState(false)
  const [useTarot, setUseTarotState] = useState<boolean>(() => { try { return localStorage.getItem(LS.useTarot) !== "0" } catch { return true } })
  const pane = useRef<HTMLDivElement>(null)
  const setUseTarot = (v: boolean) => { setUseTarotState(v); try { localStorage.setItem(LS.useTarot, v ? "1" : "0") } catch {} }

  useEffect(() => { api.provinces().then(r => setProvinces(r.provinces)).catch(() => {}) }, [])
  // #tarot-demo opens the table with a sample spread already dealt (not stored to memory); used for previews.
  useEffect(() => { if (location.hash === "#tarot-demo") api.tarotDraw("", "three", "ตัวอย่าง").then(setTarot).catch(() => {}) }, [])
  useEffect(() => { api.health().then(r => setHarness(r.harness)).catch(() => setHarness("backend unreachable")) }, [])
  useEffect(() => {
    api.user(userId).then(r => {
      setKnown(r.known ? r.digest ?? "" : null)
      // Cards the model drew in chat (draw_tarot) land in memory; show them on the page too.
      const last = r.memory?.tarot?.at(-1)
      if (last && Date.now() - Date.parse(last.date) < 24 * 3600_000) setTarot(t => (t?.id === last.id ? t : last))
    }).catch(() => {})
  }, [userId, busy])
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
      const r = await api.send(sid, userId, text, useTarot)
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

  function combineTarot(d: TarotDraw) {
    setTableOpen(false)
    const q = d.question ? `คำถามคือ "${d.question}" ` : ""
    send(`หมอช่วยอ่านไพ่ยิปซีที่เพิ่งเปิด (${d.spreadName}) ${q}ประกอบกับดวงเรื่อง${form.topic}ให้หน่อยครับ/ค่ะ`)
  }

  function newChat() {
    setSessionId(null); setMsgs([])
    try { localStorage.removeItem(LS.session) } catch {}
  }

  async function newUser() {
    if (busy) return
    try { await api.forget(userId) } catch {}
    try { localStorage.removeItem(LS.user); localStorage.removeItem(LS.session); localStorage.removeItem(LS.form) } catch {}
    setSessionId(null); setMsgs([]); setChart(null); setKnown(null); setConfirmReset(false); setTarot(null)
    setForm(savedForm()); setUserId(uid())
  }

  const s = chart?.summary
  return (
    <div className="app">
      <div className="layout">
        <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
          <div className="sb-top">
            <div className="brand"><span className="brand-mark">☽</span> MorDoo</div>
            <button className="icon-btn" onClick={() => setSideOpen(false)} aria-label="ปิดแผง">✕</button>
          </div>
          <button className="sb-new" onClick={newChat} disabled={busy}><span>＋</span> แชตใหม่</button>
          <div className="sb-scroll">
          <div className="panel">
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
            <button className="btn primary" onClick={computeAndStart} disabled={busy}>ผูกดวงและเริ่มคุย</button>
            {chartErr && <p className="error">{chartErr}</p>}
            {known !== null && <details style={{ marginTop: 10 }}><summary>หมอจำคุณได้</summary><pre className="summary">{known}</pre></details>}
          </div>
          <div className="panel tarot-side">
            <h3>ไพ่ยิปซี <span className="muted small">(ตัวเลือกเสริม)</span></h3>
            {tarot ? (
              <>
                <p className="muted small">{tarot.spreadName}{tarot.question ? ` · "${tarot.question}"` : ""} · {new Date(tarot.date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</p>
                <div className="tarot-mini">{tarot.cards.map((c, i) => <TarotCardView key={i} card={c} flipped small />)}</div>
                <ul className="planet-list">{tarot.cards.map((c, i) => <li key={i}><b>{c.position}</b> {c.nameThai}{c.reversed ? " (กลับหัว)" : ""}</li>)}</ul>
              </>
            ) : <p className="muted small">สับไพ่ 1, 3 หรือ 5 ใบ แล้วให้หมออ่านร่วมกับดวงไทย สากล และจีน</p>}
            <label className="tarot-opt-side"><input type="checkbox" checked={useTarot} onChange={e => setUseTarot(e.target.checked)} /> ใช้ไพ่ร่วมกับคำทำนายหลัก</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => setTableOpen(true)} disabled={busy}>{tarot ? "เปิดโต๊ะไพ่อีกครั้ง" : "เปิดโต๊ะไพ่"}</button>
              {tarot && <button className="btn ghost" onClick={() => combineTarot(tarot)} disabled={busy}>ให้หมอทำนายรวมกับดวง</button>}
            </div>
          </div>
          {s && (
            <div className="panel">
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
          </div>
          <div className="sb-foot">
            {confirmReset
              ? <div className="sb-row"><button className="btn danger" onClick={newUser} disabled={busy}>ยืนยันลบทั้งหมด</button><button className="btn ghost" onClick={() => setConfirmReset(false)}>ยกเลิก</button></div>
              : <button className="btn ghost" onClick={() => setConfirmReset(true)} disabled={busy} title="ลบประวัติแชตและความจำของผู้ใช้นี้ แล้วเริ่มเป็นผู้ใช้ใหม่">ผู้ใช้ใหม่ · ลบข้อมูล</button>}
            <div className="sb-status"><span className={`dot ${harness === "ok" ? "ok" : ""}`} /> {harness === "ok" ? "เชื่อมต่อหมอแล้ว" : `หมอยังไม่พร้อม (${harness || "…"})`}</div>
          </div>
        </aside>
        {sideOpen && <div className="scrim" onClick={() => setSideOpen(false)} />}
        <main className="main">
          <header className="top">
            <div className="top-left">
              <button className="icon-btn menu" onClick={() => setSideOpen(o => !o)} aria-label="เปิดแผงข้อมูล">☰</button>
              <div className="model-pill">หมอมะลิ <span className="muted">· โหราศาสตร์ไทย สากล จีน ไพ่ยิปซี</span></div>
            </div>
            <div className="top-right"><button className="btn ghost small" onClick={newChat} disabled={busy}>แชตใหม่</button></div>
          </header>
          <div className="chat">
          <div className="messages" ref={pane}>
            <div className="thread">
              {msgs.length === 0 && (
                <div className="empty">
                                    <h2>สวัสดีค่ะ{form.name ? ` คุณ${form.name}` : ""} วันนี้อยากให้หมอดูเรื่องอะไรดี</h2>
                  <p className="muted">กรอกวันเกิดในแผงด้านข้าง แล้วกด "ผูกดวงและเริ่มคุย" หรือเลือกคำถามด้านล่าง</p>
                  <div className="suggest">
                    {["ดูดวงการงานปีนี้", "ความรักช่วงนี้เป็นอย่างไร", "การเงินครึ่งปีหลัง", "เปิดไพ่ยิปซี 3 ใบให้หน่อย"].map(t => <button key={t} className="suggest-chip" onClick={() => send(t)} disabled={busy}>{t}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => m.role === "assistant"
                ? <div key={i} className="row assistant"><div className="bubble assistant"><ReactMarkdown>{m.content}</ReactMarkdown></div></div>
                : m.role === "user"
                  ? <div key={i} className="row user"><div className="bubble user">{m.content}</div></div>
                  : <div key={i} className="row system"><div className="bubble system">{m.content}</div></div>)}
              {busy && <div className="row assistant"><div className="typing"><span className="dots"><i /><i /><i /></span>{ACTIVITY.find(([re]) => re.test(activity))?.[1] ?? "หมอกำลังดูดวง"}</div></div>}
            </div>
          </div>
          <form className="composer" onSubmit={e => { e.preventDefault(); send(input) }}>
            <div className="composer-box">
              <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px" }} placeholder="ถามอะไรก็ได้" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); (e.target as HTMLTextAreaElement).style.height = "auto" } }} />
              <button className="send" disabled={busy || !input.trim()} aria-label="ส่ง">↑</button>
            </div>
            <p className="disclaimer">คำทำนายเป็นแนวทางเพื่อการตัดสินใจ ไม่ใช่คำรับประกัน</p>
          </form>
          </div>
        </main>
      </div>
      {tableOpen && <TarotTable key={tarot?.id ?? "none"} userId={userId} topic={form.topic} initial={tarot} useTarot={useTarot} onUseTarot={setUseTarot} onDraw={setTarot} onCombine={combineTarot} onClose={() => setTableOpen(false)} busy={busy} />}
    </div>
  )
}
