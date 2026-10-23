/** Quick sanity run: the README example (15 Sep 2024 08:30 Chiang Mai) and a no-time case. */
import { computeChart } from "./chart.js"
import { sevenNine } from "./seven.js"

const r = computeChart({ year: 2024, era: "CE", month: 9, day: 15, hour: 8, minute: 30, province: "เชียงใหม่", readingDate: "2026-10-23" })
console.log(r.summaryThai)
console.log("\nassert ascendant กันย์:", r.summary.ascendant?.sign === "กันย์" ? "OK" : "FAIL " + r.summary.ascendant?.sign)
console.log("assert sun สิงห์:", r.summary.planets[0].sign === "สิงห์" ? "OK" : "FAIL " + r.summary.planets[0].sign)
console.log("assert lunar ข13 ด10:", r.summary.birth.lunar === "ขึ้น 13 ค่ำ เดือน 10" ? "OK" : "FAIL " + r.summary.birth.lunar)

// silpakornaugur worked example: Thursday(5), lunar month 10 (→3), year มะแม (index 7 → 8 → 1)... their sample had year seed 3; use explicit seeds
const s = sevenNine({ astrologicalWeekday: 5, lunarMonth: 10, naksatIndex: 2, ageCompleted: 30 })
console.log("\n7ตัว9ฐาน ฐาน4:", s.bases[3].values.join(" "), "expected 11 14 17 13 16 5 8")
const ok = s.bases[3].values.join(" ") === "11 14 17 13 16 5 8"
console.log(ok ? "OK" : "FAIL")

const n = computeChart({ year: 2535, era: "BE", month: 3, day: 2, timeKnown: false, province: "ขอนแก่น" })
console.log("\nno-time case notes:", n.summary.notes)
console.log("no-time ascendant null:", n.summary.ascendant === null ? "OK" : "FAIL")
