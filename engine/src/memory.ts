/**
 * Per-user memory for the chatbot. One JSON file per user under DATA_DIR/users.
 * Everything here is what the LLM is allowed to remember between sessions:
 * birth data, concerns raised, readings given, and the user's later feedback
 * on whether a reading matched what happened (the outcome loop).
 */
import { promises as fs } from "node:fs"
import path from "node:path"

export interface BirthData {
  year: number
  era: "BE" | "CE"
  month: number
  day: number
  hour?: number
  minute?: number
  timeKnown: boolean
  province?: string
}

export interface UserMemory {
  id: string
  name?: string
  nickname?: string
  gender?: string
  birth?: BirthData
  /** Free-form facts the user has shared (job, relationship status, goals). */
  facts: string[]
  concerns: { date: string; topic: string; text: string }[]
  readings: { id: string; date: string; topic: string; summary: string }[]
  feedback: { date: string; readingId?: string; outcome: "matched" | "partly" | "missed" | "unknown"; note: string }[]
  createdAt: string
  updatedAt: string
}

export function dataDir(): string {
  return process.env.MORDOO_DATA_DIR || path.resolve(process.cwd(), "data")
}

const userPath = (id: string): string => {
  const safe = id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80)
  return path.join(dataDir(), "users", `${safe}.json`)
}

export async function loadUser(id: string): Promise<UserMemory | null> {
  try {
    const raw = await fs.readFile(userPath(id), "utf8")
    return JSON.parse(raw) as UserMemory
  } catch {
    return null
  }
}

export async function saveUser(mem: UserMemory): Promise<void> {
  const p = userPath(mem.id)
  await fs.mkdir(path.dirname(p), { recursive: true })
  mem.updatedAt = new Date().toISOString()
  await fs.writeFile(p, JSON.stringify(mem, null, 2), "utf8")
}

export async function deleteUser(id: string): Promise<void> {
  try { await fs.unlink(userPath(id)) } catch {}
}

export async function ensureUser(id: string): Promise<UserMemory> {
  const existing = await loadUser(id)
  if (existing) return existing
  const now = new Date().toISOString()
  const mem: UserMemory = { id, facts: [], concerns: [], readings: [], feedback: [], createdAt: now, updatedAt: now }
  await saveUser(mem)
  return mem
}

export interface UserPatch {
  name?: string
  nickname?: string
  gender?: string
  birth?: BirthData
  addFacts?: string[]
  addConcern?: { topic: string; text: string }
}

export async function patchUser(id: string, patch: UserPatch): Promise<UserMemory> {
  const mem = await ensureUser(id)
  if (patch.name) mem.name = patch.name
  if (patch.nickname) mem.nickname = patch.nickname
  if (patch.gender) mem.gender = patch.gender
  if (patch.birth) mem.birth = patch.birth
  if (patch.addFacts) for (const f of patch.addFacts) if (f && !mem.facts.includes(f)) mem.facts.push(f)
  if (patch.addConcern) mem.concerns.push({ date: new Date().toISOString(), ...patch.addConcern })
  await saveUser(mem)
  return mem
}

export async function logReading(id: string, topic: string, summary: string): Promise<{ readingId: string }> {
  const mem = await ensureUser(id)
  const readingId = `r${Date.now().toString(36)}`
  mem.readings.push({ id: readingId, date: new Date().toISOString(), topic, summary })
  if (mem.readings.length > 50) mem.readings.splice(0, mem.readings.length - 50)
  await saveUser(mem)
  return { readingId }
}

export async function logFeedback(id: string, outcome: UserMemory["feedback"][number]["outcome"], note: string, readingId?: string): Promise<void> {
  const mem = await ensureUser(id)
  mem.feedback.push({ date: new Date().toISOString(), readingId, outcome, note })
  await saveUser(mem)
}

/** Compact Thai digest for the system/tool context (keeps tokens low). */
export function digest(mem: UserMemory): string {
  const lines: string[] = []
  lines.push(`ผู้ใช้ ${mem.id}${mem.name ? ` ชื่อ ${mem.name}` : ""}${mem.nickname ? ` (${mem.nickname})` : ""}${mem.gender ? ` เพศ ${mem.gender}` : ""}`)
  if (mem.birth) {
    const b = mem.birth
    lines.push(`เกิด ${b.day}/${b.month}/${b.year} ${b.era}${b.timeKnown && b.hour !== undefined ? ` เวลา ${String(b.hour).padStart(2, "0")}:${String(b.minute ?? 0).padStart(2, "0")}` : " (ไม่ทราบเวลาเกิด)"}${b.province ? ` จ.${b.province}` : ""}`)
  } else lines.push("ยังไม่มีข้อมูลวันเกิด")
  if (mem.facts.length) lines.push(`ข้อเท็จจริง: ${mem.facts.slice(-10).join("; ")}`)
  if (mem.concerns.length) lines.push(`เรื่องที่เคยถาม: ${mem.concerns.slice(-5).map(c => `${c.date.slice(0, 10)} ${c.topic}: ${c.text}`).join(" | ")}`)
  if (mem.readings.length) lines.push(`คำทำนายล่าสุด: ${mem.readings.slice(-3).map(r => `[${r.id} ${r.date.slice(0, 10)} ${r.topic}] ${r.summary}`).join(" | ")}`)
  if (mem.feedback.length) lines.push(`ผลตอบรับ: ${mem.feedback.slice(-5).map(f => `${f.date.slice(0, 10)} ${f.outcome}${f.readingId ? ` (${f.readingId})` : ""}: ${f.note}`).join(" | ")}`)
  return lines.join("\n")
}
