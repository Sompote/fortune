/**
 * เลข 7 ตัว 9 ฐาน (seven numbers, nine bases).
 *
 * Rules implemented (the scheme shared by 7dara.blogspot.com, meemodel.com and
 * silpakornaugur.blogspot.com; schools differ in bases 8–9 and in the age row,
 * so every convention is stated in `conventions`):
 *
 *  columns  อัตตะ หินะ ธนัง ปิตา มาตา โภคา มัชฌิมา
 *  ฐาน 1  วัน      starts at the astrological weekday (1 = อาทิตย์ … 7 = เสาร์,
 *                  day changes at 06:00) and counts up cyclically 1..7
 *  ฐาน 2  เดือน    starts at the Thai lunar month reduced to 1..7 (8→1 … 12→5)
 *  ฐาน 3  ปี       starts at the นักษัตร year number reduced to 1..7 (ชวด = 1)
 *  ฐาน 4  รวม      column sums of ฐาน 1–3, NOT reduced (this is the main row)
 *  ฐาน 5           ฐาน 4 reduced mod 7 (7 stays 7)
 *  ฐาน 6           ฐาน 5 × 2, reduced
 *  ฐาน 7           ฐาน 6 × 2, reduced
 *  ฐาน 8           starts at ฐาน 5 column 1, then follows the cycle 1 6 4 2 7 5 3
 *  ฐาน 9           (ฐาน 5 col 7 + ฐาน 8 col 7) reduced, then the reverse cycle 3 5 7 2 4 6 1
 *
 *  Age pointer     อายุย่าง (completed years + 1) walks the 21 cells of ฐาน 1–3
 *                  one cell per year; the cell it lands on is ดาวจรประจำปี.
 */

export const SEVEN_COLUMNS = ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"] as const
export const SEVEN_COLUMN_MEANINGS: Record<(typeof SEVEN_COLUMNS)[number], string> = {
  "อัตตะ": "ตัวตน บุคลิก ความคิด",
  "หินะ": "อุปสรรค ความเสื่อม ความทุกข์",
  "ธนัง": "ทรัพย์สิน การเงิน รายได้",
  "ปิตา": "บิดา ผู้ใหญ่ เจ้านาย อำนาจ",
  "มาตา": "มารดา ผู้อุปการะ ที่อยู่อาศัย",
  "โภคา": "โภคทรัพย์ ความสุขสบาย การใช้จ่าย",
  "มัชฌิมา": "ทางสายกลาง สิ่งที่ยึดถือ ชีวิตช่วงหลัง",
}
export const SEVEN_PLANETS: Record<number, { name: string; keyword: string }> = {
  1: { name: "อาทิตย์", keyword: "ผู้นำ อำนาจ เกียรติ ความร้อนแรง" },
  2: { name: "จันทร์", keyword: "อารมณ์ ความอ่อนโยน จินตนาการ ครอบครัว" },
  3: { name: "อังคาร", keyword: "ความกล้า พลัง ความขัดแย้ง อุบัติเหตุ" },
  4: { name: "พุธ", keyword: "การสื่อสาร ปัญญา การค้า ความคล่องแคล่ว" },
  5: { name: "พฤหัสบดี", keyword: "ความรู้ คุณธรรม โชค ผู้ใหญ่อุปถัมภ์" },
  6: { name: "ศุกร์", keyword: "ความรัก ศิลปะ ความสุข ทรัพย์" },
  7: { name: "เสาร์", keyword: "ความอดทน ภาระ ความล่าช้า ความทุกข์" },
}
export const NAKSAT = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"] as const
export const WEEKDAYS = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const

export interface SevenNineInput {
  /** 1 = Sunday … 7 = Saturday, already shifted for the 06:00 day boundary. */
  astrologicalWeekday: number
  /** Thai lunar month 1..12. */
  lunarMonth: number
  /** Zero-based นักษัตร index, ชวด = 0. */
  naksatIndex: number
  /** Completed years at the reading date. */
  ageCompleted: number
}

export interface SevenNineResult {
  columns: readonly string[]
  columnMeanings: typeof SEVEN_COLUMN_MEANINGS
  bases: { name: string; values: number[] }[]
  /** ฐาน 4 and ฐาน 5 pairs per column: the main interpretation row. */
  mainRow: { column: string; sum: number; reduced: number; planet: string; meaning: string }[]
  age: { completed: number; yang: number; row: number; rowName: string; column: string; value: number; planet: string }
  seeds: { weekday: number; weekdayName: string; lunarMonth: number; monthSeed: number; naksat: string; yearSeed: number }
  conventions: string[]
}

