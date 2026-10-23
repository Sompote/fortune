/**
 * Western (tropical) natal chart via circular-natal-horoscope-js (pure JS,
 * astronomia ephemeris, timezone from the birthplace coordinates).
 */
import { createRequire } from "node:module"
import { getThaiAstrologyProvinceLocations } from "thai-astrology"
const require = createRequire(import.meta.url)
const { Origin, Horoscope } = require("circular-natal-horoscope-js")

export const SIGN_THAI: Record<string, string> = {
  Aries: "เมษ", Taurus: "พฤษภ", Gemini: "เมถุน", Cancer: "กรกฎ", Leo: "สิงห์", Virgo: "กันย์",
  Libra: "ตุลย์", Scorpio: "พิจิก", Sagittarius: "ธนู", Capricorn: "มังกร", Aquarius: "กุมภ์", Pisces: "มีน",
}
const ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire", Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air", Cancer: "water", Scorpio: "water", Pisces: "water",
}
const ASPECT_THAI: Record<string, string> = { conjunction: "กุม", opposition: "เล็ง", trine: "ตรีโกณ", square: "จตุโกณ", sextile: "โยค" }
const PLANET_THAI: Record<string, string> = { sun: "อาทิตย์", moon: "จันทร์", mercury: "พุธ", venus: "ศุกร์", mars: "อังคาร", jupiter: "พฤหัสบดี", saturn: "เสาร์", uranus: "ยูเรนัส", neptune: "เนปจูน", pluto: "พลูโต", northnode: "ราหู(โหนดเหนือ)", chiron: "ไครอน" }
const HOUSE_THAI = ["", "ตัวตน", "ทรัพย์", "สื่อสาร", "บ้าน", "ความรัก/สร้างสรรค์", "งานประจำ/สุขภาพ", "คู่ครอง", "การเปลี่ยนแปลง", "ปรัชญา/ต่างแดน", "อาชีพ", "เพื่อน/ความหวัง", "จิตใต้สำนึก"]

export interface WesternPlanet { key: string; label: string; labelThai: string; sign: string; signThai: string; degrees: number; minutes: number; house: number; houseThai: string; retrograde: boolean }
export interface WesternAspect { p1: string; p2: string; type: string; typeThai: string; orb: number }
export interface Western {
  sun: { sign: string; signThai: string; degrees: number }
  moon: { sign: string; signThai: string; degrees: number }
  rising: { sign: string; signThai: string; degrees: number } | null
  midheaven: { sign: string; signThai: string } | null
  planets: WesternPlanet[]
  aspects: WesternAspect[]
  elements: { fire: number; earth: number; air: number; water: number }
  houseSystem: string
  timezone: string
}

export function provinceCoords(province: string): { latitude: number; longitude: number } {
  const row = getThaiAstrologyProvinceLocations().find(p => p.province === province) ?? getThaiAstrologyProvinceLocations().find(p => p.province === "กรุงเทพมหานคร")
  return { latitude: row?.latitude ?? 13.7563, longitude: row?.longitude ?? 100.5018 }
}

