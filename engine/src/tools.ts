/**
 * Tool definitions shared by the MCP server (for TigrimOS) and the HTTP
 * backend (for the web app). Each tool has a JSON schema and a handler.
 */
import { z } from "zod"
import { computeChart, provinces } from "./chart.js"
import { sevenNine, naksatIndexFor } from "./seven.js"
import { ensureUser, patchUser, logReading, logFeedback, digest, loadUser } from "./memory.js"

export const birthSchema = z.object({
  year: z.number().int().describe("ปีเกิด ตามศักราชที่ระบุใน era"),
  era: z.enum(["BE", "CE"]).describe("BE = พ.ศ., CE = ค.ศ."),
  month: z.number().int().min(1).max(12).describe("เดือนเกิด (ปฏิทินสากล 1–12)"),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).optional().describe("ชั่วโมงเกิด 0–23 ถ้าทราบ"),
  minute: z.number().int().min(0).max(59).optional(),
  timeKnown: z.boolean().optional().describe("false ถ้าไม่ทราบเวลาเกิด"),
  province: z.string().optional().describe("จังหวัดที่เกิด ชื่อไทย เช่น กรุงเทพมหานคร เชียงใหม่"),
  gender: z.enum(["male", "female"]).optional().describe("เพศ ใช้กำหนดทิศวาสนาสิบปีของดวงจีน"),
})

