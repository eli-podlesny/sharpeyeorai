# SharpEyeOrAI — project rules for Claude Code

Read this file fully at the start of every session. It is the single source of truth for how this project is built. If a brief in `docs/briefs/` conflicts with this file, ask before proceeding.

## What we're building

A browser game about visual perception. The player is a test subject in a dark, gritty facility. A wall-mounted sci-fi screen sits behind a blast door; the door opens and the player completes 12 tests, each asking them to click the **optical center** of a shape. The environment degrades as the test goes on (tints, alerts, distortion). At the end the player gets a score out of 10,000 and a verdict on whether they see like a human or like a machine.

Desktop only. Mobile is not supported (a "desktop only" screen comes later). Free hosting only: GitHub + Vercel Hobby. No paid services.

The owner is a designer who is new to Claude Code. Explain what you are about to do in plain language before doing it, and keep changes small and reviewable.

## Current version

**v0.1 — infrastructure and skeleton.** See `docs/briefs/` for the active brief.

| Version | Scope                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| v0.1    | Tooling, repo, deploy pipeline, stage scaling, placeholder layer stack                                                                     |
| v0.2    | Core skeleton: state machine, scenes, event bus, round config, input mapping, debug panel                                                  |
| v1.0    | Playable greybox: all 12 rounds, scoring model, plain results screen                                                                       |
| v1.1    | Visual layer: real assets, background motion, frame and doors, cursor, tooltips, parallax, transitions, score screen. First public release |
| v1.2    | Feedback and polish: animations, loading screen, About popup, accessibility                                                                |
| v1.3    | Sound: audio engine, mixer, mute, sounds mapped to existing events                                                                         |
| v1.4    | Cinematics: narrated intro, ending sequence                                                                                                |
| v2.0    | Global leaderboard (Supabase or Cloudflare, decided then)                                                                                  |

Never build ahead of the current version. If something from a later version is needed as a hook (for example an event the sound system will listen to later), add the hook only.

## Tech stack

- Vite + TypeScript (`strict: true`, no `any`). No UI framework.
- DOM + CSS for everything visual. Images are layered `<img>`/`<div>` elements. No canvas/WebGL unless a brief asks for it.
- Plain CSS with custom properties. Global tokens live in `src/styles/tokens.css`. No Tailwind.
- Vitest for tests. ESLint + Prettier for code style.
- Fonts self-hosted through Fontsource (EU/GDPR reason: no Google Fonts CDN): Turret Road (Medium, ExtraBold), Kode Mono (Regular, Bold).
- Allowed later, when a brief says so: GSAP (v1.2 timelines), Howler.js or raw Web Audio (v1.3).
- Do not add any other dependency without asking first.
- Package manager: npm. Node: current LTS.

## Commands

```
npm run dev        # local dev server
npm run build      # type-check + production build
npm run preview    # serve the production build
npm run test       # vitest
npm run lint       # eslint
npm run format     # prettier --write
```

## Folder structure

```
src/
  main.ts            entry
  core/              state machine, scene manager, event bus, rng, input, stage scaling
  config/            game.config.ts, rounds.config.ts, layout.config.ts
  rounds/            round logic (shape geometry, target computation)
  scoring/           pure scoring functions + tests
  scenes/            intro, ready, loading, round, calculating, score
  layers/            background, frame, doors, screen, hud
  ui/                tooltips, popups, buttons
  fx/                effects (tint, distortion, shake) — v1.1+
  audio/             v1.3 only
  styles/            tokens.css, base.css
public/assets/       optimized runtime images (webp) — added in v1.1
assets-src/          owner's raw exports. Never modify or commit large files here without asking
docs/briefs/         one brief per task, written by the owner
```

## The stage

- Design size is **1440 × 900**. All layout values in config are in these design pixels.
- The stage scales uniformly to fit the window (contain), centered. Scaling works through **rem**: everything on the stage is sized in rem (1rem = 16 design px, converted with `rem()` in `src/core/units.ts`), and `src/core/stage.ts` sets the root font size to `16px × scale`.
- Minimum supported window width: **1024px**. Below that the stage stops shrinking and the edges crop. The page never scrolls in any direction.
- The background layer is centered on the window (not the stage), at least 110vw × 110vh, so it always bleeds past every edge and never shows a hard edge. The image uses `mix-blend-mode: multiply` over the `--color-room` token, so the room tint can change without editing the image.
- Converting a mouse event to stage coordinates must go through one function in `src/core/` so that scaling, and later shake or distortion, is handled in one place.
- A version label (from `package.json`, injected at build time) sits bottom-center, as in the Figma frames.

## Layer stack (bottom to top)

Each layer is its own module with a stable name. Assets are **placeholders** until v1.1; the structure must already match the final design so real art is a drop-in swap.

1. `background` — room illustration, about 110% of stage width. Will be moved (parallax), scaled, rotated and distorted in later versions.
2. `vignette` — soft darkening at the edges.
3. `frame-glow` — blurred copy of the frame, behind it.
4. `screen` — the panel surface: base color + texture overlay. Game content renders inside `screen-content`.
5. `doors` — left and right blast-door halves, clipped to the screen viewport. Slide apart to open.
6. `frame` — the metal frame, on top of the screen edges.
7. `hud` — logo (top center), version label, About link, and anything outside the frame.

