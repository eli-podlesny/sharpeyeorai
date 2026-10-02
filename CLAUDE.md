# SharpEyeOrAI — project rules for Claude Code

Read this file fully at the start of every session. It is the single source of truth for how this project is built. If a brief in `docs/briefs/` conflicts with this file, ask before proceeding.

## What we're building

A browser game about visual perception. The player is a test subject in a dark, gritty facility. A wall-mounted sci-fi screen sits behind a blast door; the door opens and the player completes 12 tests, each asking them to click the **optical center** of a shape. The environment degrades as the test goes on (tints, alerts, distortion). At the end the player gets a score out of 10,000 and a verdict on whether they see like a human or like a machine.

Desktop only. Mobile is not supported (a "desktop only" screen comes later). Free hosting only: GitHub + Vercel Hobby. No paid services.

The owner is a designer who is new to Claude Code. Explain what you are about to do in plain language before doing it, and keep changes small and reviewable.

## Current version

**v1.1b — in progress** (`feat/v1.1b-feel`, version `1.1.0-b`): parallax, the metal system cursors, the orange in-screen cursor, the sample tooltip and chat message components, TV noise, and the room lurching with the screen drop. v1.1a is released (tag `v1.1.0-a`). Briefs in `docs/briefs/`. (Releases are now numbered 0.x by brief; the roadmap table below is kept for scope reference.)

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
- DOM + CSS for everything visual. Images are layered `<img>`/`<div>` elements. No canvas/WebGL unless a brief asks for it. Exception (v0.7): the **background layer** may use WebGL for its breathing effect (`src/fx/breathing.ts`, plain WebGL, no library), always with the static image as fallback.
- Plain CSS with custom properties. Global tokens live in `src/styles/tokens.css`. No Tailwind.
- Vitest for tests. ESLint + Prettier for code style.
- Fonts self-hosted through Fontsource (EU/GDPR reason: no Google Fonts CDN): Turret Road (Medium, ExtraBold), Kode Mono (Regular, Medium, Bold).
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
npm run assets     # assets-src/ → public/assets/ (WebP/AVIF, 1×/2×; cursors as PNG) + src/assets/manifest.ts
```

## Folder structure

```
src/
  main.ts            entry
  core/              state machine, scene manager, event bus, rng, input, unit sizing, preload
  config/            game.config.ts, rounds.config.ts, layout.config.ts
  rounds/            round logic (shape geometry, target computation)
    shapes/          one pure generator per shape type + tests
  scoring/           pure scoring functions + tests
  scenes/            intro, ready, loading, round, ending, score (calculating: kept, out of the flow)
  layers/            background, vignette, frame, doors, screen, screen-hud, hud, darkness, art (<picture>)
  assets/            manifest.ts, generated by npm run assets
  ui/                sample tooltip, chat messages, cursors (system + in-screen), popups, buttons
  fx/                scene effects: sceneController, breathing, glitch, alert, drop, backgroundDrop, parallax, noise + pure schedule
  audio/             v1.3 only
  styles/            tokens.css, base.css
