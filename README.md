# Purrtype

A cozy, rhythm-based touch-typing game. Type a story in time with the music while a cat plays with a toy.

Read **[docs/DESIGN.md](docs/DESIGN.md)** first. It has the design decisions, the rules and the file map.

## Run it

```bash
npm install        # installs TypeScript only
npm run build      # compiles src/ → dist/   (or `npm run watch`)
npm run serve      # http://localhost:8080
```

ES modules need a web server, so opening `index.html` straight from disk won't work. Any static server is fine.

Useful URL flag: `?dev=1` unlocks every level.
In the browser console, `purrtype.nav`, `purrtype.scene` and `purrtype.store` are exposed for poking at things.

## Test

```bash
npm test           # compiles, then runs tests/run.mjs
```

Covers the beat judge, the word-miss rules, combo/hearts/music-layer logic, and checks that every story line only uses the letters its level allows.

## Where to start tinkering

| I want to… | Edit |
|---|---|
| Change levels, stories, BPM, difficulty | `src/data/sections.ts` |
| Change scoring, hearts, recovery thresholds, star rules | top of `src/game/session.ts` |
| Change what the music does on a miss | `layers()` in `src/game/session.ts` |
| Use real music stems | `music.stems` in `src/data/sections.ts` (see DESIGN.md §8) |
| Change how the cat reacts | `update()` and `hit()` / `miss()` / `recovered()` in `src/render/cat.ts` |
| Add shop items | `src/data/shop.ts`, then draw them in `src/render/cat.ts` |
| Restyle the UI | `styles.css` |
