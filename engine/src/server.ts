/**
 * HTTP backend for the React web app.
 *  - /api/chart            direct chart computation for the chart card
 *  - /api/provinces
 *  - /api/users/:id        memory digest (for the profile panel)
 *  - /api/chat/start       create a TigrimOS session for this user
 *  - /api/chat/send        forward a message to TigrimOS (profile "mordoo") and wait for the reply
 *  - /api/chat/status/:id  activity tail while the agent works
 * Serves ../web/dist when it exists (production).
 */
import express from "express"
import cors from "cors"
import path from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { callTool } from "./tools.js"
import { computeChart, provinces } from "./chart.js"
import { loadUser, digest, logReading, deleteUser } from "./memory.js"

const PORT = Number(process.env.MORDOO_PORT || 8790)
const TIGRIMOS_URL = (process.env.TIGRIMOS_URL || "http://127.0.0.1:3001").replace(/\/$/, "")
const TIGRIMOS_TOKEN = process.env.TIGRIMOS_TOKEN || process.env.ACCESS_TOKEN || ""
const PROFILE = process.env.MORDOO_PROFILE || "mordoo"
const REPLY_TIMEOUT_MS = Number(process.env.MORDOO_REPLY_TIMEOUT_MS || 240_000)

const app = express()
app.use(cors())
app.use(express.json({ limit: "1mb" }))

const headers = () => ({ "Content-Type": "application/json", ...(TIGRIMOS_TOKEN ? { Authorization: `Bearer ${TIGRIMOS_TOKEN}` } : {}) })