const reduce7 = (n: number): number => {
  let v = n
  while (v > 7) v -= 7
  return v
}
const cycleRow = (start: number): number[] => Array.from({ length: 7 }, (_, i) => reduce7(start + i))

export function sevenNine(input: SevenNineInput): SevenNineResult {
  const { astrologicalWeekday: wd, lunarMonth, naksatIndex, ageCompleted } = input
  if (wd < 1 || wd > 7) throw new RangeError("astrologicalWeekday must be 1..7")
  if (lunarMonth < 1 || lunarMonth > 12) throw new RangeError("lunarMonth must be 1..12")
  if (naksatIndex < 0 || naksatIndex > 11) throw new RangeError("naksatIndex must be 0..11")

  const monthSeed = reduce7(lunarMonth)
  const yearSeed = reduce7(naksatIndex + 1)
  const b1 = cycleRow(wd)
  const b2 = cycleRow(monthSeed)
  const b3 = cycleRow(yearSeed)
  const b4 = b1.map((v, i) => v + b2[i] + b3[i])
  const b5 = b4.map(reduce7)
  const b6 = b5.map(v => reduce7(v * 2))
  const b7 = b6.map(v => reduce7(v * 2))
  const cycle = [1, 6, 4, 2, 7, 5, 3]
  const startIdx = cycle.indexOf(b5[0])
  const b8 = Array.from({ length: 7 }, (_, i) => cycle[(startIdx + i) % 7])
  const rev = [...cycle].reverse()
  const b9seed = reduce7(b5[6] + b8[6])
  const revIdx = rev.indexOf(b9seed)
  const b9 = Array.from({ length: 7 }, (_, i) => rev[(revIdx + i) % 7])

  const ageYang = ageCompleted + 1
  const pos = ((ageYang - 1) % 21 + 21) % 21
  const row = Math.floor(pos / 7)
  const col = pos % 7
  const rows = [b1, b2, b3]
  const rowNames = ["ฐานวัน", "ฐานเดือน", "ฐานปี"]

  return {
    columns: SEVEN_COLUMNS,
    columnMeanings: SEVEN_COLUMN_MEANINGS,
    bases: [
      { name: "ฐาน 1 วัน", values: b1 },
      { name: "ฐาน 2 เดือน", values: b2 },
      { name: "ฐาน 3 ปี", values: b3 },
      { name: "ฐาน 4 ผลรวม", values: b4 },
      { name: "ฐาน 5", values: b5 },
      { name: "ฐาน 6", values: b6 },
      { name: "ฐาน 7", values: b7 },
      { name: "ฐาน 8", values: b8 },
      { name: "ฐาน 9", values: b9 },
    ],
    mainRow: SEVEN_COLUMNS.map((c, i) => ({ column: c, sum: b4[i], reduced: b5[i], planet: SEVEN_PLANETS[b5[i]].name, meaning: SEVEN_COLUMN_MEANINGS[c] })),
    age: { completed: ageCompleted, yang: ageYang, row: row + 1, rowName: rowNames[row], column: SEVEN_COLUMNS[col], value: rows[row][col], planet: SEVEN_PLANETS[rows[row][col]].name },
    seeds: { weekday: wd, weekdayName: WEEKDAYS[wd], lunarMonth, monthSeed, naksat: NAKSAT[naksatIndex], yearSeed },
    conventions: [
      "วันเปลี่ยนเวลา 06:00 น. (เกิดก่อน 06:00 นับเป็นวันก่อนหน้า)",
      "เดือนใช้เดือนจันทรคติไทย เดือน 8–12 ลดเหลือ 1–5",
      "ปีนักษัตรเปลี่ยนที่ขึ้น 1 ค่ำ เดือน 5 (เว้นแต่ระบุเป็น 1 มกราคม)",
      "ฐาน 4 เป็นผลรวมดิบ ฐาน 5–7 ลดทอนด้วย 7 และคูณ 2 ตามลำดับ ฐาน 8–9 ใช้วงจร 1 6 4 2 7 5 3 ตามตำราพิสดาร",
      "อายุใช้อายุย่าง เดินทีละช่องใน 21 ช่องของฐาน 1–3",
    ],
  }
}

/** Thai zodiac animal for a Gregorian year, with optional lunar-month-5 boundary. */
export function naksatIndexFor(yearCe: number, lunarMonth: number | null, boundary: "lunar-month-5" | "january" = "lunar-month-5"): number {
  // 2020 CE = ชวด (Rat).
  let y = yearCe
  if (boundary === "lunar-month-5" && lunarMonth !== null && lunarMonth >= 1 && lunarMonth <= 4) y -= 1
  return (((y - 2020) % 12) + 12) % 12
}