public/assets/       optimized runtime images (WebP/AVIF, 1×/2×), generated by npm run assets
scripts/             assets.mjs (image pipeline)
assets-src/          owner's raw exports. Never modify or commit large files here without asking
docs/briefs/         one brief per task, written by the owner
docs/figma/          saved Figma responses (fetch once, never again)
```

## The stage

The stage is the window. Three groups size themselves against it (all numbers in `src/config/layout.config.ts`):

- **Viewport HUD — fixed CSS px, never scaled.** The logo is centered 24px from the top; the version label (from `package.json`, injected at build time) is centered 32px from the bottom. The About link, when it exists, follows the same rule.
- **Background — covers the window.** It fills the window plus an overscan of `bgOverscan` (12%) on every side, so it never shows an edge and has room for parallax, rotation and distortion later. The WebGL breathing canvas fills the same box. The image uses `mix-blend-mode: multiply` over the `--color-room` token (Figma's `#777`), so the room tint can change without editing the image.
- **The unit — frame, shadows, screen, doors, screen content, screen HUD.** One box (`.unit`, the `assembly`) shaped like `frame.png` (its aspect ratio comes from the generated manifest, never hard-coded), sized to the largest box that fits with **64px above and below** and **at least 24px at the sides**, centered both ways, and never taller than the frame art's 2× file (1308px). The formula is in CSS (`.unit` in `layers.css`) and mirrored in `computeUnitRect` (`src/core/stage.ts`) for input and tests.
- Inside the unit everything is in **reference px**: the frame at its Figma size, 772px tall (1117.9 wide). Code converts them with `u()` (`src/core/units.ts`) to container units (`cqh`), so everything scales with the frame. Nothing inside the unit uses viewport units or fixed px. `u()` only works inside a `.unit`; the unit's own transform uses percentages.
- **The screen opening** is measured from `frame.png` at the inner bevel, in percent of the frame image (`OPENING` in layout config): about 1036 × 669 reference px. The frame art covers its chamfered corners and the top and bottom notches. **Game coordinates (screen-content px) are the opening**, origin at its top-left; shape sizes are in these px, so shapes scale with the frame. The screen surface and the doors' viewport are Figma's slightly larger 1070 × 724 box, its edges under the frame.
- **HUD anchors** are in percent of the opening, from the Figma "hud placement" frame (`184:2`): counter and progress in a box 16.52% from the left, 1.59% from the top, 27.9% wide (the bar fills what the counter leaves); the timer mirrored on the right, right-aligned; the sample ("logged") tooltip with its top-right corner 6.2% from the right and 8.2% from the top; the chat message spot with its bottom-right corner 6.2% from the right and 8.5% from the bottom; the objective bottom-center with its bottom 9% up, clear of the bottom notch. Font sizes inside the unit are Figma sizes in reference px, so text keeps its proportion to the frame. The debug panel's **layout** toggle outlines the opening, the surface, the anchors and the safe areas over the art.
- Transforms (the drop, its shake) apply to the unit as a whole, around its center, so the inner layout stays intact. Boxes that must line up with the unit above other layers (the HUD's screen slot, the spotlight) are their own `.unit` boxes; the spotlight one follows the drop.
- **Input:** every pointer → game conversion goes through `toContentCoords` (`src/core/input.ts`): window → inverse of the unit's real transform matrix (`src/core/affine.ts`, never bounding rectangles) → opening-local reference px. Tested at 1280×720, 1440×900, 1920×1080, 2560×1440 and 1280×1000, with the screen at home and dropped.
- There is no minimum window width any more: the unit simply fits. The page never scrolls in any direction.
- **Art pipeline:** raw exports in `assets-src/` (not committed). `npm run assets` (`scripts/assets.mjs`, sharp) writes `public/assets/` as WebP and AVIF at 2× (source size) and 1× (half), and `src/assets/manifest.ts` with each image's intrinsic size and file sizes. Images are `<picture>` elements (`src/layers/art.ts`) whose `sizes` track the drawn width, so the browser picks 1× or 2× for the screen. A preloader (`src/core/preload.ts`) loads every art image before the game starts (the app stays hidden meanwhile; decoding is capped at `artDecodeTimeoutMs` so a background tab never stalls) and emits `assets.progress` / `assets.ready` for the v1.2 loading screen. Budget about 4 MB at 2×: currently 1.5 MB WebP, 1.0 MB AVIF. The metal cursors (`assets-src/ui/cursors/`, 32px and @2x) are copied as PNG to `public/assets/cursors/` and listed in the manifest as `cursorFiles`.

## Layer stack (bottom to top)

Each layer is its own module with a stable name. Layer properties (opacity, blend, blur, corrections) come from Figma node `177:598`, frames `177:497` (doors closed) and `177:583` (doors open), saved in `docs/figma/v1.1a-layers.md` (do not fetch them again).

1. `background` — room illustration (`bg-room`), window plus overscan, multiplied over the room color. Will be moved (parallax), scaled, rotated and distorted in later versions.
2. `vignette` — Figma's radial gradient ("vignette overlay"), stretched to the window, in `--vignette-color`.
3. `hud-back` — the viewport HUD: logo and version label, below the unit so the frame passes over them when the screen drops.
4. The unit (`assembly`), which moves as one piece (the drop after round 9's click), around its center:
   1. `frame-glow` — "frame as shadow": the frame art darkened (34%), blurred 16px, 16px lower.
   2. `screen` — the surface: `--screen-surface` (bone at 64%) over an 8px backdrop blur. Game content renders inside `screen-content` (the opening). The `screen-hud` (round counter, progress bar, timer, objective) sits over the opening above the content and below the doors (the `chat-layer`, holding chat messages, just above it), and stays visible from loading through the last round (hidden on the score screen). The texture art lies on top of both, in overlay at 32%, so shapes and HUD look printed on the panel (clicks pass through). When the doors open (not snap open), the content and the screen HUD zoom in from `doorReveal.fromScale` (0.9) to 1 over the opening; never on closing, never with reduced motion.
   3. `doors` — two door images (1086 × 724, both centered on the surface), clipped to the surface, meeting at the seam. Each slides 640px out to open, fully out of view. They never take clicks (round 11 counts clicks behind them).
   4. `frame` — "frame inner shadow" (the frame art nearly black, 92.5% size, 17.6px lower, blurred 64px, 32%), then the frame art itself.
5. `hud` — a unit box with the screen slot over the opening (controls over the shut doors, e.g. Start), above doors and frame. It also holds the debug layout outline.

Outside `#app`, in the body: `tv-noise` (z 900, over everything in the game, darkness included), the in-screen cursor (z 950), the debug panel (z 1000).

Above the HUD: `alert-glow` (window-sized ellipse in the alert color, its blur scaled to the window height), `darkness` (window-sized, levels 0–1; rounds 11–12 and the end of the game) and `spotlight-unit` (a unit box above the darkness; its `spotlight` covers the opening: round 12 renders there, lit; it follows the drop exactly, so the lit shape sits on the dropped screen). Window-sized layers use `.layer--window`.

| Layer (Figma)  | Reference box (unit px)                  | Source                      |
| -------------- | ---------------------------------------- | --------------------------- |
| frame / unit   | 1117.9 × 772                             | `frame.png` (1894 × 1308)   |
| screen surface | 1070 × 724, centered, top 24             | Figma "Screen Color"        |
| opening (game) | ≈ 1036.4 × 669.3 at (40.7, 51.3)         | measured from `frame.png`   |
| doors          | 1086 × 724 each, centered on the surface | `door_left/right.png`       |
| background     | window + 12% each side, cover            | `bg-room.png` (3300 × 1800) |

## Design tokens (temporary)

Colors and type are not final. Always use tokens, never hard-coded values, so the owner can retune everything in one file.

- Ink `#111`, Graphite `#333`, Ash `#777`, Concrete `#BEB8AD`, Bone `#E6E1D7`, Paper `#F6F4EE`
- Hazard orange `#EE4D00`: only for interactive elements, click targets, system alerts, the score number, and the Drama-round tint
- Display/UI font: Turret Road. Objective text and the screen-HUD counter and timer: Kode Mono (HUD in Bold, via `--font-hud` / `--weight-hud`).

## Gameplay rules (current decisions)

- Screen entrance (`src/fx/screenEntrance.ts`, `gameConfig.screenEntrance`): at the start of the game the room is drawn first, then 400ms later the screen unit (with the HUD slot and spotlight boxes) rises 24% of its height from below and fades in over 1000ms. At the end it leaves in the dark and enters again the same way once the lights are on, before the score. Moved with the CSS `translate` property (the drop keeps `transform`). Reduced motion: a fade only.
- Flow: Intro → Ready (closed doors + Start button) → Loading ("Initializing" starts behind the doors, doors open onto it after `loadingStartBeforeDoorsMs`) → Objective intro → Test 01…12 → Ending (doors close, darkness for `endDarknessMs`) → Score (the room shows first, lit; the screen rises from below and fades in; then the doors open, zooming in, onto "Calculating", which stays `calculatingMs` (600ms) once they are open; then the score fades in and counts up; the doors open in 2200ms). On the score, the total, in the mono font (Kode Mono Bold), sits 4px right of center (optical balance), the Details toggle reads "Score" while the table is open, and "Copied" shows as a light chat message at the chat message spot (bottom-right of the opening); if the clipboard refuses, the message shows the full share text, selectable, until replaced. The separate Calculating scene is kept but out of the flow.
- Before round 1, the objective intro (`gameConfig.objectiveIntro`, `layout.objectiveIntro`): "Objective:" (large) fades in at the center rising 16px and zooming 0.8 → 1 (400ms); the objective line follows below it (200ms delay, 200ms, rising 16px); hold 1600ms; then "Objective:" fades out moving down 16px while the objective line moves to its bottom place (400ms). The objective line lives in the screen HUD and stays there until it fades out with round 11's shape (round 12 has no objective line).
- Every round follows one sequence (`src/rounds/sequence.ts`, timings in `gameConfig.roundSequence`): shape fades in (400ms) rising 32px and zooming 0.8 → 1 → timer starts when the shape is fully visible (earlier clicks ignored) and the shape fill pulses alpha 0.8 ↔ 1 (1s cycle) until the click → click: marker + sample tooltip "Sample 0X · LOGGED" with x, y, t (fixed top-right, fading in over 120ms and staying as long as the shape, fading out with it; a timeout shows the "NO INPUT" variant) → shape stays 1600ms → shape and marker fade out, zooming out to 0.8 in place (400ms) → 400ms pause → next round. Reduced motion: fades short, no movement or zoom.
- Timer and score show at least 4 digits (`padDigits`): `0000ms` idle (dimmed like the "Time:" label), `0347ms`, `0636pts`. The timer freezes at the click time until the next round starts.
- Rounds may have an optional `timeline` hook (intro start, shape visible, every frame with the round clock, click, outro end); empty for now. `sceneMode` (normal / distorted / alert / blackout) is a placeholder with no visual effect, settable from the debug panel.
- A `startMode` config flag: `"button"` (current) or `"auto"` (possible later). Build for both.
- Shapes (`src/rounds/shapes/`): a shape is `{ outer, holes }`, closed rings sampled about every `gameConfig.shapePointSpacingPx` (3px). Generators are pure functions of `(params, { rng, spacing })`, centered on their bounding box. `placeShape` (`src/rounds/geometry.ts`) is the one place offset, scale and rotation are applied (a `ShapeFrame` adds a moving shape's offset, scale or morphed outline); rendering (an SVG fill `<path>`, even-odd, so holes are cutouts, plus a 4px outline path with a hand-drawn "pencil" filter: a slight waver and a grain that breaks the line, `layout.round.pencil`, visual only) and scoring both use its output. `roundTarget` (`src/rounds/target.ts`) bundles the placed shape at t = 0, C/M/O and the falloff radius; `targetAt(t)` gives the same for any moment of a moving shape. Generators: rect, circle, ellipse, circleCluster, blob, curve (smooth curve through hand-placed control points, which can drift), avocado, rhombus, star (optional per-corner `innerRadii`), smiley, triangle (equilateral, point up).
- Round shapes (`rounds.config.ts`): 1 rectangle 360 × 360; 2 seeded upright blob 300 × 440 (8–10 points around an ellipse, smooth closed curve, never self-crossing), in the left part of the screen (240px left); 3 lopsided avocado 280 × 380 (neck and top bulb lean right, big bulb left) with an oval pit (35% of its width, 1.3× as tall, tilted 20°, 8% left of the bulb's middle), 140px right (half its width); 7 rectangle turned 10° clockwise and leaning back and forth, sized (`rectForRotatedBox`, then shrunk with `skewedRotatedBox`) so its on-screen box at the strongest lean fills the free screen area (`layout.round.largeShapeMargin` = 40px from the HUD row, the objective line and the screen edges, via `freeScreenArea()`); 9 three overlapping circles of very different sizes (radius 150, 85, 50) merged into one asymmetric outline (`circleCluster`), C and O about 17px apart; 10 five-point star (inner corners at 60% of the tip radius) stretched to 380 × 240, rotated 14°; 12 equilateral triangle, side 120, point up, in the top-right area (300 right, 180 up from the center), in the light logo color (`--shape-fill-light`), with a dark "?" (`--shape-mark`, the logo font) on its centroid C. Moving rounds (v0.6): 4 bean `curve` 360 × 220, morphing, 100px left and 40px down; 5 soft triangular `curve` 320 × 280, morphing and bobbing, with the decoy; 6 oval 240 × 150 swaying; 7 skewing; 8 irregular seven-point star 300 × 300 (inner radii 0.38–0.66), jumping; 9 morphing; 10 turning while it wanders on a figure-eight (period 7s, up to 60px tall, as wide as the free area allows with 80px extra margin for the spin); 11 square 200 × 200 shrinking. Only rounds 1, 2, 3 and 12 are still. All other shapes are 8px above center (rounds 2–4 shifted as above). The rhombus generator stays in the library, unused.
- Shape seeds: each round's shape seed is `mixSeed(game seed, round id)` (`shapeSeed` in `src/rounds/session.ts`), so `?seed=` replays the same blob. The debug panel's "reroll round 2" sets a new seed for round 2 only; "shape gallery" shows all 12 shapes with C/O/M markers and the free area.
- Objective line (all rounds): "Find center of a shape".
- One click per round. The click is final and the next round loads automatically. Latency is measured from `round.shape.visible`.
- Round clock (`src/rounds/clock.ts`): ms since `round.shape.visible`, paused while the tab is hidden (and by the debug panel). The HUD timer, latency, motion and deadlines all use it, so a hidden tab never costs time.
- Motion (`src/rounds/motion.ts`, `motions` in `rounds.config.ts`, a list combined in order): every motion is a pure function of round time, starting at `round.shape.visible`, drawn on `requestAnimationFrame`. Morph (4, 5, 9): a curve's control points, or each merged circle's center and radius, drift on two seeded sines, up to 3% of the size, cycle 5s. Bob (5): up and down 12px, period 4s. Wave (6): `x = A·sin(ωt)`, `y = B·sin(2ωt + φ)`, period 9s, B = 40px, A as wide as the free area allows. Skew (7): leans up to 6° each way, period 8s. Jump (8): a new seeded position every 1200ms, instant. Spin (10): clockwise, one turn every 20s. Shrink (11): 200 → 40 linearly over 8s. A `ShapeFrame` carries offset, scale, extra rotation, skew and a morphed outline. Moving shapes stay inside `freeScreenArea(layout.round.motionMargin)` (48px from the screen edges, the HUD row and the objective line); they never pass behind the HUD.
- Score against the shape exactly as displayed: on the click, motion freezes (every moving round) and the round is scored on the frame on screen (`targetAt` at that frame's time); C, M, O, the falloff and the outline snapshot (`shape`, `frameMs`) are stored in the result. The default falloff follows the shape's current size (round 11 gets stricter as it shrinks).
- Timing (`src/rounds/timing.ts`): `timeLimitMs` and `inputWindows` (ranges from `shape.visible`; clicks outside are ignored). No click by the deadline (the time limit or the end of the last window) → `round.timeout`, a result with no click (q = 0, left out of lean and mean latency, "no input" in the Details table). Round 11: `timeLimitMs` 8000, then straight to the outro. Round 12: shown 1000ms (fading over the last 200ms), clicks count during `[0, 4000]`; with no click, `postRoundIdleMs` is the two last breaths (3.1s), so it ends at 7.1s with them; a click ends it at once (`clickEndsRound`). Round 12 shows no objective line, no click marker and no logged tooltip: just the triangle.
- Decoy (round 5, `decoy` in `rounds.config.ts`): an orange 2 × 2px dot (`--decoy-dot`) on the shape's current C (`target: 'optical'` switches to O), blinking twice, 400ms on / 400ms off (1.25 Hz, under the 3 Hz limit), right after the shape is fully visible. Gone on the click.
- Debug panel: pause/resume motion (the round clock), step one frame while paused, the round time with time left / input open / fixed end for timed rounds; the C/O/M markers follow moving shapes; the live score uses the current frame. Effects (v0.7): force a scene mode (held until the next round changes it), trigger a glitch, toggle alert and the screen drop, scrub round 11's darkening, FPS.
- Scene-mode timeline (v0.7, `gameConfig.fx.modeByRound`; the next round's mode starts at a round's outro end). One controller (`src/fx/sceneController.ts`) listens to round events and drives every effect; round files hold no effect code. Every number is in `gameConfig.fx` / `layout.assembly`.

  | When | Mode | Effects |
  | --- | --- | --- |
  | Ready → round 3 | `normal` | none |
  | After round 3's outro | `distorted` | background breathing, subtle (4px) |
  | Round 7 | `distorted` | + screen glitch: a short burst (120ms) every 4s, calm first; the rhythm runs on through round 8 |
  | After round 7's outro | `alert` | room color pulses #111 ↔ hazard (2.4s), glow ellipse at 16% with a 300px blur (`layout.alertGlow.blur`); breathing strong (10px, 2× faster); glitch every 4s; the orange chat message "Alert! System Malfunction" at the chat spot for 4s (`chatMessage.alertMs`) |
  | Round 9 | `alert` | + glitch every 2s, and without pause from the click on (as if the click broke it); right after the click the room lurches (scaled 1.4×, turned 6° clockwise, shifted right and up so its bottom-left shows, still covering the window; 900ms, `fx.drop.backgroundMs`, `layout.background.drop`) and the screen assembly drops (a gravity-like fall of 420ms, then a subtle landing shake of 380ms that dies away: left, −8°, 0.8×), at least 140px and on tall windows far enough that its center is 310 unit px above the window bottom (`droppedPose`). It stays down through round 12 |
  | Round 10 | `alert` | the chat "What's going on?!" → "Did we break anything?" as the round starts; the screen stays dropped; the glitch runs without pause; the alert gathers around the screen (`alertFocus`, rounds 10–12): over 1.5s the room tint turns from flat into a radial one centered on the dropped screen (full within 18vmax, the normal room color from 62vmax, `layout.alertGlow.focus`) and the glow moves onto it, shrunk to 55% |
  | Round 11 | `blackout` | the chat "Oh, the doors are closing fast" → "Hurry Up!" as the round starts (`chat` in rounds.config; the closing doors cover it); the screen stays dropped and glitching; alert and breathing continue, the alarm faster (0.9s pulse, `fx.alert.intensePeriodMs`; reduced motion keeps it slow); doors close and the scene goes fully black over exactly the 8s deadline (round clock); an early click speeds both up to finish (800ms). The doors cover the logged tooltip |
  | Round 12 | `blackout` | stays fully black; the doors snap open, unseen; first the light chat message "Last chance..." (2s, a one-line `chat` with `holdMs` 2000), lit above the darkness at the chat spot; the triangle starts fading in when it goes (`shapeDelayMs` 2000). Only the triangle shows, lit above the darkness (`aboveDarkness`) on the still-dropped screen. A click ends the round at once. Timeline: message → triangle → 3s black → two last breaths (`fx.lastBreath`, `count` 2, 700ms of black between: the doors shut at once, unseen; a little light comes back, 20% visible, for about 0.6s and falls back to black over 0.6s, over the still-broken scene: dropped, alarm on) → 4s of full black (`darkAfterMs`) → lights on → the screen enters → the score. The breaths come when the 4s for clicks end, or 1s after a click; after a click the ending keeps the scene broken until they are over |
  | End | `normal` | full black (4s after round 12's last breaths: `fx.lastBreath.darkAfterMs`); effects off and the screen home and away in the dark; lights return on the room alone; the screen rises in; doors open on the score with the stage back to normal |

- Breathing: WebGL shader displaces the background with slow smooth noise; presets ease over 2s; one draw call, texture uploaded once, canvas sized to the layer (pixel ratio capped). No WebGL or reduced motion → static image.
- Glitch (`src/fx/glitch.ts`): subtle: 2–4 thin slices shifted up to 12px, slight jitter, a small opacity drop and faint monochrome noise, inside the screen only (screen background, HUD, objective, shape). Patterns: every 4s (7–8), every 2s (9), constant (from round 9's click through 11). Visual only (an SVG displacement filter: hit-testing and scoring are untouched). Burst starts are flash-limited to 3 per second; a constant glitch keeps its brightness steady. Reduced motion: the screen only dims.
- Reduced motion overall: no breathing, glitch dims only, the drop is a short plain move (300ms) with no shake; the alert pulse stays (slow and soft); no parallax; the in-screen cursor has no lag or spread; the noise is one still tile.
- Parallax (`src/fx/parallax.ts`, offsets in `layout.parallax`, timing in `fx.parallax`): pointer as −1…1 from the window center. Background (with its WebGL canvas) ±12 / ±8 window px, following the pointer; outer frame shadow ∓8 / ∓4, inner shadow ∓4 / ∓2, doors ∓2 / ∓1 and the screen HUD ∓1 / ∓1 unit px, against it (the HUD as CSS variables `--parallax-hud-x/-y`, read by the screen HUD, the chat stacks and the sample tooltip). Exponential follow settling (99%) in 500ms; when the pointer leaves the window the layers drift home in 1500ms. Written to the CSS `translate` property, so it adds to the layers' transforms (the drop, the room lurch, the inner shadow's placement). The background's multiply blend sits on the layer itself, since moving it isolates its children.
- System cursors (`src/ui/cursors.ts`, rules in `base.css`): the metal pixel set via `image-set` (or `-webkit-image-set`, or the 1× image), each with its native fallback. Hotspots (`layout.systemCursor`): default 0 0, pointer 4 0, pointer-down 4 2 (while pressed), not-allowed 7 7 (disabled controls).
- In-screen cursor (`src/ui/screenCursor.ts`, sizes `layout.screenCursor`, feel `gameConfig.screenCursor`, from Figma `192:25`): shows during a round while the pointer is over the opening (the system cursor hidden there); while the round ignores clicks (intro, after the click, outro) only the brackets show, no dot. Orange (`--screen-cursor`) brackets on the pointer (a 20px square, bars 4 long, open corners), spreading with speed to 32px / bars 8 (attack 240ms, release 70ms, full spread at 2400 px/s); a ring dot (r 2 → 4 with the spread) trailing with a 60ms follow, never more than 40px away. Pressed: square 18, dot r 3, held 160ms. Scoring always uses the pointer (the brackets' center). Debug panel: sliders for dot lag, attack, release, max spread, and the pointer speed.
- Hand-drawn panels (`src/ui/panelShape.ts`, `layout.panel`): 12px cut corners at the top-left and bottom-right (as in Figma), a 2px outline with the shapes' pencil filter. Used by the sample tooltip (`src/ui/sampleTooltip.ts`, 176 × 104, concrete, "Sample 0X" + LOGGED / NO INPUT, divider, x / y / t with dot leaders) and the chat message (`src/ui/chatMessage.ts`: `showChatMessage({ variant: 'light' | 'orange', title, body, anchor, durationMs, selectable })`, hugging its text up to 192px, stacking right-aligned: a new message comes in at the bottom, overlapping the one above by 4px, and pushes the others up (gliding, 200ms); quick 150ms fade, always up at least 2s: `chatMessage.minVisibleMs`). Round chats (`showChatSequence`, `chat` in rounds.config): one line every 1.2s, and 4s after the last the whole chat fades out together (`chatMessage.sequenceIntervalMs` / `sequenceHoldMs`); light, at the chat spot under the doors.
- TV noise (`src/fx/noise.ts`, `fx.noise`): 8 grey noise tiles of 256px made once at startup, switched 24 times a second at a random offset; 7% opacity, `hard-light` blend (lifts the blacks, roughens the light screen). Above everything in the game, darkness included.
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
- M is computed in-house (`src/rounds/polygon.ts`, polylabel approach). Rects, circles and the smiley disc return their middle directly (the smiley stays in the library, unused).
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

Emit typed events through the event bus even before anything listens to them, for example `door.open.start/end`, `door.close.start/end`, `round.intro.start`, `round.intro.end`, `round.shape.visible`, `round.click`, `round.timeout`, `round.logged`, `round.outro.start`, `round.outro.end`, `scene.dark`, `scene.mode`, `alert.show`, `fx.glitch`, `screen.drop`, `score.reveal`, `score.share`. Sound (v1.3) and effects attach to these. Keep the event list in `src/core/events.ts`.

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
- v0.7: WebGL is allowed for the background layer only (breathing). One scene controller drives all effects from round events. No alert "System Message" box for now. Round 10's drop lasts ~1200ms and keeps going while the shape is visible. Round 11: the whole scene (screen and shape too) darkens; an early click makes doors and darkness hurry to finish. Round 12: no intro text; the smile is lit above the darkness. The end keeps a few seconds of full black; the screen returns home in the dark and the score is revealed in normal lighting. Reduced motion: glitch becomes a gentle dim; the alert pulse stays.
- v0.7 review: the glitch is subtler and rarer (every 4s from round 7, every 2s from round 9, constant in round 10 once the screen has dropped and in round 11). The alert glow has a 300px blur. Round 11 keeps the screen dropped and glitching and goes fully black; round 12 never brightens, only the smile shows. The screen keeps its contents (tooltips) under the doors.
- v0.7 review 2: the screen drops right after round 9's click, with a subtle landing shake, and stays down through round 12 (round 12's lit shape sits on the dropped screen); it goes home in the dark at the end, so the score is on a normal stage. Round 12's shape is an equilateral triangle (side 120). Round 12 without a click runs as before; a click ends it at once and the black lasts 3s from the click before the score.
- v0.7 review 3: doors open and close in 2000ms (round 11's closing still follows its 10s deadline); the drop falls faster with gravity-like easing and a springy impact; after round 12 with no click the black lasts 1s; the score counts up over 2500ms.
- v0.7 review 4: objective text "Find center of a shape". Round 6's oval sways slower (9s per loop). Logo and version label sit below the screen frame.
- v1.1a: the fixed 1440 × 900 stage is replaced by three groups: viewport HUD in fixed px (logo 24px from the top, version 32px from the bottom), a background covering the window plus 12% overscan, and a frame-shaped unit fitted with 64px top/bottom and ≥24px sides, capped at the 2× art. Inside the unit, sizes are reference px (the frame at 772 tall) as container units; no more rem scaling and no minimum window width. Game coordinates are the screen opening measured from frame.png (≈1036 × 669). The PNGs in assets-src are 2× exports. Logo stays text, the vignette is CSS (Figma's gradient), the glow and inner shadow are made from the frame art, the background keeps its multiply blend over #777. Door art outside the frame is clipped and never seen.
- v1.1a review: the screen content and HUD zoom in (0.9 → 1) as the doors open, never on close. The texture covers the HUD and the shapes too. Round 12's triangle carries a dark "?" in the logo font. The score screen opens on "Calculating" (800ms once the doors are open), then the score. HUD placement follows the Figma "hud placement" frame. The frame inner shadow is 40px lower with a 64px blur. The constant glitch starts at round 9's click. The drop reaches the bottom of tall windows. Round 11's alarm pulses faster (0.9s).
- v1.1a review 2: shape outlines are 2× wider (4px) and look hand-drawn (pencil/brush filter on the outline only).
- v1.1a review 3: round 11 is 2s shorter: 8s for the shrink, the time limit and the closing doors and darkness.
- v1.1a review 4: round 12 takes clicks for 4s and ends at 8s. A last breath of light (20% visible) comes 1s after the click, or when the 4s for clicks end, then black again. The extra 1s of black at the end stays for now.
- v1.1a review 5: round 12 runs triangle → 3s black → last breath (doors shut, no animation; 20% light) → 3s black → lights on with the score. With no click the round ends with the breath; the old 1s end black and `afterClickMs` are replaced by `lastBreath.darkAfterMs` (3s).
- v1.1a review 6: score total nudged 4px right; Details toggle reads "Score"; "Copied" at the chat message spot; the objective intro holds 0.4s longer (1600ms); Calculating 0.2s shorter (600ms) and the doors 0.2s slower to open (2200ms).
- v1.1a review 7: 4s of full black after the last breath; the score number in the mono font; round 12's triangle in the top-right area of the screen.
- v1.1b: parallax on the background and both frame shadows (shadow offsets in frame px). Metal system cursors; the orange in-screen cursor only during rounds taking clicks, over the opening. The "copied tooltip" is now a chat message (light); the alert gets an orange chat message "Alert! System Malfunction" at the chat spot when alert mode starts. Panels have Figma's cut corners (top-left and bottom-right). The TV noise covers the darkness too (life in the black). The score Details stay a table (no markers). With the screen drop the room lurches: scaled 1.4×, turned clockwise, shifted so its bottom-left part shows, always covering the window.
- v1.1b review: two last breaths in round 12. The in-screen cursor never turns into the system not-allowed: after the click (and while clicks are ignored) only the dot hides. The sample tooltip stays as long as the shape. Chat messages stay at least 2s. "Hurry Up!" at the start of round 11 (light); "Last chance..." before round 12's triangle, lit in the dark. The screen rises in from below, fading, after the room is drawn (game start and before the score). Round 2's blob on the left, round 3's avocado half its width to the right, round 4's bean a little left and down. Parallax also on the doors (2px / 1px) and the screen HUD (1px).
- v1.1b review 2: round 10's star wanders around the screen while it spins. From round 10 the alert tint and glow gather around the (dropped) screen instead of covering the whole room. "Hurry Up!" is light and opens round 11.
- v1.1b review 3: round chats. Round 10: "What's going on?!", "Did we break anything?"; round 11: "Oh, the doors are closing fast", "Hurry Up!". Lines 1.2s apart, each pushing the last up with Figma's 4px overlap; the whole chat fades 4s after the last line. The chat stays under the doors.
