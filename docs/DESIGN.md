# Purrtype — design doc (v0.1)

A cozy, rhythm-based touch-typing game. You type a story in time with the music while a cat plays with a toy in the background.

## 1. Decisions locked in (from the planning Q&A)

| Topic | Decision |
|---|---|
| Stack | Web: TypeScript, Canvas 2D, Web Audio. No bundler: `tsc` emits ES modules to `dist/`. |
| Beat rule | **Beat grid with timing window.** Each keystroke is compared with the nearest grid slot. Perfect/Good on-beat keys build the combo; off-beat keys score little but never break it. |
| Miss rule | **First wrong key in a word = miss.** −1 heart, combo reset, music thins. You are invulnerable for the rest of that word: wrong keys are ignored, you still have to type the right letters, and those letters score 0. |
| Music | **Stems** (melody / pad / bass / drums) running in sync. Procedural placeholder music ships in the box; real stems can be dropped in per section. |
| Text | **Story chapters with controlled vocabulary.** Each level declares a letter pool and a test checks that the story only uses it. |
| Cat link | **Toy on the floor.** The cat bats its toy on every on-beat key (higher on Perfect), squashes on the beat, and with a combo of 10+ the toy bounces along with the music. A miss knocks the toy across the room and the cat chases it; recovering the combo brings it back. Hearts show as the cat's mood (sleepy eyes, droopy ears and tail). |
| Shop | Cosmetic only: hats, collars, toys, fur colour, room decor. Saved in `localStorage`. |
| Art | Late-night lofi pixel art. Drawn in code at ~180 px tall and scaled up by a whole number with smoothing off (`src/render/cat.ts`), no image assets. UI uses Pixelify Sans and VT323 with notched pixel borders. |

## 2. Core loop

```
Menu → Level select → Level → Results (yarn + stars) → Shop (spend yarn) → next level
```

* **Currency:** *yarn*, earned at the end of a level (`score / 200`). A failed level pays out a reduced amount.
* **Hearts:** 5 per level. A level fails at 0 hearts.
* **Levels are all open:** players can pick any level; stars just record how well each one went.

### Sections and levels
* A **section** has one BPM, one musical key and one theme (colours).
* Levels inside a section get harder **without changing the BPM** by changing:
  1. the **letter pool and word length** (text),
  2. the **timing window**, which tightens,
  3. the **grid**: `1` = one slot per beat (quarter notes), `2` = two slots per beat (eighth notes).

| Section | BPM | Keys |
|---|---|---|
| 1 Home Row | 70 | `asdfghjkl` |
| 2 Top Row | 80 | home + `qwertyuiop` |
| 3 Everything | 90 | all letters, capitals, `. , ! '` |

## 3. The beat mechanic

