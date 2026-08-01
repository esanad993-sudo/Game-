# GameForge Engine — Architecture Guide

A custom, performance-first game engine designed for **constrained devices** like
the Dell Chromebook 3310 (Intel Celeron N4020, 4 GB RAM shared with an Intel
UHD 600 iGPU, 11.6" @ 1366×768, ChromeOS).

Everything lives in `src/game/`. The engine is **standalone TypeScript** (no
React dependency in the core) and can run either inside the Next.js app or as a
self-contained offline page.

---

## The three layers

```
┌─────────────────────────────────────────────┐
│ LAYER 3  Visual Mode Editor (not built yet) │  teachers & students
│          builds ModeDefinition data          │  create modes w/o code
├─────────────────────────────────────────────┤
│ LAYER 2  Mode Runtime  (src/game/modes)      │  plays any ModeDefinition
│          registry · interpreter · validation │
├─────────────────────────────────────────────┤
│ LAYER 1  Engine Core  (src/game/core)        │  the "super optimized" part
│          loop · renderer · input · audio ·   │
│          pooling · adaptive quality          │
└─────────────────────────────────────────────┘
```

### Layer 1 — Engine Core (`src/game/core/`)

| File | What it does |
|------|--------------|
| `engine.ts` | Fixed-timestep loop (60 Hz), accumulator, **adaptive-quality governor** (auto-lowers internal resolution when frame rate dips, restores when stable), DPR cap. |
| `renderer.ts` | **Batched WebGL2** renderer with automatic **Canvas 2D fallback**. Both draw from one texture atlas, so game code is renderer-agnostic. |
| `atlas.ts` | Builds a single sprite + bitmap-font atlas **procedurally at startup** — no image files, no network, ~offline. |
| `input.ts` | Unified keyboard + pointer/touch, headless-safe, programmatic API for tests. |
| `audio.ts` | Tiny WebAudio synth — no audio files, synthesized SFX only. |
| `pool.ts` | Object pooling so the render loop produces ~zero garbage (critical on 4 GB). |
| `math.ts` | Allocation-free helpers (damp, lerp, clamp, rand, wrap). |

**Performance guarantees on the 3310:**
- One texture, one draw call per batch → low CPU on a 2-core CPU.
- Fixed timestep → deterministic, no physics tunneling.
- DPR capped + adaptive resolution → the UHD 600 only fills what it can.
- Zero allocation in the hot loop via pooling.

### Layer 2 — Mode Runtime (`src/game/modes/`)

A **game mode is data** (a `ModeDefinition`), not code. The runtime interprets
it. This is what makes "teachers and students create game modes" possible.

- `types.ts` — `ModeDefinition`, `SkeletonMeta`, `SettingSpec`, `ModeHooks`, `GameResult`.
- `runtime.ts` — skeleton registry, `createModeDefinition()`, `validateModeDefinition()`, `buildModeModule()`.
- `modes/racer/racer.ts` — the first **code-defined skeleton** ("Racer", a lane-driving quiz).
- `modes/racer/visual.ts` — three **data-defined** example modes built on the Racer skeleton (this is exactly the shape a visual editor produces).

The runtime exposes everything the future **Layer 3 visual editor** needs:
`getAllSkeletons()` (for the editor's form fields), `createModeDefinition()` and
`validateModeDefinition()` (to build & check before saving).

### Layer 3 — Visual Mode Editor (next step)

Not built yet. When built, it should:
1. Call `getAllSkeletons()` to list available game genres.
2. For the chosen skeleton, render a form from its `SkeletonMeta.settings`
   (sliders, toggles, selects) + visuals + scoring + game-over rules.
3. Produce a `ModeDefinition` via `createModeDefinition(...)`.
4. Save it (e.g. a `GameMode` row in Prisma) and validate with `validateModeDefinition()`.
5. Play it with `buildModeModule(def, questions, hooks)`.

---

## How to add a NEW game mode

There are two ways, matching "both: visual for basics + code for advanced":

### Option A — Data-only (no code, what teachers/students do)
Pick an existing skeleton and tune its settings/visuals/scoring/game-over:

```ts
import { createModeDefinition } from '@/game/modes/runtime'

const myMode = createModeDefinition('racer', {
  id: 'my_racer',
  name: 'Slow-Mo Review',
  settings: { lanes: 3, speed: 150, maxSpeed: 300, obstacleRate: 0.5, questionInterval: 9 },
  visuals: { bgTop: '#86efac', bgBottom: '#166534', accent: '#22c55e', road: '#1e293b' },
  gameOver: { type: 'distance', value: 1000 },
})
```
Then play it: `buildModeModule(myMode, questions, hooks)`.

### Option B — A brand-new code skeleton (a new game genre)
1. Create `src/game/modes/<genre>/<genre>.ts` that exports a `Skeleton` (a
   `meta` describing tunable settings + a `create()` returning an `EngineModule`).
2. Register it: `registerSkeleton(mySkeleton)`.
3. Now it appears in `getAllSkeletons()` and the visual editor automatically.

A skeleton's `create()` must return an object implementing `EngineModule`:
`update(dt, input, ctx)`, `render(renderer, ctx)`, `resize(w, h)`, optional
`onStart()`. Use the built-in `Pool`, `Renderer` primitives (`drawSprite`,
`drawRect`, `drawText`, `drawGradientRect`), `Input`, and `Audio`.

---

## How to run things

```bash
npm run build:demo   # builds public/demo-game.html (single offline file, ~21 kB)
npm test             # headless engine + mode tests (no browser needed)
```

- **Standalone demo:** open `public/demo-game.html` (or `/demo-game.html` via the
  running server). Pick a mode, race, answer questions.
- **In the app:** the page `/play/racer` mounts the engine via the React
  component `src/game/integrations/GameCanvas.tsx`. React only renders overlays;
  the game loop never touches React (that's what keeps it smooth on a Chromebook).

---

## Known limits / next steps

- Only the **Racer** skeleton exists so far. Add more genres (platformer, maze,
  memory, typing) as code skeletons — each unlocks new data-defined modes for free.
- The **visual mode editor** (Layer 3) is the natural next milestone.
- **Live multiplayer** isn't in the engine yet (the old app has a rooms API); a
  sync layer (e.g. a tiny authoritative server that broadcasts game state) would
  be the next big feature for classroom "live game."
- The engine is browser-tested via the bundled demo; add a browser test harness
  (e.g. Playwright) if you want automated E2E coverage.
