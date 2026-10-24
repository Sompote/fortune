# MorDoo — หมอดู AI โหราศาสตร์ไทย (Thai-astrology-native chatbot)

A web chatbot that interviews the user, casts a real Thai Suriyayatra natal chart
(ผูกดวง, ลัคนา, ภพ, เจ้าเรือน, ทักษา, วันจันทรคติ, เลข 7 ตัว 9 ฐาน) plus a Western tropical chart
(Sun/Moon/Rising, Placidus houses, major aspects, element balance) and a Chinese BaZi chart
(four pillars, day master, five elements, ten gods, ten-year luck pillars, current-year clash) with deterministic code,
remembers the user between sessions, and lets an LLM (via OpenRouter) interpret only
what the engine computed. Built on the TigrimOS agent harness.

```
web (React/Vite)  ──HTTP──▶  engine/server.ts (Express BFF)  ──HTTP──▶  TigrimOS headless (agent loop, OpenRouter)
                                   │                                          │ MCP stdio
                                   └─ /api/chart (direct)                     └─▶ engine/mcp.ts  (compute_chart, seven_nine, recall_user, remember_user, log_reading, log_feedback)
```

## Parts

| Folder | What |
|---|---|
| `engine/` | Node + TypeScript. `thai-astrology` (MIT, Suriyayatra) wrapper, `circular-natal-horoscope-js` (Western, astronomia ephemeris, timezone from birthplace), `lunar-javascript` (BaZi, solar terms, luck pillars), my เลข 7 ตัว 9 ฐาน module, JSON user memory, MCP stdio server, HTTP backend. |
| `harness/` | Self-contained TigrimOS data dir: `data/agent_loops/mordoo.yaml` (persona, interview flow, reading rules, safety), `setup.sh` writes `data/settings.json` from `.env`, `run.sh` starts the headless server. Your global TigrimOS data is not touched. |
| `web/` | React chat UI: intake form, ราศีจักร wheel, ทักษา chips, 7 ตัว 9 ฐาน table, memory digest, chat with progress, and the animated ไพ่ยิปซี table (`TarotTable.tsx`, procedural SVG card art in `TarotCardArt.tsx`). |
| `market_gap_report.md` | The market research that motivated this build. |

## Run (dev)

```bash
# 1. harness config
cp harness/.env.example harness/.env     # set OPENROUTER_API_KEY, ACCESS_TOKEN, MORDOO_MODEL
# 2. everything
./start.sh                                # harness :3001, backend :8787, web :5173
open http://127.0.0.1:5173
./stop.sh
```

Manual: `cd engine && npm run build && node dist/selftest.js` checks the engine against the
library's documented example (ลัคนา กันย์, อาทิตย์ สิงห์, ขึ้น 13 ค่ำ เดือน 10 for 15 Sep 2024 08:30
Chiang Mai) and a published เลข 7 ตัว 9 ฐาน worked example.

Production: `cd web && npm run build`, then `node engine/dist/server.js` serves `web/dist` on :8790.

## ไพ่ยิปซี (tarot, optional)

The engine owns a 78-card Rider–Waite deck with Thai names and short upright/reversed meanings
(`engine/src/tarot.ts`). A draw is a Fisher–Yates shuffle with `crypto.randomInt`, 30 % of cards
reversed, in one of three spreads: one card, อดีต–ปัจจุบัน–อนาคต, or a five-card cross
(สถานการณ์ อุปสรรค รากเหง้า คำแนะนำ ผลลัพธ์). The web app opens a full-page table (dark, smoke,
candle flicker, turning sigil ring, shuffle and deal animations, 3-D flip per card) and calls
`POST /api/tarot/draw`, so the cards the user sees are the cards the model reads. Each draw is
stored in the user's memory (`tarot`, last 10). The backend puts the latest draw (under 24 h old)
into the system context block and the `mordoo` prompt adds a **ไพ่ยิปซี:** section between ดวงจีน
and สรุปรวม, using only the engine's meanings. Card artwork: 78 faces plus the back were generated with Codex image generation
(`web/scripts/gen_tarot_art.sh`, one Rider–Waite scene prompt per card, consistent engraved indigo-and-gold
style, no text in the image) and shrunk to 480×720 WebP with `web/scripts/shrink_tarot_art.sh`
(`web/public/tarot/<id>.webp`, about 9.6 MB for the deck; the 1024×1536 PNGs stay in `web/public/tarot/raw/`,
which is git-ignored). The React card overlays the Thai name band and rank badge, and falls back to the
procedural SVG face if an image is missing. `/tarot/gallery.html` shows the whole deck; `/#tarot` opens the
table, `/#tarot-demo` opens it with a sample spread. The option lives in the side panel and on the table
("ใช้ไพ่ร่วมกับคำทำนายหลัก", stored in localStorage): when off, the request sends `useTarot: false`
and the prompt is told not to mention cards. The model can also draw in chat with the MCP tool
`draw_tarot`; the page picks the result up from memory and shows it in the side panel.