export const toolDefs = {
  compute_chart: {
    description: "ผูกดวงโหราศาสตร์ไทยแบบสุริยยาตร์จากวัน เวลา และจังหวัดเกิด คืนค่าลัคนา ตำแหน่งดาว 10 ดวงในราศีและภพ เจ้าเรือน ตนุเศษ มาตรฐานดาว ฤกษ์ ทักษา วันจันทรคติ และเลข 7 ตัว 9 ฐาน พร้อมสรุปภาษาไทย ใช้ทุกครั้งก่อนทำนาย",
    schema: birthSchema.extend({ readingDate: z.string().optional().describe("วันที่ดู (ISO) สำหรับคำนวณอายุ ค่าเริ่มต้นคือวันนี้") }),
    handler: async (a: z.infer<typeof birthSchema> & { readingDate?: string }) => {
      const r = computeChart(a)
      return { summaryThai: r.summaryThai, summary: r.summary }
    },
  },
  seven_nine: {
    description: "คำนวณเลข 7 ตัว 9 ฐานอย่างเดียว เมื่อทราบวันในสัปดาห์ (1=อาทิตย์..7=เสาร์) เดือนจันทรคติ ปีนักษัตร และอายุ ใช้เมื่อผู้ใช้ให้ข้อมูลจันทรคติมาเอง หรือไม่ต้องการผูกดวงเต็ม",
    schema: z.object({
      weekday: z.number().int().min(1).max(7).describe("1=อาทิตย์ 2=จันทร์ ... 7=เสาร์ (เกิดก่อน 06:00 ใช้วันก่อนหน้า)"),
      lunarMonth: z.number().int().min(1).max(12).describe("เดือนจันทรคติไทย 1–12"),
      naksat: z.number().int().min(0).max(11).optional().describe("ปีนักษัตร 0=ชวด 1=ฉลู ... 11=กุน"),
      yearCe: z.number().int().optional().describe("ปี ค.ศ. เกิด ใช้คำนวณนักษัตรเมื่อไม่ได้ให้ naksat"),
      ageCompleted: z.number().int().min(0).max(130),
    }),
    handler: async (a: { weekday: number; lunarMonth: number; naksat?: number; yearCe?: number; ageCompleted: number }) => {
      const idx = a.naksat ?? (a.yearCe !== undefined ? naksatIndexFor(a.yearCe, a.lunarMonth) : 0)
      return sevenNine({ astrologicalWeekday: a.weekday, lunarMonth: a.lunarMonth, naksatIndex: idx, ageCompleted: a.ageCompleted })
    },
  },
  list_provinces: {
    description: "รายชื่อจังหวัดไทยที่ใช้ผูกดวงได้ (77 จังหวัด)",
    schema: z.object({}),
    handler: async () => ({ provinces: provinces() }),
  },
  recall_user: {
    description: "ดึงความจำเกี่ยวกับผู้ใช้คนนี้: ชื่อ วันเกิด ข้อเท็จจริง เรื่องที่เคยถาม คำทำนายก่อนหน้า และผลตอบรับ เรียกทุกครั้งที่เริ่มสนทนา",
    schema: z.object({ user_id: z.string().min(1) }),
    handler: async (a: { user_id: string }) => {
      const mem = await loadUser(a.user_id)
      if (!mem) return { known: false, digest: "ผู้ใช้ใหม่ ยังไม่มีความจำ", memory: null }
      return { known: true, digest: digest(mem), memory: mem }
    },
  },
  remember_user: {
    description: "บันทึกสิ่งที่ได้รู้เกี่ยวกับผู้ใช้: ชื่อ ชื่อเล่น เพศ วันเวลาและจังหวัดเกิด ข้อเท็จจริงใหม่ (งาน ความสัมพันธ์ เป้าหมาย) หรือเรื่องที่กังวลวันนี้ เรียกทันทีเมื่อผู้ใช้ให้ข้อมูลใหม่",
    schema: z.object({
      user_id: z.string().min(1),
      name: z.string().optional(), nickname: z.string().optional(), gender: z.string().optional(),
      birth: birthSchema.optional(),
      addFacts: z.array(z.string()).optional().describe("ข้อเท็จจริงสั้น ๆ ประโยคละหนึ่งเรื่อง"),
      addConcern: z.object({ topic: z.string().describe("หัวข้อ เช่น การงาน ความรัก การเงิน สุขภาพ"), text: z.string() }).optional(),
    }),
    handler: async (a: any) => {
      const { user_id, birth, ...rest } = a
      const b = birth ? { ...birth, timeKnown: birth.timeKnown !== false && birth.hour !== undefined } : undefined
      const mem = await patchUser(user_id, { ...rest, birth: b })
      return { ok: true, digest: digest(mem) }
    },
  },
  log_reading: {
    description: "บันทึกสรุปคำทำนายที่เพิ่งให้ไป (หัวข้อ + สรุป 1–3 ประโยค รวมช่วงเวลาที่ทำนายไว้) เพื่อใช้ติดตามผลในครั้งต่อไป เรียกเมื่อจบการทำนายแต่ละเรื่อง",
    schema: z.object({ user_id: z.string().min(1), topic: z.string(), summary: z.string() }),
    handler: async (a: { user_id: string; topic: string; summary: string }) => logReading(a.user_id, a.topic, a.summary),
  },
  log_feedback: {
    description: "บันทึกผลตอบรับของผู้ใช้ต่อคำทำนายก่อนหน้า: ตรง (matched) ตรงบางส่วน (partly) ไม่ตรง (missed) หรือยังไม่รู้ (unknown) พร้อมโน้ต เรียกเมื่อผู้ใช้เล่าว่าเรื่องที่ทำนายไว้เกิดขึ้นหรือไม่",
    schema: z.object({ user_id: z.string().min(1), outcome: z.enum(["matched", "partly", "missed", "unknown"]), note: z.string(), readingId: z.string().optional() }),
    handler: async (a: { user_id: string; outcome: "matched" | "partly" | "missed" | "unknown"; note: string; readingId?: string }) => {
      await logFeedback(a.user_id, a.outcome, a.note, a.readingId)
      return { ok: true }
    },
  },
} as const

export type ToolName = keyof typeof toolDefs

export async function callTool(name: string, args: unknown): Promise<unknown> {
  const def = (toolDefs as Record<string, { schema: z.ZodTypeAny; handler: (a: any) => Promise<unknown> }>)[name]
  if (!def) throw new Error(`unknown tool ${name}`)
  const parsed = def.schema.parse(args ?? {})
  return def.handler(parsed)
}

export { ensureUser }
