export interface BirthForm {
  name: string
  day: number
  month: number
  year: number
  era: "BE" | "CE"
  timeKnown: boolean
  hour: number
  minute: number
  province: string
  topic: string
  gender: "male" | "female" | ""
}

export interface SevenNine {
  columns: string[]
  bases: { name: string; values: number[] }[]
  mainRow: { column: string; sum: number; reduced: number; planet: string; meaning: string }[]
  age: { completed: number; yang: number; rowName: string; column: string; value: number; planet: string }
  seeds: { weekdayName: string; lunarMonth: number; naksat: string }
}

export interface Western {
  sun: { sign: string; signThai: string; degrees: number }
  moon: { sign: string; signThai: string; degrees: number }
  rising: { sign: string; signThai: string; degrees: number } | null
  planets: { key: string; label: string; sign: string; signThai: string; degrees: number; house: number; retrograde: boolean }[]
  aspects: { p1: string; p2: string; typeThai: string; orb: number }[]
  elements: { fire: number; earth: number; air: number; water: number }
}

export interface Chinese {
  pillars: { name: string; ganZhi: string; stemThai: string; stemElement: string; animal: string; branchElement: string; godStem: string; godStemThai: string }[]
  dayMaster: { label: string }
  elements: Record<string, number>
  support: { strength: string }
  missing: string[]
  luck: { pillars: { startAge: number; startYear: number; ganZhi: string; current: boolean }[] }
  currentYear: { ganZhi: string; animal: string; relation: string }
  notes: string[]
}

export interface ChartSummary {
  birth: { dayLabel: string; weekdayCivil: string; weekdayAstro: string; lunar: string | null; naksat: string; timeKnown: boolean; province: string }
  ascendant: { sign: string; degrees: number; minutes: number; ruler: string; rulerHouse: number; tanuseth: string } | null
  planets: { name: string; number: number | null; sign: string; degrees: number; minutes: number; house: number; houseName: string; dignities: string[] }[]
  houses: { number: number; name: string; sign: string; ruler: string; rulerIn: number; occupants: string[] }[] | null
  taksa: Record<string, string>
  rasiChannels: string[]
  sevenNine: SevenNine | null
  western: Western | null
  chinese: Chinese | null
  notes: string[]
}

export interface ChartResult { summaryThai: string; summary: ChartSummary }

export type SpreadId = "one" | "three" | "five"
export interface TarotCard {
  id: string; name: string; nameThai: string; arcana: "major" | "minor"; number: number; suit?: "wands" | "cups" | "swords" | "pentacles"; glyph: string
  position: string; positionHint: string; reversed: boolean; meaning: string
}
export interface TarotDraw { id: string; date: string; spread: SpreadId; spreadName: string; question?: string; cards: TarotCard[]; summaryThai: string }

async function j<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as any).error || `HTTP ${res.status}`)
  return body as T
}
// Vite base ("/mordoo/" in prod) — the app is served under a subpath behind nginx.
const B = import.meta.env.BASE_URL.replace(/\/$/, "")
const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

export const api = {
  provinces: () => fetch(B + "/api/provinces").then(j<{ provinces: string[] }>),
  chart: (b: BirthForm) => post(B + "/api/chart", { year: b.year, era: b.era, month: b.month, day: b.day, hour: b.timeKnown ? b.hour : undefined, minute: b.timeKnown ? b.minute : undefined, timeKnown: b.timeKnown, province: b.province, gender: b.gender || undefined }).then(j<ChartResult>),
  remember: (userId: string, b: BirthForm) => post(B + "/api/tool/remember_user", { user_id: userId, name: b.name || undefined, gender: b.gender || undefined, birth: { year: b.year, era: b.era, month: b.month, day: b.day, hour: b.timeKnown ? b.hour : undefined, minute: b.timeKnown ? b.minute : undefined, timeKnown: b.timeKnown, province: b.province }, addConcern: { topic: b.topic, text: `อยากดูเรื่อง${b.topic}` } }).then(j<{ ok: boolean }>),
  forget: (id: string) => fetch(`${B}/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }).then(j<{ ok: boolean }>),
  user: (id: string) => fetch(`${B}/api/users/${encodeURIComponent(id)}`).then(j<{ known: boolean; digest?: string; memory?: { tarot?: TarotDraw[]; name?: string; nickname?: string; gender?: string; birth?: { year: number; era: "BE" | "CE"; month: number; day: number; hour?: number; minute?: number; timeKnown: boolean; province?: string } } }>),
  tarotDraw: (userId: string, spread: SpreadId, question?: string) => post(B + "/api/tarot/draw", { userId, spread, question: question || undefined }).then(j<TarotDraw>),
  start: (userId: string) => post(B + "/api/chat/start", { userId }).then(j<{ sessionId: string }>),
  send: (sessionId: string, userId: string, text: string, useTarot = true) => post(B + "/api/chat/send", { sessionId, userId, text, useTarot }).then(j<{ reply: string; error?: boolean }>),
  status: (sessionId: string) => fetch(`${B}/api/chat/status/${sessionId}`).then(j<{ tail: string[] }>),
  history: (sessionId: string) => fetch(`${B}/api/chat/history/${sessionId}`).then(j<{ messages: { role: string; content: string }[] }>),
  health: () => fetch(B + "/api/health").then(j<{ harness: string }>),
}
