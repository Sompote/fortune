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
  const [showPanel, setShowPanel] = useState(false)
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
      // Birth data the doctor remembered (e.g. given in chat on this device) → fill the form and draw the chart
      const m = r.memory, b = m?.birth
      if (!b || chart) return
      const f: BirthForm = { ...form, name: m.nickname || m.name || form.name, gender: m.gender === "male" || m.gender === "female" ? m.gender : form.gender, year: b.year, era: b.era, month: b.month, day: b.day, timeKnown: b.timeKnown, hour: b.hour ?? form.hour, minute: b.minute ?? form.minute, province: b.province || form.province }
      setForm(f)
      try { localStorage.setItem(LS.form, JSON.stringify(f)) } catch {}
      api.chart(f).then(setChart).catch(() => {})
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
      setSideOpen(false)
      if (window.matchMedia("(min-width: 901px)").matches) setShowPanel(true)
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
  const panelOpen = showPanel && !!s
  const ready = harness === "ok"
  return (
    <div className={`app${panelOpen ? " with-panel" : ""}${sideOpen ? " side-open" : ""}`}>
      <div className="scrim" onClick={() => { setSideOpen(false); setShowPanel(false) }} />
      <aside className="sidebar">
        <div className="brand"><b>MorDoo</b><button className="icon-btn menu-btn" onClick={() => setSideOpen(false)} aria-label="ปิดเมนู"><Icon d={I.x} /></button></div>
        <button className="nav-btn" onClick={() => { newChat(); setSideOpen(false) }} disabled={busy}><Icon d={I.plus} />แชตใหม่</button>
        <div className="side-scroll">
          <div className="side-title">ข้อมูลเกิด</div>
          <div className="row">
            <div style={{ gridColumn: "1 / 3" }}><label>ชื่อหรือชื่อเล่น</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="เช่น มะลิ" /></div>
            <div><label>เพศ</label><select value={form.gender} onChange={e => set("gender", e.target.value as "male" | "female" | "")}><option value="">ไม่ระบุ</option><option value="male">ชาย</option><option value="female">หญิง</option></select></div>
          </div>
          <div className="row">
            <div><label>วัน</label><input type="number" min={1} max={31} value={form.day} onChange={e => set("day", +e.target.value)} /></div>
            <div><label>เดือน</label><input type="number" min={1} max={12} value={form.month} onChange={e => set("month", +e.target.value)} /></div>
            <div><label>ศักราช</label><select value={form.era} onChange={e => set("era", e.target.value as "BE" | "CE")}><option value="BE">พ.ศ.</option><option value="CE">ค.ศ.</option></select></div>
          </div>
          <div className="row">
            <div><label>ปี</label><input type="number" value={form.year} onChange={e => set("year", +e.target.value)} /></div>
            <div><label>เวลาเกิด</label><select value={form.timeKnown ? "yes" : "no"} onChange={e => set("timeKnown", e.target.value === "yes")}><option value="yes">ทราบ</option><option value="no">ไม่ทราบ</option></select></div>
          </div>
          {form.timeKnown && <div className="row">
            <div><label>ชั่วโมง</label><input type="number" min={0} max={23} value={form.hour} onChange={e => set("hour", +e.target.value)} /></div>
            <div><label>นาที</label><input type="number" min={0} max={59} value={form.minute} onChange={e => set("minute", +e.target.value)} /></div>
          </div>}
          <div className="row"><div><label>จังหวัดที่เกิด</label><select value={form.province} onChange={e => set("province", e.target.value)}>{(provinces.length ? provinces : [form.province]).map(p => <option key={p}>{p}</option>)}</select></div></div>
          <div className="row"><div><label>เรื่องที่อยากดู</label><select value={form.topic} onChange={e => set("topic", e.target.value)}>{TOPICS.map(t => <option key={t}>{t}</option>)}</select></div></div>
          <button className="btn block" onClick={computeAndStart} disabled={busy}>ผูกดวงและเริ่มคุย</button>
          {chartErr && <p className="error">{chartErr}</p>}
          {known !== null && <details style={{ marginTop: 12 }}><summary>หมอจำคุณได้</summary><pre className="summary">{known}</pre></details>}
          <div className="side-title">ไพ่ยิปซี (ตัวเลือกเสริม)</div>
          <div className="tarot-side">
            {tarot ? (
              <>
                <p className="muted small">{tarot.spreadName}{tarot.question ? ` · "${tarot.question}"` : ""} · {new Date(tarot.date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</p>
                <div className="tarot-mini">{tarot.cards.map((c, i) => <TarotCardView key={i} card={c} flipped small />)}</div>
                <ul className="planet-list">{tarot.cards.map((c, i) => <li key={i}><b>{c.position}</b> {c.nameThai}{c.reversed ? " (กลับหัว)" : ""}</li>)}</ul>
              </>
            ) : <p className="muted small">สับไพ่ 1, 3 หรือ 5 ใบ แล้วให้หมออ่านร่วมกับดวงไทย สากล และจีน</p>}
            <label className="tarot-opt-side"><input type="checkbox" checked={useTarot} onChange={e => setUseTarot(e.target.checked)} /> ใช้ไพ่ร่วมกับคำทำนายหลัก</label>
            <div className="tarot-actions-side">
              <button className="btn" onClick={() => { setTableOpen(true); setSideOpen(false) }} disabled={busy}>{tarot ? "เปิดโต๊ะไพ่อีกครั้ง" : "เปิดโต๊ะไพ่"}</button>
              {tarot && <button className="btn ghost" onClick={() => { setSideOpen(false); combineTarot(tarot) }} disabled={busy}>ให้หมอทำนายรวมกับดวง</button>}
            </div>
          </div>
        </div>
        <div className="side-foot">
          {confirmReset
            ? <><button className="nav-btn danger" onClick={newUser} disabled={busy}><Icon d={I.trash} />ยืนยันลบทั้งหมด</button><button className="nav-btn" onClick={() => setConfirmReset(false)}><Icon d={I.x} />ยกเลิก</button></>
            : <button className="nav-btn" onClick={() => setConfirmReset(true)} disabled={busy} title="ลบประวัติแชตและความจำของผู้ใช้นี้ แล้วเริ่มเป็นผู้ใช้ใหม่"><Icon d={I.user} />ผู้ใช้ใหม่</button>}
          <div className="status"><span className={`dot${ready ? " ok" : ""}`} />{ready ? "หมอพร้อมแล้ว" : `หมอยังไม่พร้อม (${harness || "…"})`}</div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="left">
            <button className="icon-btn menu-btn" onClick={() => setSideOpen(true)} aria-label="เมนู"><Icon d={I.menu} /></button>
            <span className="title">MorDoo หมอดู AI</span>
          </div>
          <button className={`icon-btn${panelOpen ? " on" : ""}`} onClick={() => s ? setShowPanel(v => !v) : setSideOpen(true)} title="ดวงของฉัน" aria-label="ดวงของฉัน"><Icon d={I.chart} /></button>
        </div>
        <div className="messages" ref={pane}>
          {msgs.length === 0 ? (
            <div className="empty">
              <h2>อยากดูเรื่องอะไรวันนี้?</h2>
              <p className="muted small" style={{ margin: 0 }}>กรอกวันเกิดในแถบเมนูเพื่อผูกดวง หรือเลือกหัวข้อแล้วคุยกับหมอได้เลย</p>
              <div className="suggest">{TOPICS.map(t => <button key={t} onClick={() => send(`อยากดูเรื่อง${t}ครับ/ค่ะ`)} disabled={busy}>{t}</button>)}</div>
            </div>
          ) : (
            <div className="thread">
              {msgs.map((m, i) => m.role === "assistant" ? <div key={i} className="msg assistant"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
              {busy && <div className="typing">{ACTIVITY.find(([re]) => re.test(activity))?.[1] ?? "หมอกำลังดูดวง"}…</div>}
            </div>
          )}
        </div>
        <div className="composer-wrap">
          <form className="composer" onSubmit={e => { e.preventDefault(); send(input) }}>
            <textarea rows={1} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px" }} placeholder="ถามหมอได้เลย…" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); e.currentTarget.style.height = "auto" } }} />
            <button className="send" disabled={busy || !input.trim()} aria-label="ส่ง"><Icon d={I.up} /></button>
          </form>
          <div className="foot-note">คำทำนายเป็นแนวทาง โปรดใช้วิจารณญาณ</div>
        </div>
      </main>
      {panelOpen && (
        <aside className="panel">
          <div className="panel-head">ดวงของฉัน<button className="icon-btn" onClick={() => setShowPanel(false)} aria-label="ปิด"><Icon d={I.x} /></button></div>
          <div className="panel-body">
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
            {s.western && <WesternCard w={s.western} timeKnown={s.birth.timeKnown} />}
            {s.chinese && <ChineseCard c={s.chinese} />}
            {s.sevenNine && <SevenNineTable data={s.sevenNine} />}
          </div>
        </aside>
      )}
      {tableOpen && <TarotTable userId={userId} topic={form.topic} initial={tarot} useTarot={useTarot} onUseTarot={setUseTarot} onDraw={setTarot} onCombine={combineTarot} onClose={() => setTableOpen(false)} busy={busy} />}
    </div>
  )
}

const I = {
  plus: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18", menu: "M4 7h16M4 12h16M4 17h10", up: "M12 19V5M6 11l6-6 6 6",
  chart: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M3 12h18", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
}
function Icon({ d }: { d: string }) {
  return <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}
