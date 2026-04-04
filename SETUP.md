# Running Creature Collector Locally

## Prerequisites

- **Node.js 18+** — download from https://nodejs.org (LTS version recommended)
- **npm** — comes bundled with Node.js

Check you have them:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## Project structure

All source files live flat in `src/`. The final layout should be:

```
creature-collector/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              ← React entry point
    ├── App.jsx               ← Root + router
    ├── RunContext.jsx         ← Global state
    │
    ├── TitleScreen.jsx
    ├── StarterPickScreen.jsx
    ├── MapScreen.jsx
    ├── CombatScreen.jsx
    ├── CombatUI.jsx
    ├── CatchScreen.jsx
    ├── RewardScreen.jsx
    ├── ShopScreen.jsx
    ├── RestScreen.jsx
    ├── EventScreen.jsx
    ├── EvolutionScreen.jsx
    ├── GameOverScreen.jsx
    ├── PartyScreen.jsx
    │
    ├── gameSchema.js
    ├── combatEngine.js
    ├── mapGenerator.js
    ├── cardDefs.js
    ├── creatureDefs.js
    ├── relicEngine.js
    └── eventDefs.js
```

---

## Setup steps

### 1. Create the project folder

```bash
mkdir creature-collector
cd creature-collector
```

### 2. Place the config files

Copy these files into the **root** of `creature-collector/`:
- `index.html`
- `package.json`
- `vite.config.js`

### 3. Place the source files

Create a `src/` folder inside `creature-collector/`, then copy **all** `.jsx` and `.js` files into it:

```bash
mkdir src
# copy all .jsx and .js files into src/
```

Make sure `main.jsx` is in `src/` — it is the React entry point.

### 4. Install dependencies

```bash
npm install
```

This downloads React and Vite (~5 seconds on a fast connection).

### 5. Start the dev server

```bash
npm run dev
```

Vite will print something like:

```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser. The game loads instantly.

---

## Common issues

### "Cannot find module" errors

Make sure every `.jsx` and `.js` file is inside `src/` and that no import paths have typos. All imports in this project use relative paths like `"./RunContext.jsx"` — they expect all files to be siblings in the same folder.

### "process is not defined"

This project uses ES modules (`"type": "module"` in package.json). Make sure you haven't accidentally added any CommonJS `require()` calls.

### Port already in use

```bash
npm run dev -- --port 3000
```

### Hot reload not working

Save any file — Vite watches all files in `src/` and reloads automatically. If it gets stuck, `Ctrl+C` and `npm run dev` again.

---

## Building for production

```bash
npm run build
```

Output goes to `dist/`. To preview the production build:

```bash
npm run preview
```

To host it, upload the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, etc.).

---

## Quick copy-paste (all steps at once)

```bash
mkdir creature-collector && cd creature-collector
mkdir src
# --- copy all files into the right places ---
npm install
npm run dev
```

---

## Remaining features to add before full release

See `PROJECT_REFERENCE.md` Section 15 for the full list. The three highest-value items:

| Feature | Effort | Notes |
|---|---|---|
| Meta-progression | Medium | localStorage — unlock creatures between runs |
| Deferred relics | Small | Iron Will / Echo Stone / Momentum Gem need combatFlags |
| Ascension modes | Medium | Difficulty modifier stack at run start |
