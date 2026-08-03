# GameForge

> A classroom-friendly quiz game platform **with a visual game builder** — drag devices onto a canvas, wire them together, and play. No code required, with a code escape hatch coming in Phase 3.

Built with **Next.js 16**, **Prisma**, **NextAuth**, **Tailwind CSS 4**, **shadcn/ui**, and a custom **device-graph runtime**.

---

## What's new in v0.4 (Phase 1)

- **Visual editor** at `/editor` — drag devices from a palette onto a canvas, click output ports then input ports to draw wires, edit device properties in an inspector.
- **Play mode** at `/play/[projectId]` — loads a saved project, runs the SceneRuntime in the browser, and renders Button/Counter/SpawnPoint devices as live UI elements.
- **Project library** at `/projects` — list, open, edit, and delete saved projects (stored in `localStorage` for now; Prisma persistence comes in Phase 1.5).
- Runtime + 5 built-in devices from Phase 0 still work end-to-end (`bun run test:runtime`).

## Quick start

```bash
bun install
cp .env.example .env       # set NEXTAUTH_SECRET to a 32+ char random string
bun run db:generate
bun run db:push
bun run dev                # http://localhost:3000
```

Then open:
- **http://localhost:3000/editor** — visual editor
- **http://localhost:3000/projects** — saved projects
- **http://localhost:3000** — original GameForge quiz platform

To verify the runtime without a browser:

```bash
bun run test:runtime       # 4/4 assertions should pass
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Editor UI (/editor) + Play UI (/play/[id])          │
├─────────────────────────────────────────────────────┤
│ src/components/editor/  Toolbar, Palette, Canvas,    │
│                         DeviceNode, WireLayer,       │
│                         Inspector                    │
├─────────────────────────────────────────────────────┤
│ src/lib/editor/         Zustand store + storage      │
├─────────────────────────────────────────────────────┤
│ src/lib/runtime/        Project schema (Zod),        │
│                         World, EventBus, Registry,  │
│                         SceneRuntime, 5 devices      │
├─────────────────────────────────────────────────────┤
│ Existing Next.js platform: auth, rooms, shop, etc.  │
└─────────────────────────────────────────────────────┘
```

### Device graph model

A game is a graph of **devices** connected by **wires**.

- A **device** is a typed node with input ports, output ports, and configurable properties.
- A **wire** carries events from one device's output port to another's input port.
- A **script** (Phase 3) is a user-written device — same API, written in TypeScript instead of assembled visually.

The runtime is **synchronous** by design: when device A emits, all listeners run to completion before A's `emit()` returns. Async behaviors layer on top via `ctx.schedule()`.

### Built-in devices

| Category | Devices |
|----------|---------|
| Triggers | Button |
| Logic | Counter |
| Actions | GiveCoins, ShowMessage |
| World | SpawnPoint |

Each device is a `DeviceDefinition<I, O>` with Zod-typed input/output port schemas — the editor uses these to render the port list and validate connections.

### Code-mode preview (Phase 3)

The same `DeviceContext` that built-ins use will be exposed to user-written scripts:

```ts
import { defineDevice } from '@gameforge/runtime'

export default defineDevice({
  name: 'Bounty Hunter',
  inputs:  { onTag:    { data: { taggerId: 'string', targetId: 'string' } } },
  outputs: { onBounty: { data: { coins: 'number' } } },
  state:   { totalBounties: 0 },

  setup({ on, emit, world, state }) {
    on('onTag', (e) => {
      world.getEntity(e.data.taggerId).coins += 10
      state.totalBounties++
      emit('onBounty', { coins: 10 })
    })
  },
})
```

User code will run inside a **QuickJS-WASM sandbox** — no `window`/`document`/`fetch` access, time-sliced so an infinite loop freezes the game, not the browser tab.

## Project structure

```
prisma/
  schema.prisma              # 16 models: User, QuestionSet, GameRoom, Homework, ...
src/
  app/
    page.tsx                 # Original GameForge quiz platform
    editor/page.tsx          # Visual game builder
    play/[projectId]/page.tsx  # Play any saved project
    projects/page.tsx        # Browse / open / delete saved projects
    api/                     # REST routes (auth, sets, rooms, homework, shop, ...)
  components/
    ui/                      # shadcn/ui primitives
    editor/                  # Editor components (Toolbar, Palette, Canvas, ...)
  lib/
    auth.ts                  # NextAuth config (Credentials + bcrypt)
    db.ts                    # Prisma client singleton
    engine/                  # Legacy QuizEngine (game mode registry)
    editor/                  # Zustand store + localStorage + geometry
    runtime/                 # Device-graph runtime (Phase 0+)
public/
  game.html                  # Standalone TurboRush racing mini-game
scripts/
  test-runtime.ts            # End-to-end runtime test
```

## Tech stack

| Layer       | Choice                                   |
| ----------- | ---------------------------------------- |
| Framework   | Next.js 16 (App Router, standalone build)|
| Language    | TypeScript 5                             |
| Database    | SQLite (dev) / PostgreSQL (prod-ready)   |
| ORM         | Prisma 6                                 |
| Auth        | NextAuth v4 + bcryptjs                   |
| UI          | Tailwind CSS 4 + shadcn/ui + Radix       |
| Animations  | Framer Motion                            |
| State       | Zustand + TanStack Query                 |

## Configuration

| Variable                | Required | Description                                         |
| ----------------------- | -------- | --------------------------------------------------- |
| `DATABASE_URL`          | yes      | Prisma connection string (SQLite file or Postgres). |
| `NEXTAUTH_SECRET`       | yes      | 32+ char random string used to sign JWTs.           |
| `NEXTAUTH_URL`          | yes      | Public URL of the deployment.                       |
| `GOOGLE_CLIENT_ID`      | no       | Enable Google sign-in (leave blank to disable).     |
| `GOOGLE_CLIENT_SECRET`  | no       | Enable Google sign-in (leave blank to disable).     |

## Available scripts

| Script              | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `bun run dev`       | Start dev server on port 3000.                     |
| `bun run build`     | Production build (standalone output).              |
| `bun run start`     | Run the standalone production server.              |
| `bun run lint`      | ESLint check.                                      |
| `bun run typecheck` | TypeScript check without emitting files.            |
| `bun run test:runtime` | End-to-end test for the device-graph runtime.    |
| `bun run db:push`   | Push schema to DB (dev only).                      |
| `bun run db:migrate`| Create + apply a Prisma migration.                 |

## Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 0 — Foundation (runtime, devices, test scene) | 1–2 wk | ✅ done |
| 1 — Visual editor (canvas, inspector, wires, save/load, play) | 2–3 wk | ✅ done |
| 1.5 — Prisma `Project` model + sharing + asset library | 1 wk | pending |
| 2 — Real-time multiplayer (`/play/[id]` over WebSocket) | 1 wk | pending |
| 3 — Code mode (Monaco + QuickJS-WASM sandbox) | 2–3 wk | pending |
| 4 — Polish (more devices, marketplace, leaderboards) | ongoing | pending |

## License

MIT — see [LICENSE](./LICENSE).
