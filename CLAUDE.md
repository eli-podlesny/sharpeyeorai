# SharpEyeOrAI — project rules for Claude Code

Read this file fully at the start of every session. It is the single source of truth for how this project is built. If a brief in `docs/briefs/` conflicts with this file, ask before proceeding.

## What we're building

A browser game about visual perception. The player is a test subject in a dark, gritty facility. A wall-mounted sci-fi screen sits behind a blast door; the door opens and the player completes 12 tests, each asking them to click the **optical center** of a shape. The environment degrades as the test goes on (tints, alerts, distortion). At the end the player gets a score out of 10,000 and a verdict on whether they see like a human or like a machine.

Desktop only. Mobile is not supported (a "desktop only" screen comes later). Free hosting only: GitHub + Vercel Hobby. No paid services.

The owner is a designer who is new to Claude Code. Explain what you are about to do in plain language before doing it, and keep changes small and reviewable.

## Current version

**v0.6 — moving, morphing and timed rounds.** See `docs/briefs/` for the active brief. (Releases are now numbered 0.x by brief; the roadmap table below is kept for scope reference.)

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
    shapes/          one pure generator per shape type + tests
  scoring/           pure scoring functions + tests
  scenes/            intro, ready, loading, round, ending, score (calculating: kept, out of the flow)
  layers/            background, frame, doors, screen, screen-hud, hud, darkness
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
4. `screen` — the panel surface: base color + texture overlay. Game content renders inside `screen-content`. The `screen-hud` (round counter, progress bar, timer) sits inside the screen above the content and below the doors, and stays visible from loading through the last round (hidden on the score screen).
5. `doors` — left and right blast-door halves, clipped to the screen viewport. Slide apart to open.
6. `frame` — the metal frame, on top of the screen edges.
7. `hud` — logo (top center), version label, About link, and anything outside the frame.

Above everything: `darkness`, a whole-window overlay for the end-of-game blackout (placeholder).

Placeholder rule: flat blocks in palette colors with their layer name printed small inside, at the sizes and positions in `src/config/layout.config.ts`. Current values (from Figma, will change):

| Layer           | Size        | Position (design px)                               |
| --------------- | ----------- | -------------------------------------------------- |
| background      | 1976 × 1078 | art size; shown min 110vw × 110vh, window-centered |
| frame           | 1158 × 772  | centered horizontally, top 80                      |
| screen viewport | 1046 × 676  | centered, top 128                                  |

## Design tokens (temporary)

Colors and type are not final. Always use tokens, never hard-coded values, so the owner can retune everything in one file.

- Ink `#111`, Graphite `#333`, Ash `#777`, Concrete `#BEB8AD`, Bone `#E6E1D7`, Paper `#F6F4EE`
- Hazard orange `#EE4D00`: only for interactive elements, click targets, system alerts, the score number, and the Drama-round tint
- Display/UI font: Turret Road. Objective text and the screen-HUD counter and timer: Kode Mono (HUD in Bold, via `--font-hud` / `--weight-hud`).

## Gameplay rules (current decisions)