Placeholder rule: flat blocks in palette colors with their layer name printed small inside, at the sizes and positions in `src/config/layout.config.ts`. Current values (from Figma, will change):

| Layer           | Size        | Position (design px)                               |
| --------------- | ----------- | -------------------------------------------------- |
| background      | 1976 × 1078 | art size; shown min 110vw × 110vh, window-centered |
| frame           | 1165 × 841  | centered horizontally, top 44                      |
| screen viewport | 1032 × 682  | centered, top 106                                  |

## Design tokens (temporary)

Colors and type are not final. Always use tokens, never hard-coded values, so the owner can retune everything in one file.

- Ink `#111`, Graphite `#333`, Ash `#777`, Concrete `#BEB8AD`, Bone `#E6E1D7`, Paper `#F6F4EE`
- Hazard orange `#EE4D00`: only for interactive elements, click targets, system alerts, the score number, and the Drama-round tint
- Display/UI font: Turret Road. Objective text: Kode Mono.

## Gameplay rules (current decisions)

- Flow: Intro → Ready (closed door + Start button) → doors open → Loading ("Initializing") → Test 01…12 → Calculating → Score.
- A `startMode` config flag: `"button"` (current) or `"auto"` (possible later). Build for both.
- For now **every round uses the same shape: a 200 × 200 rectangle**. The round config must still support different shapes, rotations, positions and effects later.
- One click per round. The click is final and the next round loads automatically.
- Round 1 ignores time in scoring. Every round has a configurable `timeWeight`.

## Scoring model

All scoring lives in `src/scoring/` as pure, tested functions. Every constant lives in config so it can be tuned without changing logic.

Each round has two reference points:

- **C, the computed center:** the mathematical centroid of the shape.
- **O, the optical center:** where a human perceives the center. For now O = C shifted upward by `opticalOffsetY` (a fraction of shape height, default 0.05, tunable per round).

For a click P in each round:

1. `dOptical = |P − O|` and `dComputed = |P − C|`.
2. **Accuracy** `a = clamp(1 − dOptical / falloffRadius, 0, 1) ^ curve`. `falloffRadius` defaults to 0.5 × shape's shorter side, `curve` defaults to 1.5.
3. **Speed** `s = clamp(1 − (latencyMs − graceMs) / (maxMs − graceMs), 0, 1)`.
4. Round quality `q = a × (1 − timeWeight + timeWeight × s)`. Penalties (timeouts, system errors) set `q = 0`.
5. **Total score** = `round(10000 × Σ q / roundCount)`. The maximum is exactly 10,000.

Scoring always uses distance to O. The C-vs-O comparison drives the verdict line only:

- **Lean** per round: project P onto the line from C to O. `t = ((P − C) · (O − C)) / |O − C|²`. t ≈ 0 means machine-like, t ≈ 1 means human-like. Clamp t to [−0.5, 1.5].
- Ignore rounds where `|O − C|` is below `minSeparationPx` (the lean is meaningless there).
- **Humanity index** = mean t over the valid rounds. Verdict persona = accuracy tier × humanity tier. Copy for the personas comes later.
- Note: with 200 × 200 squares the C–O separation is only about 10px, so the lean will be noisy until rounds use more varied shapes. That is expected in v1.0.

## Events (hooks for later versions)

Emit typed events through the event bus even before anything listens to them, for example `door.open.start`, `door.open.end`, `round.start`, `round.click`, `round.logged`, `alert.show`, `score.reveal`. Sound (v1.3) and effects attach to these. Keep the event list in `src/core/events.ts`.

## Working conventions

- **Plan before building:** for any brief, first summarize your plan and list open questions. Wait for the owner's go-ahead.
- **One brief = one branch** (`feat/<short-name>`). Small commits with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`).
- **Never push to `main`** without the owner saying so. The owner reviews on the Vercel preview link first.
- **No magic numbers.** Layout goes in `layout.config.ts`, gameplay in `game.config.ts` / `rounds.config.ts`, visuals in tokens.
- **Accessibility floor:** visible keyboard focus, `prefers-reduced-motion` respected, and no flashing faster than 3 Hz without a warning.
- **Owner's words:** when a brief says something should feel a certain way, ask about it rather than guessing.
- **After finishing a brief:** list what changed, how to check it, and anything left unresolved.

## Out of scope until their version

Mobile layout, leaderboard/database, sound playback, narrator/intro cinematic, final art, final copy, analytics.

## Decision log

- Desktop only; mobile never (only a "not supported" screen, later).
- Hosting: GitHub (public repo `sharpeyeorai`) + Vercel Hobby at `sharpeyeorai.vercel.app`.
- Visual direction: dark illustrated facility, sci-fi metal frame, blast door. Arm and CRT concept dropped.
- Score maximum 10,000, based on distance to the optical center. Computed-vs-optical lean drives the human/AI verdict.
- All rounds use a 200 × 200 rectangle until further notice.
- Start with a button; auto-start may replace it. Round 1 ignores time.
- Assets and colors are placeholders until the owner finalizes Figma.
- Frame and screen are centered horizontally on the stage (Figma is not pixel-perfect).
- Stage scales via rem (root font size), minimum window width 1024px, no page scroll.
- Background image is multiplied over a room-color token, sized in vw/vh (min 110%).