## Reasoning models (Kimi-k3 and similar)

`harness/setup.sh` writes `"llmExtraBody": {"reasoning": {"effort": "low"}}` into the generated
settings (override with `MORDOO_LLM_EXTRA_BODY` in `harness/.env`, `{}` disables it). This needs
the patched TigrimOS in the pondus workspace (`toolbox.rs::llm_call` merges `settings.llmExtraBody`
into the OpenAI-compatible request body; rebuild with `cargo build --release -p tigrimos --bin tigrimos`).
On Kimi-k3 it cut a full reading from 124 s to 11–26 s. A reasoning model also needs a high
`max_tokens` in the profile (6000), otherwise the hidden reasoning eats the cap and the answer is empty.

## How the interview and memory work

Every message the web app sends is prefixed `[user_id=…]` (a random id kept in the browser's
localStorage). The `mordoo` profile tells the model to call `recall_user` first, interview one
question at a time until it has name, date, time (or "unknown"), province and topic, store each
fact with `remember_user`, call `compute_chart` before any reading, log the reading with
`log_reading`, and record outcomes with `log_feedback` when the user reports back. Memory lives
in `engine/data/users/<id>.json`.

## Calculation conventions (state them to users when asked)

- Planets and ลัคนา: classical Suriyayatra, whole-sign houses, ascendant from the province's
  daily sunrise (CE 1900–2100), Bangkok +06:42:04 planetary frame. See the `thai-astrology` README.
- ทักษา: weekday changes at 06:00; Wednesday night is not swapped to ราหู in this engine.
- เลข 7 ตัว 9 ฐาน: Thai lunar month (8–12 reduced to 1–5), นักษัตร year changing at ขึ้น 1 ค่ำ เดือน 5,
  ฐาน 4 raw sums, ฐาน 5–7 by mod-7 and ×2, ฐาน 8–9 by the 1 6 4 2 7 5 3 cycle (ตำราพิสดาร); schools differ.
- Western: tropical zodiac, Placidus houses, aspects with orb ≤ 6°. Sidereal (Thai) and tropical signs differ by about 24°, so the same planet often sits in different signs; the prompt tells the model to explain this once and to use Thai as the primary structure, Western for Sun/Moon/Rising personality, Venus/Mars relationship style and aspects. The Thai ลัคนา uses classical rising durations, so it can differ from the Western Rising by several degrees beyond the ayanamsa.
- Chinese BaZi: pillars from solar terms (not the lunar month), local clock time without true-solar-time correction, day-master strength by a simple count heuristic (same + resource + season vs output + wealth + power), luck pillars direction from gender (defaults to male when unknown and says so). The prompt makes the model lead with points where at least two systems agree and state disagreements openly.
- Unknown birth time: chart cast at 12:00, ลัคนา and ภพ suppressed, model told to use signs, ทักษา
  and 7 ตัว 9 ฐาน only.

## Safety rules in the prompt

Readings are framed as tendencies, never guarantees. No medical, legal or investment specifics,
no amulet sales or paid rituals, no ID/bank data, and a mental-health hotline (1323) if the user
shows distress. Birth data is personal data under PDPA: keep `engine/data/` out of git (it is).