- Flow: Intro → Ready (closed doors + Start button) → Loading ("Initializing" starts behind the doors, doors open onto it after `loadingStartBeforeDoorsMs`) → Objective intro → Test 01…12 → Ending (doors close, darkness for `endDarknessMs`) → Score (rendered behind the doors, which open onto it). The Calculating scene is kept but out of the flow.
- Before round 1, the objective intro (`gameConfig.objectiveIntro`, `layout.objectiveIntro`): "Objective:" (large) fades in at the center rising 16px and zooming 0.8 → 1 (400ms); the objective line follows below it (200ms delay, 200ms, rising 16px); hold 1200ms; then "Objective:" fades out moving down 16px while the objective line moves to its bottom place (400ms). The objective line lives in the screen HUD and stays there until it fades out with round 11's shape (round 12 has no objective line).
- Every round follows one sequence (`src/rounds/sequence.ts`, timings in `gameConfig.roundSequence`): shape fades in (400ms) rising 32px and zooming 0.8 → 1 → timer starts when the shape is fully visible (earlier clicks ignored) and the shape fill pulses alpha 0.8 ↔ 1 (1s cycle) until the click → click: marker + "Sample 0X, logged" tooltip (fixed top-right, disappears instantly 500ms after the click) → shape stays 1600ms → shape and marker fade out, zooming out to 0.8 in place (400ms) → 400ms pause → next round. Reduced motion: fades short, no movement or zoom.
- Timer and score show at least 4 digits (`padDigits`): `0000ms` idle (dimmed like the "Time:" label), `0347ms`, `0636pts`. The timer freezes at the click time until the next round starts.
- Rounds may have an optional `timeline` hook (intro start, shape visible, every frame with the round clock, click, outro end); empty for now. `sceneMode` (normal / distorted / alert / blackout) is a placeholder with no visual effect, settable from the debug panel.
- A `startMode` config flag: `"button"` (current) or `"auto"` (possible later). Build for both.
- Shapes (`src/rounds/shapes/`): a shape is `{ outer, holes }`, closed rings sampled about every `gameConfig.shapePointSpacingPx` (3px). Generators are pure functions of `(params, { rng, spacing })`, centered on their bounding box. `placeShape` (`src/rounds/geometry.ts`) is the one place offset, scale and rotation are applied (a `ShapeFrame` adds a moving shape's offset, scale or morphed outline); rendering (one SVG `<path>`, even-odd fill, so holes are cutouts) and scoring both use its output. `roundTarget` (`src/rounds/target.ts`) bundles the placed shape at t = 0, C/M/O and the falloff radius; `targetAt(t)` gives the same for any moment of a moving shape. Generators: rect, circle, ellipse, circleCluster, blob, curve (smooth curve through hand-placed control points, which can drift), avocado, rhombus, star (optional per-corner `innerRadii`), smiley.
- Round shapes (`rounds.config.ts`): 1 rectangle 360 × 360; 2 seeded upright blob 300 × 440 (8–10 points around an ellipse, smooth closed curve, never self-crossing); 3 lopsided avocado 280 × 380 (neck and top bulb lean right, big bulb left) with an oval pit (35% of its width, 1.3× as tall, tilted 20°, 8% left of the bulb's middle); 7 rectangle turned 10° clockwise and leaning back and forth, sized (`rectForRotatedBox`, then shrunk with `skewedRotatedBox`) so its on-screen box at the strongest lean fills the free screen area (`layout.round.largeShapeMargin` = 40px from the HUD row, the objective line and the screen edges, via `freeScreenArea()`); 9 three overlapping circles of very different sizes (radius 150, 85, 50) merged into one asymmetric outline (`circleCluster`), C and O about 17px apart; 10 five-point star (inner corners at 60% of the tip radius) stretched to 380 × 240, rotated 14°, 120px left; 12 smiley 100 (disc with eye and mouth holes), in the light logo color (`--shape-fill-light`). Moving rounds (v0.6): 4 bean `curve` 360 × 220, morphing; 5 soft triangular `curve` 320 × 280, morphing and bobbing, with the decoy; 6 oval 240 × 150 swaying; 7 skewing; 8 irregular seven-point star 300 × 300 (inner radii 0.38–0.66), jumping; 9 morphing; 10 turning; 11 square 200 × 200 shrinking. Only rounds 1, 2, 3 and 12 are still. All other shapes are 8px above center. The rhombus generator stays in the library, unused.
- Shape seeds: each round's shape seed is `mixSeed(game seed, round id)` (`shapeSeed` in `src/rounds/session.ts`), so `?seed=` replays the same blob. The debug panel's "reroll round 2" sets a new seed for round 2 only; "shape gallery" shows all 12 shapes with C/O/M markers and the free area.
- Objective line (all rounds): "Find the optical center of the shape".
- One click per round. The click is final and the next round loads automatically. Latency is measured from `round.shape.visible`.
- Round clock (`src/rounds/clock.ts`): ms since `round.shape.visible`, paused while the tab is hidden (and by the debug panel). The HUD timer, latency, motion and deadlines all use it, so a hidden tab never costs time.
- Motion (`src/rounds/motion.ts`, `motions` in `rounds.config.ts`, a list combined in order): every motion is a pure function of round time, starting at `round.shape.visible`, drawn on `requestAnimationFrame`. Morph (4, 5, 9): a curve's control points, or each merged circle's center and radius, drift on two seeded sines, up to 3% of the size, cycle 5s. Bob (5): up and down 12px, period 4s. Wave (6): `x = A·sin(ωt)`, `y = B·sin(2ωt + φ)`, period 6s, B = 40px, A as wide as the free area allows. Skew (7): leans up to 6° each way, period 8s. Jump (8): a new seeded position every 1200ms, instant. Spin (10): clockwise, one turn every 20s. Shrink (11): 200 → 40 linearly over 10s. A `ShapeFrame` carries offset, scale, extra rotation, skew and a morphed outline. Moving shapes stay inside `freeScreenArea(layout.round.motionMargin)` (48px from the screen edges, the HUD row and the objective line); they never pass behind the HUD.
- Score against the shape exactly as displayed: on the click, motion freezes (every moving round) and the round is scored on the frame on screen (`targetAt` at that frame's time); C, M, O, the falloff and the outline snapshot (`shape`, `frameMs`) are stored in the result. The default falloff follows the shape's current size (round 11 gets stricter as it shrinks).
- Timing (`src/rounds/timing.ts`): `timeLimitMs` and `inputWindows` (ranges from `shape.visible`; clicks outside are ignored). No click by the deadline (the time limit or the end of the last window) → `round.timeout`, a result with no click (q = 0, left out of lean and mean latency, "no input" in the Details table). Round 11: `timeLimitMs` 10000, then straight to the outro. Round 12: shown 1000ms (fading over the last 200ms), clicks count during `[0, 5000]`, then `postRoundIdleMs` 4000 of ignored input: 9s in all, click or not. Round 12 shows no objective line, no click marker and no logged tooltip: just the smile.
- Decoy (round 5, `decoy` in `rounds.config.ts`): an orange 2 × 2px dot (`--decoy-dot`) on the shape's current C (`target: 'optical'` switches to O), blinking twice, 400ms on / 400ms off (1.25 Hz, under the 3 Hz limit), right after the shape is fully visible. Gone on the click.
- Debug panel: pause/resume motion (the round clock), step one frame while paused, the round time with time left / input open / fixed end for timed rounds; the C/O/M markers follow moving shapes; the live score uses the current frame.
- Round 1 ignores time in scoring. Every round has a configurable `timeWeight`.

## Scoring model

All scoring lives in `src/scoring/` as pure, tested functions. Every constant lives in `game.config.ts` (`optical`, `scoring`, `persona`) so it can be tuned without changing logic. Coordinates are screen-content pixels.

### Optical center (`src/rounds/opticalCenter.ts`)

```
C  = area centroid of the material (outer minus holes)   (the "computed" center)
M  = pole of inaccessibility of the OUTER contour: the point farthest from any outer edge
B  = shape's axis-aligned bounding box in SCREEN space (after rotation)

Base = C + w × (M − C)                               w = skeletonWeight, default 0.35
O    = Base + ( −βx × B.width ,  −βy × B.height )    βy = 0.05 (up), βx = 0 (left; off by default)
if O falls outside the outer contour → O = M
```

- O and M come from the outer contour only, as if the holes were filled, so O may sit inside a hole (owner decision). Only C sees the holes.

- The shift uses screen axes: "up" is always up for the player, even on rotated shapes.
- M is computed in-house (`src/rounds/polygon.ts`, polylabel approach). Rects, circles and the smiley disc return their middle directly.
- `skeletonWeight`, `biasX`, `biasY` are global in `gameConfig.optical`, overridable per round via `optical` in `rounds.config.ts`.

### Points

Per round, for click P and latency t (ms):

```
dO = |P − O|            dC = |P − C|
accuracy  a = clamp(1 − dO / R, 0, 1) ^ k            R = 0.5 × shorter side of the on-screen bbox, k = 1.5
speed     s = clamp(1 − (t − grace) / (max − grace), 0, 1)     grace = 1500ms, max = 8000ms
quality   q = a × (1 − timeWeight + timeWeight × s)            timeWeight = 0 for round 1, 0.2 for rounds 2–12
penalty   q = 0  (timeouts / system errors — v1.0b; `RoundResult.penalty` is the hook)
roundPts  = 10000 × q / roundCount                              (shown rounded to whole points)
total     = round(10000 × Σq / roundCount)                      max exactly 10,000
```

Rounds can set `falloffRadius` in `rounds.config.ts`: rounds 1 and 7 use 100px (no extra forgiveness for big shapes). Reference values for R = 100 (e.g. the 200 × 200 square): 0px → 100% accuracy, 10px → 85%, 25px → 65%, 50px → 35%, 100px+ → 0.

### Humanity lean (verdict only, never affects points)

```
sep = |O − C|
if sep < minSeparationPx (default 4) → round excluded from lean
t_lean = clamp( ((P − C) · (O − C)) / sep² , −0.5, 1.5 )        0 = machine-like, 1 = human-like
humanityIndex = mean t_lean over included rounds (null if none)
```

C and O are about 10–40px apart on most shapes (avocado ≈ 19px, by design of its lean and pit placement).

### Session summary (`src/scoring/summary.ts`)

`{ total, rounds: [{ id, P, C, O, dO, dC, latencyMs, a, s, q, points, lean }], meanLatencyMs, humanityIndex, persona }`. `meanLatencyMs` is over the rounds that count time (2–12).

### Verdict persona (`src/scoring/persona.ts`, text in `copy.persona`)

- Accuracy tier by total: sharp ≥ 7500, decent 4500–7499, blurry < 4500.
- Humanity tier by humanityIndex: machine < 0.35, hybrid 0.35–0.65, human > 0.65 (null → hybrid).
- Speed tier by mean latency: fast < 1500ms, steady 1500–4000ms, slow > 4000ms.
- Overrides first, in order: total ≥ 9800 (algorithm), fast + blurry (trigger), slow + sharp (sniper). Otherwise accuracy × humanity.
- The speed tag is a third line, hidden when an override fired.

## Events (hooks for later versions)

Emit typed events through the event bus even before anything listens to them, for example `door.open.start/end`, `door.close.start/end`, `round.intro.start`, `round.intro.end`, `round.shape.visible`, `round.click`, `round.timeout`, `round.logged`, `round.outro.start`, `round.outro.end`, `scene.dark`, `scene.mode`, `alert.show`, `score.reveal`, `score.share`. Sound (v1.3) and effects attach to these. Keep the event list in `src/core/events.ts`.

## Working conventions

- **Plan before building:** for any brief, first summarize your plan and list open questions. Wait for the owner's go-ahead.
- **One brief = one branch** (`feat/<short-name>`). Small commits with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`).
- **Version on the branch:** when starting a brief's branch, bump `package.json` to that brief's version first (e.g. `0.4.0` on `feat/v0.4-…`), so the label at the bottom of the preview shows the version being worked on. Tag after the owner merges.
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
- v0.5: rounds 1, 2, 3, 7, 9, 10, 12 get their real shapes; the rest keep the 200 × 200 placeholder until v0.6.
- Start with a button; auto-start may replace it. Round 1 ignores time.
- Assets and colors are placeholders until the owner finalizes Figma.
- Frame and screen are centered horizontally on the stage (Figma is not pixel-perfect).
- Stage scales via rem (root font size), minimum window width 1024px, no page scroll.
- Background image is multiplied over a room-color token, sized in vw/vh (min 110%).
- Pole of inaccessibility (M) is written in-house, no `polylabel` dependency.
- Score screen follows the Figma "Score" frame; Details (table only, no diagram), Play again and the speed tag are added in the same style.
- v0.4: the screen is live behind the doors (loading starts before they open); the screen HUD is persistent and below the doors; the game ends with doors closing, darkness and doors opening on the score; Calculating is out of the flow.
- v0.4: the "OBJECTIVE:" label is dropped; only the objective sentence shows. Loading runs 2500ms in total.
- v0.4 review: no round intro and no "Test #N" title; shape fades in, objective slides up 16px (200ms delay, 200ms); 400ms between rounds; score padded to 4 digits like the timer.
- v0.4 review: the objective is introduced once before round 1 ("Objective:" + objective line) and stays at the bottom through round 12; between rounds only the shape comes and goes. Score label is "Your score".
- v0.5: O is computed from the outer contour (holes filled) and may sit in a hole; C is the centroid of the material. Falloff defaults to half the shorter side of the on-screen bbox; rounds 1 and 7 keep 100px. Objective text is generic. Round 12's smiley uses the light logo color.
- v0.5 review: the avocado is strongly lopsided (neck and top bulb lean right, big bulb left) with an oval pit (35% of the width, 1.3× as tall, tilted 20°, set 8% left), so C and O land about 19px apart, both on the material. The shape stays 1600ms after the click before fading.
- v0.5 review 2: round 2 blob upright (300 × 440); round 7 rectangle turned 10° clockwise and shrunk so its turned box fills the free area; round 9 is three merged circles of very different sizes (asymmetric); round 10 is a stretched, softer five-point star; the smiley is 100 × 100 (fine for now, even though it drops out of the lean).
- v0.6: moving shapes are scored on the frame displayed at the click and freeze on click (all of them). The round clock pauses while the tab is hidden. The decoy blinks twice, slowly (under 3 Hz). Moving shapes never pass behind the HUD. Round 12 always runs its full 9s, with no objective line, marker or tooltip. Round 11 has no visible countdown (the v0.7 doors will carry the deadline; they may partly cover the HUD then). The score Details stay a table (no per-round diagrams); timeouts read "no input".
- v0.6 review: the oval sways slower (6s per loop). Morphing is smaller and slower (3%, 5s). Round 5 also bobs; round 7 leans back and forth (and is a little smaller so it still fits); round 8 jumps every 1200ms; round 9 morphs; round 10 turns once every 20s.