export function computeWestern(a: { yearCe: number; month: number; day: number; hour: number; minute: number; latitude: number; longitude: number; timeKnown: boolean }): Western {
  const origin = new Origin({ year: a.yearCe, month: a.month - 1, date: a.day, hour: a.hour, minute: a.minute, latitude: a.latitude, longitude: a.longitude })
  const h = new Horoscope({ origin, houseSystem: "placidus", zodiac: "tropical", aspectPoints: ["bodies", "points", "angles"], aspectWithPoints: ["bodies", "points", "angles"], aspectTypes: ["major"], customOrbs: {}, language: "en" })
  const keep = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"])
  const dm = (deg: number) => ({ degrees: Math.floor(deg % 30), minutes: Math.round(((deg % 30) % 1) * 60) })
  const planets: WesternPlanet[] = [...h.CelestialBodies.all, ...h.CelestialPoints.all]
    .filter((b: any) => keep.has(b.key) || b.key === "northnode")
    .map((b: any) => {
      const d = dm(b.ChartPosition.Ecliptic.DecimalDegrees)
      return { key: b.key, label: b.label, labelThai: PLANET_THAI[b.key] ?? b.label, sign: b.Sign.label, signThai: SIGN_THAI[b.Sign.label] ?? b.Sign.label, degrees: d.degrees, minutes: d.minutes, house: b.House?.id ?? 0, houseThai: HOUSE_THAI[b.House?.id ?? 0] ?? "", retrograde: !!b.isRetrograde }
    })
  const el = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of planets) if (["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].includes(p.key)) el[ELEMENT[p.sign]] += 1
  if (a.timeKnown) el[ELEMENT[h.Ascendant.Sign.label]] += 1
  const aspects: WesternAspect[] = h.Aspects.all
    .filter((x: any) => keep.has(x.point1Key) && keep.has(x.point2Key) && x.orb <= 6)
    .map((x: any) => ({ p1: PLANET_THAI[x.point1Key] ?? x.point1Label, p2: PLANET_THAI[x.point2Key] ?? x.point2Label, type: x.aspectKey, typeThai: ASPECT_THAI[x.aspectKey] ?? x.aspectKey, orb: Math.round(x.orb * 10) / 10 }))
    .sort((p: WesternAspect, q: WesternAspect) => p.orb - q.orb)
  const sun = planets.find(p => p.key === "sun")!, moon = planets.find(p => p.key === "moon")!
  const asc = h.Ascendant, mc = h.Midheaven
  return {
    sun: { sign: sun.sign, signThai: sun.signThai, degrees: sun.degrees },
    moon: { sign: moon.sign, signThai: moon.signThai, degrees: moon.degrees },
    rising: a.timeKnown ? { sign: asc.Sign.label, signThai: SIGN_THAI[asc.Sign.label], degrees: Math.floor(asc.ChartPosition.Ecliptic.DecimalDegrees % 30) } : null,
    midheaven: a.timeKnown ? { sign: mc.Sign.label, signThai: SIGN_THAI[mc.Sign.label] } : null,
    planets, aspects, elements: el, houseSystem: a.timeKnown ? "placidus" : "none", timezone: String(origin.timezone ?? ""),
  }
}

export function renderWesternThai(w: Western, timeKnown: boolean): string {
  const L: string[] = ["## โหราศาสตร์สากล (Tropical, เรือนแบบ Placidus)"]
  L.push(`Sun ราศี${w.sun.signThai} (${w.sun.sign}) ${w.sun.degrees}° · Moon ราศี${w.moon.signThai} (${w.moon.sign}) ${w.moon.degrees}°${timeKnown && w.rising ? ` · Rising ราศี${w.rising.signThai} (${w.rising.sign}) ${w.rising.degrees}° · MC ${w.midheaven?.signThai}` : " · ไม่ทราบเวลาเกิด จึงไม่มี Rising และเรือน"}`)
  L.push(`สมดุลธาตุ (7 ดาวหลัก${timeKnown ? "+Rising" : ""}): ไฟ ${w.elements.fire} ดิน ${w.elements.earth} ลม ${w.elements.air} น้ำ ${w.elements.water}`)
  for (const p of w.planets) L.push(`- ${p.label} (${p.labelThai}) ราศี${p.signThai} ${p.degrees}°${p.minutes}'${timeKnown ? ` เรือน ${p.house} (${p.houseThai})` : ""}${p.retrograde ? " ถอยหลัง" : ""}`)
  if (w.aspects.length) L.push(`มุมสัมพันธ์ (orb ≤ 6°, แน่นสุดก่อน): ${w.aspects.slice(0, 12).map(a => `${a.p1} ${a.typeThai} ${a.p2} (${a.orb}°)`).join("; ")}`)
  L.push(`หมายเหตุ: ราศีสากล (สายนะ) ต่างจากราศีไทย (นิรายนะ) ประมาณ 24° ดาวดวงเดียวกันจึงอาจอยู่คนละราศีในสองระบบ`)
  return L.join("\n")
}
