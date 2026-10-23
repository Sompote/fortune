/**
 * Wrapper over the MIT `thai-astrology` Suriyayatra engine. Produces the full
 * deterministic chart plus a compact Thai summary that an LLM can interpret
 * without re-deriving anything.
 */
import { calculateThaiHoroscope, getThaiAstrologyProvinces } from "thai-astrology"
import type { ThaiHoroscope } from "thai-astrology"
import { sevenNine, naksatIndexFor, NAKSAT, WEEKDAYS, SEVEN_PLANETS } from "./seven.js"
import type { SevenNineResult } from "./seven.js"
import { computeWestern, provinceCoords, renderWesternThai } from "./western.js"
import type { Western } from "./western.js"
import { computeChinese, renderChineseThai } from "./chinese.js"
import type { Chinese } from "./chinese.js"

export interface ChartRequest {
  year: number
  era: "BE" | "CE"
  month: number
  day: number
  hour?: number
  minute?: number
  /** false = birth time unknown; the chart is cast at 12:00 and ลัคนา/ภพ are flagged unreliable. */
  timeKnown?: boolean
  province?: string
  /** Reading date for the age row; defaults to today. */
  readingDate?: string
  naksatBoundary?: "lunar-month-5" | "january"
  gender?: "male" | "female"
}

export interface ChartSummary {
  birth: { dayLabel: string; weekdayCivil: string; weekdayAstro: string; lunar: string | null; naksat: string; yearBe: number; yearCe: number; timeKnown: boolean; province: string }
  ascendant: { sign: string; degrees: number; minutes: number; ruler: string; rulerHouse: number; tanuseth: string } | null
  planets: { name: string; number: number | null; sign: string; degrees: number; minutes: number; house: number; houseName: string; dignities: string[]; rerk: string; nakshatra: string }[]
  houses: { number: number; name: string; sign: string; ruler: string; rulerIn: number; occupants: string[] }[] | null
  taksa: Record<string, string>
  rasiChannels: string[]
  navamsaChannels: string[]
  sevenNine: SevenNineResult | null
  western: Western | null
  chinese: Chinese | null
  notes: string[]
}

export interface ChartResult {
  summaryThai: string
  summary: ChartSummary
  raw: ThaiHoroscope
}