async function tg<T = any>(method: string, p: string, body?: unknown): Promise<T> {
  const res = await fetch(`${TIGRIMOS_URL}${p}`, { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`TigrimOS ${method} ${p} → ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

app.get("/api/health", async (_req, res) => {
  let harness = "unreachable"
  try { await tg("GET", "/api/chat/active-tasks"); harness = "ok" } catch (e) { harness = `error: ${(e as Error).message}` }
  res.json({ ok: true, harness, tigrimosUrl: TIGRIMOS_URL, profile: PROFILE })
})

app.get("/api/provinces", (_req, res) => res.json({ provinces: provinces() }))

app.post("/api/chart", (req, res) => {
  try { res.json(computeChart(req.body)) } catch (e) { res.status(400).json({ error: (e as Error).message }) }
})

app.post("/api/tool/:name", async (req, res) => {
  try { res.json(await callTool(req.params.name, req.body)) } catch (e) { res.status(400).json({ error: (e as Error).message }) }
})

app.get("/api/users/:id", async (req, res) => {
  const mem = await loadUser(req.params.id)
  res.json(mem ? { known: true, digest: digest(mem), memory: mem } : { known: false })
})

app.delete("/api/users/:id", async (req, res) => {
  await deleteUser(req.params.id)
  res.json({ ok: true })
})

app.post("/api/chat/start", async (req, res) => {
  try {
    const title = `MorDoo ${req.body?.userId ?? ""} ${new Date().toISOString().slice(0, 16)}`
    const s = await tg<{ id: string }>("POST", "/api/chat/sessions", { title })
    res.json({ sessionId: s.id })
  } catch (e) { res.status(502).json({ error: (e as Error).message }) }
})

interface TgMessage { role: string; content: string; timestamp: string }

const TOPIC_WORDS: [string, RegExp][] = [["การงาน", /งาน|อาชีพ|เจ้านาย|ย้ายงาน|เลื่อน/], ["การเงิน", /เงิน|ทรัพย์|หนี้|รายได้|ลงทุน|โชค/], ["ความรัก", /รัก|แฟน|คู่|แต่งงาน|โสด/], ["สุขภาพ", /สุขภาพ|ป่วย|โรค/], ["ครอบครัว", /ครอบครัว|พ่อ|แม่|ลูก|บ้าน/], ["การเรียน", /เรียน|สอบ|มหาวิทยาลัย/]]
/** Some models occasionally emit the whole answer twice; keep one copy when the two halves match. */
function dedupeReply(t: string): string {
  const x = t.trim()
  const h = Math.floor(x.length / 2)
  const a = x.slice(0, h).trim(), b = x.slice(h).trim()
  if (a.length > 80 && a === b) return a
  const parts = x.split(/\n{2,}/)
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const n = parts.length / 2
    if (parts.slice(0, n).join("\n\n").trim() === parts.slice(n).join("\n\n").trim()) return parts.slice(0, n).join("\n\n")
  }
  return x
}

const topicOf = (t: string): string => TOPIC_WORDS.find(([, re]) => re.test(t))?.[0] ?? "ทั่วไป"

/** Context the backend computes so the model does not spend LLM rounds on recall/compute. */
async function buildContext(userId: string): Promise<{ block: string; hasChart: boolean }> {
  const mem = await loadUser(userId)
  const lines: string[] = ["[บริบทจากระบบ — ผู้ใช้มองไม่เห็นส่วนนี้ ไม่ต้องเรียก recall_user หรือ compute_chart ซ้ำ ใช้ข้อมูลนี้ได้เลย]"]
  let hasChart = false
  if (!mem) lines.push("ความจำ: ผู้ใช้ใหม่ ยังไม่มีข้อมูล")
  else {
    lines.push("ความจำ:\n" + digest(mem))
    const b = mem.birth
    if (b) {
      try {
        const g = mem.gender === "ชาย" || mem.gender === "male" ? "male" : mem.gender === "หญิง" || mem.gender === "female" ? "female" : undefined
        const c = computeChart({ year: b.year, era: b.era, month: b.month, day: b.day, hour: b.hour, minute: b.minute, timeKnown: b.timeKnown, province: b.province, gender: g })
        lines.push("ดวงที่คำนวณแล้ว:\n" + c.summaryThai)
        hasChart = true
      } catch (e) { lines.push(`ผูกดวงไม่สำเร็จ: ${(e as Error).message}`) }
    }
  }
  lines.push("[จบบริบทจากระบบ]")
  return { block: lines.join("\n"), hasChart }
}

app.post("/api/chat/send", async (req, res) => {
  const { sessionId, userId, text } = req.body as { sessionId?: string; userId?: string; text?: string }
  if (!sessionId || !userId || !text) return res.status(400).json({ error: "sessionId, userId and text are required" })
  try {
    const before = await tg<{ messages: TgMessage[] }>("GET", `/api/chat/sessions/${sessionId}`)
    const n0 = before.messages.length
    const ctx = await buildContext(userId)
    const message = `[user_id=${userId}] ${text}\n\n${ctx.block}`
    const ack = await tg<any>("POST", `/api/chat/sessions/${sessionId}/messages`, { message, agent_loop_profile: PROFILE, agent_mode: "single" })
    if (ack.content && !ack.status) return res.json({ reply: ack.content, error: true })
    const t0 = Date.now()
    while (Date.now() - t0 < REPLY_TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, 700))
      const s = await tg<{ messages: TgMessage[] }>("GET", `/api/chat/sessions/${sessionId}`)
      const fresh = s.messages.slice(n0 + 1)
      const reply = [...fresh].reverse().find(m => m.role === "assistant")
      if (reply) {
        const active = await tg<{ tasks: { session_id: string }[] }>("GET", "/api/chat/active-tasks")
        if (!active.tasks.some(t => t.session_id === sessionId)) {
          // Backend-side reading log: no LLM round needed.
          const content = dedupeReply(reply.content)
          if (ctx.hasChart && content.length > 400 && !/^Error:/.test(content)) {
            const summary = content.replace(/[*#_]/g, "").replace(/\s+/g, " ").slice(0, 320)
            logReading(userId, topicOf(text), summary).catch(() => {})
          }
          return res.json({ reply: content, ms: Date.now() - t0 })
        }
      }
    }
    res.status(504).json({ error: "timeout waiting for the agent" })
  } catch (e) { res.status(502).json({ error: (e as Error).message }) }
})

app.get("/api/chat/status/:id", async (req, res) => {
  try {
    const a = await tg<{ content: string }>("GET", `/api/chat/sessions/${req.params.id}/activity`)
    const lines = (a.content || "").trim().split("\n").filter(Boolean)
    res.json({ tail: lines.slice(-6) })
  } catch (e) { res.json({ tail: [] }) }
})

app.get("/api/chat/history/:id", async (req, res) => {
  try {
    const s = await tg<{ messages: TgMessage[] }>("GET", `/api/chat/sessions/${req.params.id}`)
    res.json({ messages: s.messages.map(m => ({ role: m.role, content: m.content.replace(/^\[user_id=[^\]]+\]\s*/, "").replace(/\n\n\[บริบทจากระบบ[\s\S]*$/, ""), timestamp: m.timestamp })) })
  } catch (e) { res.status(502).json({ error: (e as Error).message }) }
})

const here = path.dirname(fileURLToPath(import.meta.url))
const webDist = path.resolve(here, "../../web/dist")
if (existsSync(webDist)) {
  app.use(express.static(webDist))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")))
}

app.listen(PORT, () => console.log(`[mordoo] backend on http://127.0.0.1:${PORT} → harness ${TIGRIMOS_URL} profile ${PROFILE}${existsSync(webDist) ? " (serving web/dist)" : ""}`))
