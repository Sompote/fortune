/** BaZi (八字 ปาจื้อ สี่เสาแปดอักษร) via lunar-javascript (solar terms, sexagenary cycle, luck pillars). */
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const { Solar } = require("lunar-javascript")

const STEM: Record<string, { thai: string; element: string; yin: boolean }> = {
  "甲": { thai: "เจี่ย", element: "ไม้", yin: false }, "乙": { thai: "อี่", element: "ไม้", yin: true }, "丙": { thai: "ปิ่ง", element: "ไฟ", yin: false }, "丁": { thai: "ติง", element: "ไฟ", yin: true },
  "戊": { thai: "อู้", element: "ดิน", yin: false }, "己": { thai: "จี่", element: "ดิน", yin: true }, "庚": { thai: "เกิง", element: "ทอง", yin: false }, "辛": { thai: "ซิน", element: "ทอง", yin: true },
  "壬": { thai: "เหริน", element: "น้ำ", yin: false }, "癸": { thai: "กุ่ย", element: "น้ำ", yin: true },
}
const BRANCH: Record<string, { thai: string; animal: string; element: string }> = {
  "子": { thai: "จื่อ", animal: "ชวด (หนู)", element: "น้ำ" }, "丑": { thai: "โฉ่ว", animal: "ฉลู (วัว)", element: "ดิน" }, "寅": { thai: "อิ๋น", animal: "ขาล (เสือ)", element: "ไม้" }, "卯": { thai: "เหม่า", animal: "เถาะ (กระต่าย)", element: "ไม้" },
  "辰": { thai: "เฉิน", animal: "มะโรง (มังกร)", element: "ดิน" }, "巳": { thai: "ซื่อ", animal: "มะเส็ง (งู)", element: "ไฟ" }, "午": { thai: "อู่", animal: "มะเมีย (ม้า)", element: "ไฟ" }, "未": { thai: "เว่ย", animal: "มะแม (แพะ)", element: "ดิน" },
  "申": { thai: "เซิน", animal: "วอก (ลิง)", element: "ทอง" }, "酉": { thai: "โหย่ว", animal: "ระกา (ไก่)", element: "ทอง" }, "戌": { thai: "ซวี", animal: "จอ (หมา)", element: "ดิน" }, "亥": { thai: "ไห่", animal: "กุน (หมู)", element: "น้ำ" },
}
const GOD: Record<string, { thai: string; meaning: string }> = {
  "比肩": { thai: "ปี่เจียน", meaning: "มิตร เพื่อนร่วมทาง ความเป็นตัวของตัวเอง" }, "劫财": { thai: "เจี๋ยไฉ", meaning: "คู่แข่ง การแบ่งทรัพย์ ความใจร้อน" },
  "食神": { thai: "สือเสิน", meaning: "ความสุข ผลผลิต อาหาร ศิลปะ" }, "伤官": { thai: "ซางกวน", meaning: "ความสามารถ การแสดงออก ขัดกฎ" },
  "偏财": { thai: "เพียนไฉ", meaning: "ทรัพย์ลอย โชคลาภ ธุรกิจ บิดา" }, "正财": { thai: "เจิ้งไฉ", meaning: "ทรัพย์ประจำ เงินเดือน ภรรยา" },
  "七杀": { thai: "ชีซา", meaning: "แรงกดดัน อำนาจ ความท้าทาย" }, "正官": { thai: "เจิ้งกวน", meaning: "ตำแหน่ง วินัย กฎเกณฑ์ สามี" },
  "偏印": { thai: "เพียนอิ้น", meaning: "ความรู้นอกตำรา ความคิดแปลกใหม่" }, "正印": { thai: "เจิ้งอิ้น", meaning: "ผู้อุปถัมภ์ การศึกษา มารดา" }, "日主": { thai: "วันธาตุ", meaning: "ตัวเอง" },
}
const CLASH: Record<string, string> = { "子": "午", "午": "子", "丑": "未", "未": "丑", "寅": "申", "申": "寅", "卯": "酉", "酉": "卯", "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳" }
const COMBINE: Record<string, string> = { "子": "丑", "丑": "子", "寅": "亥", "亥": "寅", "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰", "巳": "申", "申": "巳", "午": "未", "未": "午" }
const PRODUCES: Record<string, string> = { "ไม้": "ไฟ", "ไฟ": "ดิน", "ดิน": "ทอง", "ทอง": "น้ำ", "น้ำ": "ไม้" }
const CONTROLS: Record<string, string> = { "ไม้": "ดิน", "ดิน": "น้ำ", "น้ำ": "ไฟ", "ไฟ": "ทอง", "ทอง": "ไม้" }