const HOUSE_MEANING: Record<string, string> = {
  "ตนุ": "ตัวตน ร่างกาย บุคลิก", "กดุมภะ": "ทรัพย์ การเงิน", "สหัชชะ": "พี่น้อง เพื่อน การสื่อสาร", "พันธุ": "ครอบครัว บ้าน ที่ดิน มารดา",
  "ปุตตะ": "บุตร ความรัก ความคิดสร้างสรรค์", "อริ": "ศัตรู อุปสรรค โรคภัย หนี้สิน", "ปัตนิ": "คู่ครอง หุ้นส่วน", "มรณะ": "ความเปลี่ยนแปลงใหญ่ มรดก ความลับ",
  "ศุภะ": "โชค การศึกษา ศาสนา ต่างแดน", "กัมมะ": "การงาน อาชีพ เกียรติยศ", "ลาภะ": "ลาภ รายได้ มิตร ความสมหวัง", "วินาศะ": "ความสูญเสีย ค่าใช้จ่าย เรื่องลับ",
}
const TAKSA_MEANING: Record<string, string> = {
  boriwan: "บริวาร (ลูกน้อง คู่ครอง ผู้ใต้บังคับบัญชา)", ayu: "อายุ (สุขภาพ ความเป็นอยู่)", det: "เดช (อำนาจ ชื่อเสียง)", si: "ศรี (ทรัพย์ ความเจริญ)",
  mula: "มูละ (หลักฐาน บ้าน ที่ดิน)", utsaha: "อุตสาหะ (ความเพียร การงาน)", montri: "มนตรี (ผู้ใหญ่อุปถัมภ์)", kalakini: "กาลกิณี (โทษ อุปสรรค ควรเลี่ยง)",
}
const PLANET_NAME: Record<number, string> = { 1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร", 4: "พุธ", 5: "พฤหัสบดี", 6: "ศุกร์", 7: "เสาร์", 8: "ราหู", 9: "เกตุ", 0: "มฤตยู" }

export function provinces(): string[] {
  return getThaiAstrologyProvinces().map(p => p.province)
}

export function computeChart(req: ChartRequest): ChartResult {
  const timeKnown = req.timeKnown !== false && req.hour !== undefined
  const hour = timeKnown ? (req.hour as number) : 12
  const minute = timeKnown ? (req.minute ?? 0) : 0
  const province = req.province && provinces().includes(req.province) ? req.province : "กรุงเทพมหานคร"
  const notes: string[] = []
  if (req.province && province !== req.province) notes.push(`ไม่รู้จักจังหวัด "${req.province}" ใช้กรุงเทพมหานครแทน`)
  if (!timeKnown) notes.push("ไม่ทราบเวลาเกิด: ผูกดวงที่ 12:00 น. ลัคนาและภพทั้ง 12 ไม่น่าเชื่อถือ ให้ทำนายจากตำแหน่งดาวในราศี ทักษา และเลข 7 ตัว 9 ฐานเป็นหลัก จันทร์อาจคลาดราศีได้หากเกิดใกล้รอยต่อ")

  const raw = calculateThaiHoroscope({ date: { year: req.year, era: req.era, month: req.month, day: req.day }, time: { hour, minute }, location: { province } })
  const cal = raw.calendar
  const yearBe = raw.input.date.yearBe
  const yearCe = raw.input.date.yearCe
  const lunar = cal.thaiLunarDate
  const naksatIdx = naksatIndexFor(yearCe, lunar ? lunar.month : null, req.naksatBoundary ?? "lunar-month-5")

  // Age at reading date
  const reading = req.readingDate ? new Date(req.readingDate) : new Date()
  let age = reading.getFullYear() - yearCe
  if (reading.getMonth() + 1 < req.month || (reading.getMonth() + 1 === req.month && reading.getDate() < req.day)) age -= 1
  if (age < 0) age = 0

  let seven: SevenNineResult | null = null
  if (lunar) seven = sevenNine({ astrologicalWeekday: cal.astrologicalWeekday, lunarMonth: lunar.month, naksatIndex: naksatIdx, ageCompleted: age })
  else notes.push("วันที่อยู่นอกช่วงปฏิทินจันทรคติที่รองรับ (พ.ศ. 2125–2619) จึงไม่คำนวณเลข 7 ตัว 9 ฐาน")

  let western: Western | null = null
  try {
    const { latitude, longitude } = provinceCoords(province)
    western = computeWestern({ yearCe, month: req.month, day: req.day, hour, minute, latitude, longitude, timeKnown })
  } catch (e) { notes.push(`คำนวณโหราศาสตร์สากลไม่สำเร็จ: ${(e as Error).message}`) }

  let chinese: Chinese | null = null
  try { chinese = computeChinese({ yearCe, month: req.month, day: req.day, hour, minute, timeKnown, gender: req.gender, readingDate: reading }) }
  catch (e) { notes.push(`คำนวณดวงจีนไม่สำเร็จ: ${(e as Error).message}`) }

  const pts = raw.points
  const planetKeys = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu", "uranus"] as const
  const planets = planetKeys.map(k => {
    const p = pts[k]
    const h = raw.houses[p.house - 1]
    return { name: p.nameThai, number: p.number, sign: p.signName, degrees: p.degrees, minutes: Math.round(p.minutes), house: p.house, houseName: h?.nameThai ?? "", dignities: p.dignities, rerk: p.rerk, nakshatra: `${p.nakshatraName} บาทที่ ${p.nakshatraQuarter}` }
  })
  const asc = pts.ascendant
  const ascendant = timeKnown ? { sign: asc.signName, degrees: asc.degrees, minutes: Math.round(asc.minutes), ruler: raw.houses[0].ruler.nameThai, rulerHouse: raw.houses[0].ruler.house, tanuseth: raw.factors.tanuseth.nameThai } : null
  const houses = timeKnown ? raw.houses.map(h => ({ number: h.number, name: h.nameThai, sign: h.signNameThai, ruler: h.ruler.nameThai, rulerIn: h.ruler.house, occupants: h.occupants.map(o => pts[o].nameThai) })) : null
  const taksa: Record<string, string> = {}
  for (const k of ["boriwan", "ayu", "det", "si", "mula", "utsaha", "montri", "kalakini"] as const) taksa[k] = PLANET_NAME[raw.taksa[k]]

  const summary: ChartSummary = {
    birth: {
      dayLabel: `${req.day}/${req.month}/${yearBe} (ค.ศ. ${yearCe})${timeKnown ? ` ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : ""}`,
      weekdayCivil: WEEKDAYS[cal.civilWeekday], weekdayAstro: WEEKDAYS[cal.astrologicalWeekday],
      lunar: lunar ? `${lunar.phase === "waxing" ? "ขึ้น" : "แรม"} ${lunar.day} ค่ำ เดือน ${lunar.month}${lunar.secondEighthMonth ? " (แปดหลัง)" : ""}` : null,
      naksat: NAKSAT[naksatIdx], yearBe, yearCe, timeKnown, province,
    },
    ascendant, planets, houses, taksa,
    rasiChannels: raw.charts.rasi.channels.thai, navamsaChannels: raw.charts.navamsa.channels.thai,
    sevenNine: seven, western, chinese, notes,
  }
  return { summaryThai: renderThai(summary), summary, raw }
}

function renderThai(s: ChartSummary): string {
  const L: string[] = []
  L.push(`## ดวงกำเนิด (สุริยยาตร์)`)
  L.push(`เกิด ${s.birth.dayLabel} จ.${s.birth.province} วัน${s.birth.weekdayCivil}${s.birth.weekdayAstro !== s.birth.weekdayCivil ? ` (ทางโหราศาสตร์นับเป็นวัน${s.birth.weekdayAstro} เพราะเกิดก่อน 06:00)` : ""}${s.birth.lunar ? ` ${s.birth.lunar}` : ""} ปี${s.birth.naksat}`)
  if (s.ascendant) L.push(`ลัคนา (ลั) สถิตราศี${s.ascendant.sign} ${s.ascendant.degrees}°${s.ascendant.minutes}' ตนุลัคน์คือ${s.ascendant.ruler} อยู่ภพที่ ${s.ascendant.rulerHouse} ตนุเศษคือ${s.ascendant.tanuseth}`)
  else L.push(`ลัคนา: ไม่ทราบเวลาเกิด จึงไม่ใช้ลัคนาและภพ`)
  L.push(`### ตำแหน่งดาว`)
  for (const p of s.planets) {
    const dig = p.dignities.length ? ` [${p.dignities.join(", ")}]` : ""
    const hs = s.ascendant ? ` ภพ ${p.house} ${p.houseName} (${HOUSE_MEANING[p.houseName] ?? ""})` : ""
    L.push(`- ${p.name} (${p.number ?? "ลั"}) ราศี${p.sign} ${p.degrees}°${p.minutes}'${hs}${dig} ฤกษ์${p.rerk} ${p.nakshatra}`)
  }
  if (s.houses) {
    L.push(`### ภพทั้ง 12 (เรือนราศีจากลัคนา)`)
    for (const h of s.houses) L.push(`- ภพ ${h.number} ${h.name} ราศี${h.sign} เจ้าเรือน${h.ruler} ไปอยู่ภพ ${h.rulerIn}${h.occupants.length ? ` มีดาว ${h.occupants.join(" ")}` : ""}`)
  }
  L.push(`### ทักษา (วัน${s.birth.weekdayAstro})`)
  L.push(Object.entries(s.taksa).map(([k, v]) => `${TAKSA_MEANING[k]} = ${v}`).join("; "))
  L.push(`ราศีจักร (เมษ→มีน): ${s.rasiChannels.map((c, i) => `${i + 1}:${c || "-"}`).join(" ")}`)
  if (s.sevenNine) {
    const sn = s.sevenNine
    L.push(`### เลข 7 ตัว 9 ฐาน (วัน${sn.seeds.weekdayName} เดือน ${sn.seeds.lunarMonth} ปี${sn.seeds.naksat})`)
    L.push(`คอลัมน์: ${sn.columns.join(" | ")}`)
    for (const b of sn.bases) L.push(`${b.name}: ${b.values.join(" ")}`)
    L.push(`ฐาน 4 (หลัก): ${sn.mainRow.map(m => `${m.column}=${m.sum}→${m.reduced} ${m.planet}`).join("; ")}`)
    L.push(`อายุ ${sn.age.completed} ปี (ย่าง ${sn.age.yang}) ดาวจรประจำปีอยู่${sn.age.rowName} ช่อง${sn.age.column} = ${sn.age.value} ${sn.age.planet} (${SEVEN_PLANETS[sn.age.value].keyword})`)
  }
  if (s.western) L.push(renderWesternThai(s.western, s.birth.timeKnown))
  if (s.chinese) L.push(renderChineseThai(s.chinese))
  if (s.notes.length) L.push(`### หมายเหตุ\n${s.notes.map(n => `- ${n}`).join("\n")}`)
  return L.join("\n")
}
