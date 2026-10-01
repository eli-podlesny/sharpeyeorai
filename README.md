# SharpEye or AI

A browser game about visual perception. You are a test subject in a dark facility: behind a blast door, a wall-mounted screen asks you to click the **optical center** of 12 shapes while the environment slowly degrades. At the end you get a score out of 10,000 and a verdict — do you see like a human, or like a machine?

Desktop only.

**Live site:** https://sharpeyeorai.vercel.app _(coming soon)_

## Run it locally

Requires [Node.js](https://nodejs.org/) (current LTS).

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173). Press the backtick key (`` ` ``) to toggle the debug panel.

### Review shortcuts (URL parameters)

| Parameter              | Effect                                           |
| ---------------------- | ------------------------------------------------ |
| `?debug=1`             | Opens the debug panel on load                    |
| `?state=round&round=7` | Starts directly in a state (here: round 7)       |
| `?seed=123`            | Fixes the random seed so a session is repeatable |

## Scripts

| Command           | What it does                      |
| ----------------- | --------------------------------- |
| `npm run dev`     | Local dev server with live reload |
| `npm run build`   | Type-check and build into `dist/` |
| `npm run preview` | Serve the production build        |
| `npm run test`    | Run unit tests (Vitest)           |
| `npm run lint`    | Check code with ESLint            |
| `npm run format`  | Format code with Prettier         |

## Project rules

See [`CLAUDE.md`](CLAUDE.md) for the architecture, conventions and roadmap, and [`docs/briefs/`](docs/briefs/) for per-version briefs.