export interface Pillar { name: string; ganZhi: string; stem: string; stemThai: string; stemElement: string; branch: string; branchThai: string; animal: string; branchElement: string; godStem: string; godStemThai: string; godsBranch: string[]; hidden: string[]; naYin: string }
export interface Chinese {
  pillars: Pillar[]
  dayMaster: { stem: string; thai: string; element: string; yin: boolean; label: string }
  elements: Record<string, number>
  support: { same: number; resource: number; output: number; wealth: number; power: number; strength: "แข็ง" | "อ่อน" | "กลาง" }
  missing: string[]
  usefulHint: string
  luck: { forward: boolean; startAge: number; pillars: { startAge: number; startYear: number; endYear: number; ganZhi: string; thai: string; current: boolean }[] }
  currentYear: { ganZhi: string; thai: string; animal: string; relation: string }
  shengXiao: string
  timeKnown: boolean
  gender: "male" | "female" | "unknown"
  notes: string[]
}

const gz = (s: string): string => `${STEM[s[0]]?.thai ?? s[0]}${BRANCH[s[1]]?.thai ?? s[1]}`

export function computeChinese(a: { yearCe: number; month: number; day: number; hour: number; minute: number; timeKnown: boolean; gender?: "male" | "female"; readingDate?: Date }): Chinese {
  const solar = Solar.fromYmdHms(a.yearCe, a.month, a.day, a.timeKnown ? a.hour : 12, a.timeKnown ? a.minute : 0, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()
  const mk = (name: string, ganZhi: string, godStem: string, godsBranch: string[], hidden: string[], naYin: string): Pillar => {
    const st = ganZhi[0], br = ganZhi[1]
    return { name, ganZhi, stem: st, stemThai: STEM[st].thai, stemElement: STEM[st].element, branch: br, branchThai: BRANCH[br].thai, animal: BRANCH[br].animal, branchElement: BRANCH[br].element, godStem, godStemThai: GOD[godStem]?.thai ?? godStem, godsBranch, hidden, naYin }
  }
  const pillars: Pillar[] = [
    mk("ปี", ec.getYear(), ec.getYearShiShenGan(), ec.getYearShiShenZhi(), ec.getYearHideGan(), ec.getYearNaYin()),
    mk("เดือน", ec.getMonth(), ec.getMonthShiShenGan(), ec.getMonthShiShenZhi(), ec.getMonthHideGan(), ec.getMonthNaYin()),
    mk("วัน", ec.getDay(), "日主", ec.getDayShiShenZhi(), ec.getDayHideGan(), ec.getDayNaYin()),
  ]
  if (a.timeKnown) pillars.push(mk("ยาม", ec.getTime(), ec.getTimeShiShenGan(), ec.getTimeShiShenZhi(), ec.getTimeHideGan(), ec.getTimeNaYin()))
  const dm = STEM[ec.getDayGan()]
  const elements: Record<string, number> = { "ไม้": 0, "ไฟ": 0, "ดิน": 0, "ทอง": 0, "น้ำ": 0 }
  for (const p of pillars) { elements[p.stemElement] += 1; elements[p.branchElement] += 1 }
  const resourceEl = Object.keys(PRODUCES).find(k => PRODUCES[k] === dm.element)!
  const powerEl = Object.keys(CONTROLS).find(k => CONTROLS[k] === dm.element)!
  const support = { same: elements[dm.element], resource: elements[resourceEl], output: elements[PRODUCES[dm.element]], wealth: elements[CONTROLS[dm.element]], power: elements[powerEl], strength: "กลาง" as "แข็ง" | "อ่อน" | "กลาง" }
  const seasonBoost = pillars[1].branchElement === dm.element || pillars[1].branchElement === resourceEl ? 1 : 0
  const score = support.same + support.resource + seasonBoost - (support.output + support.wealth + support.power) / 2
  support.strength = score >= 2 ? "แข็ง" : score <= 0 ? "อ่อน" : "กลาง"
  const missing = Object.entries(elements).filter(([, v]) => v === 0).map(([k]) => k)
  const usefulHint = support.strength === "แข็ง" ? `วันธาตุแข็ง ธาตุที่ช่วยปรับสมดุลคือ ${PRODUCES[dm.element]} (ระบาย) ${CONTROLS[dm.element]} (ทรัพย์) ${powerEl} (อำนาจ)` : support.strength === "อ่อน" ? `วันธาตุอ่อน ธาตุที่ช่วยคือ ${resourceEl} (อุปถัมภ์) และ ${dm.element} (พวกพ้อง)` : "วันธาตุสมดุล ดูธาตุที่ขาดและเสาเดือนเป็นหลัก"
  const readingDate = a.readingDate ?? new Date()
  const g = a.gender ?? "male"
  const yun = ec.getYun(g === "female" ? 0 : 1)
  const daYun = yun.getDaYun().filter((d: any) => d.getGanZhi()).slice(0, 8)
  const luckPillars = daYun.map((d: any) => ({ startAge: d.getStartAge(), startYear: d.getStartYear(), endYear: d.getEndYear(), ganZhi: d.getGanZhi(), thai: gz(d.getGanZhi()), current: readingDate.getFullYear() >= d.getStartYear() && readingDate.getFullYear() <= d.getEndYear() }))
  const thisYear = Solar.fromYmd(readingDate.getFullYear(), readingDate.getMonth() + 1, readingDate.getDate()).getLunar()
  const yGZ: string = thisYear.getYearInGanZhi()
  const yb = yGZ[1], birthB = pillars[0].branch
  const relation = CLASH[birthB] === yb ? "ปีชง (เสาปีเกิดปะทะปีนี้) ควรระวังการเปลี่ยนแปลง" : COMBINE[birthB] === yb ? "ปีสมพงศ์ (เสาปีเกิดร่วมกับปีนี้) มีผู้ช่วยเหลือ" : yb === birthB ? "ปีซ้ำนักษัตรตัวเอง (本命年) พลังสูงแต่ควรระวังความใจร้อน" : "ปีนี้ไม่ชงไม่สมพงศ์กับปีเกิด"
  const notes: string[] = []
  if (!a.timeKnown) notes.push("ไม่ทราบเวลาเกิด: มีเพียงสามเสา (ปี เดือน วัน) ไม่มีเสายาม")
  if (!a.gender) notes.push("ไม่ทราบเพศ: วาสนาสิบปีคำนวณแบบชาย ถ้าเป็นหญิงทิศทางอาจกลับกัน")
  notes.push("ใช้เวลาตามนาฬิกาท้องถิ่น ไม่ได้ปรับเป็นเวลาสุริยะจริง (ต่างได้ราว 10–20 นาที)")
  return {
    pillars, dayMaster: { stem: dm.thai, thai: dm.thai, element: dm.element, yin: dm.yin, label: `${dm.thai} (${dm.element}${dm.yin ? "หยิน" : "หยาง"})` },
    elements, support, missing, usefulHint,
    luck: { forward: yun.isForward(), startAge: daYun[0]?.getStartAge() ?? 0, pillars: luckPillars },
    currentYear: { ganZhi: yGZ, thai: gz(yGZ), animal: BRANCH[yb].animal, relation },
    shengXiao: BRANCH[birthB].animal, timeKnown: a.timeKnown, gender: a.gender ?? "unknown", notes,
  }
}

export function renderChineseThai(c: Chinese): string {
  const L: string[] = ["## ดวงจีน ปาจื้อ (八字 สี่เสาแปดอักษร)"]
  L.push(`เสา: ${c.pillars.map(p => `${p.name} ${p.ganZhi} ${p.stemThai}${p.branchThai} [กิ่ง ${p.stemElement} ${p.godStem !== "日主" ? `= ${p.godStemThai}` : "= วันธาตุ"}; ก้าน ${p.animal} ${p.branchElement} ซ่อน ${p.godsBranch.map(g => GOD[g]?.thai ?? g).join("/")}]`).join(" | ")}`)
  L.push(`วันธาตุ (Day Master): ${c.dayMaster.label} กำลัง${c.support.strength} (พวกพ้อง ${c.support.same} อุปถัมภ์ ${c.support.resource} ระบาย ${c.support.output} ทรัพย์ ${c.support.wealth} อำนาจ ${c.support.power})`)
  L.push(`ห้าธาตุใน ${c.pillars.length * 2} อักษร: ${Object.entries(c.elements).map(([k, v]) => `${k} ${v}`).join(" ")}${c.missing.length ? ` ขาดธาตุ ${c.missing.join(" ")}` : " ครบทุกธาตุ"}`)
  L.push(`แนวทางปรับสมดุล: ${c.usefulHint}`)
  L.push(`ความหมายสิบเทพที่พบ: ${[...new Set(c.pillars.flatMap(p => [p.godStem, ...p.godsBranch]).filter(g => g !== "日主"))].map(g => `${GOD[g]?.thai ?? g} = ${GOD[g]?.meaning ?? ""}`).join("; ")}`)
  L.push(`วาสนาสิบปี (${c.luck.forward ? "เดินหน้า" : "ถอยหลัง"} เริ่มอายุ ${c.luck.startAge}): ${c.luck.pillars.map(p => `${p.current ? "▶" : ""}อายุ ${p.startAge}–${p.startAge + 9} (${p.startYear}–${p.endYear}) ${p.ganZhi} ${p.thai}`).join("; ")}`)
  L.push(`ปีนี้ ${c.currentYear.ganZhi} ${c.currentYear.thai} ปี${c.currentYear.animal}: ${c.currentYear.relation} (เกิดปี${c.shengXiao})`)
  if (c.notes.length) L.push(`หมายเหตุ: ${c.notes.join("; ")}`)
  return L.join("\n")
}