* Beat 0 is the first note of the music. A 4-beat count-in runs first and typing starts on beat 4.
* **Beat guide** (`src/render/slider.ts`, drawn from `drawSlider` in `src/screens/play.ts`): a small pixel slider hovers over the letter you're on. Its knob glides at a steady speed and reaches an end exactly on each judged slot (each half-beat in double-time levels). The coloured zones at the ends are the real scoring windows (gold = Perfect, teal = Good), and the knob and the cursor flash at that moment. Popups say *early* / *late*. It is shifted by the audio offset so it matches what the player hears.
* **Spaces:** every line ends with a space, so every word, including the last one on a line, is finished by pressing space. Spaces you still have to type show a small underscore.
* **Levels:** 5 sections of 6 short levels (3 lines each). BPM rises by section: 70, 80, 90, 105, 120. Every key is judged against the beat; speed rises with the BPM and with double time (two letters per beat), and the timing window tightens within each section. Story text uses Atkinson Hyperlegible Mono (a readability-first monospace font) in both levels and practice; menus keep the Pixelify Sans pixel font.
* **Layout in play:** the room's floor is raised, and the typing panel sits on it at the bottom of the screen, so the whole room and the cat stay visible above it.
* **Cloud (optional):** Google sign-in syncs saves and enables per-level leaderboards via Firebase. See [CLOUD.md](CLOUD.md).
* **Practice mode** (`src/game/practice.ts`, `src/screens/practice.ts`): free typing, no rhythm, like a typing race. A shuffled ~80-word cozy story, shown in full in a big panel at the top (the room and cat stay visible below); mistakes must be fixed with Backspace (Ctrl+Backspace deletes a word; you can't delete into a finished word). No hearts, and the music never thins. Clean words build the combo; the first mistake in a word resets it and sends the toy flying, and 3 clean words bring it back. Results: WPM (5 characters = 1 word), accuracy (correct keystrokes / all keystrokes), time, mistakes, best combo, and a score of `wpm × accuracy³ × 10`. Best score, WPM and accuracy are saved under `progress.practice` (synced) and posted to the `practice` leaderboard.
* **Typing help:** levels from Top Row on carry one short, optional `tip` (finger placement, posture, a reminder that comfort beats rules), shown until the level is first cleared. An on-screen keyboard (`src/screens/keyboard.ts`) highlights the next key, tints keys by finger and marks the F/J bumps. Two holographic hands rest on the home row over it; the finger for the next key reaches over and lights up (both thumbs for space). While the keyboard shows, the text tip line is hidden. It appears on the Home Row levels only, so players later settle into whatever feels comfortable. Settings → Keyboard guide: *Home Row only* (default), *Always* or *Off*.
* **Timing:** the visuals and the judge both convert times with one function (`heardAt` in `src/audio/engine.ts`), so they can't drift apart. Device latency (speakers, Bluetooth) is measured by **Settings → Calibrate timing**: 16 clicks, tap along, and the median delay becomes the audio offset (`src/game/calibrate.ts`).
* A key press is converted to **audio-clock time** (`audio.keyTimeToCtx`), which uses `getOutputTimestamp()` so what the player *hears* is what is judged. The player can correct for device latency with the **audio offset** setting.
* `judgeTiming()` (`src/game/beat.ts`):
  * slot interval = `60 / bpm / grid`
  * *good* window = `min(level.windowMs, interval × 0.3)`, *perfect* = half of that
  * otherwise the key is **off**.
* Scoring (`src/game/session.ts`):
  * Perfect 100, Good 60, Off 20; on-beat points are multiplied by the combo multiplier (`1 + 0.5 per 10 combo`, max ×4).
  * Combo counts consecutive on-beat keys. It only resets on a miss.

## 4. Music feedback

All four stems always play, so they stay in sync; only their gains change.

| State | melody | pad | bass | drums |
|---|---|---|---|---|
| Playing well | ● | ● | ● | ● |
| Just missed | ● | | | |
| 4 on-beat keys since the miss | ● | | ● | |
| 8 on-beat keys since the miss | ● | ● | ● | ● |

Layers drop fast (0.12 s) and come back slowly (0.4 s). Tunables: `RECOVER_BASS` and `RECOVER_FULL` in `session.ts`.

## 5. The cat (`src/render/cat.ts`)

Everything is drawn in code, driven by a few inputs: `beatPos`, `combo`, `heartsFrac`, `recovering`, and events `hit(grade)`, `miss()`, `recovered()`.

* **Toy** is a spring-driven pendulum whose target swings `cos(π·beat)`, so it reaches the end of its swing on every beat. Amplitude grows with the combo.
* **Perfect hit:** the cat swats and sparkles appear.
* **Miss:** the string snaps. The toy flies off with real bounce/roll physics and the cat chases and keeps batting it away.
* **Recovered:** the toy is reeled back to the string.
* **Hearts → mood:** eyelids and ears droop as hearts are lost.
* **Cosmetics** are layers drawn from the equipped ids (`hat`, `collar`, `toy`, `fur`, `decor`).

## 6. File map

```
index.html, styles.css
src/main.ts                 boot
src/core/                   events, dom helper, screen navigator, save/load, shared types
src/audio/engine.ts         AudioContext, buses, volume, key time → audio time
src/audio/music.ts          stem director (procedural placeholder + file stems), beat clock
src/audio/sfx.ts            small synthesised effects
src/data/sections.ts        sections, levels, story text, music definitions, themes
src/data/shop.ts            shop catalogue
src/game/beat.ts            timing judge (pure)
src/game/typing.ts          cursor / word-miss rules (pure)
src/game/session.ts         hearts, combo, score, music state, results (pure)
src/render/cat.ts           procedural cat scene
src/screens/*               menu, settings, levels, shop, play
tests/run.mjs               logic tests + story letter-pool check (`npm test`)
```

`src/game/*` and `src/data/*` have no DOM or audio imports, so they are easy to unit test.

## 7. Writing levels

1. Add a level to a section in `src/data/sections.ts` with a `pool` (allowed characters) and `lines`.
2. Keep lines short (≤ ~40 chars). Only the current and the next line are shown.
3. Run `npm test`. It fails if any line uses a character outside its pool.
4. The stories are placeholders. Replace them freely.

## 8. Real music stems

In `sections.ts`, set `music.stems`:

```ts
stems: { melody: 'audio/s1/melody.ogg', pad: 'audio/s1/pad.ogg', bass: 'audio/s1/bass.ogg', drums: 'audio/s1/drums.ogg' }
```

Requirements: same length, same BPM as the section, loop-ready, and beat 0 on sample 0.

## 9. Not built yet / good next steps

* A latency calibration screen (tap along to a click, store the average as `audioOffsetMs`).
* Section-end story reward / cutscene.
* Cat idle behaviours (yawn, groom, nap on low hearts).
* Mobile layout (the game assumes a physical keyboard).
* More levels, more shop items, more music variety per section.

## 10. Open questions for the next planning round

1. Should key finger guidance (a hand/keyboard diagram highlighting the next key) be shown, and should it fade out as levels advance?
2. Should off-beat typing eventually cost something (e.g. a slower combo build), or stay free?
3. What happens on a failed level: retry only, or also a "practice mode" without hearts?
4. Is there an ending to the cat's story, or is it endless sections?
5. Do shop items ever need to be earned by achievements instead of bought?
6. Which languages / keyboard layouts should be supported?
