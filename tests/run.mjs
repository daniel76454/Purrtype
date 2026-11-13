// Logic tests. Run with `npm test` (compiles first, then runs against dist/).
import assert from 'node:assert/strict';
import { SECTIONS } from '../dist/data/sections.js';
import { judgeTiming } from '../dist/game/beat.js';
import { TypingEngine } from '../dist/game/typing.js';
import { GameSession, HEARTS, RECOVER_BASS, RECOVER_FULL } from '../dist/game/session.js';
import { mergeSaves } from '../dist/core/merge.js';
import { defaultSave, normalizeSave } from '../dist/core/storage.js';
import { generatePractice, practiceText, PracticeEngine, practiceScore } from '../dist/game/practice.js';
import { QUOTES } from '../dist/data/quotes.js';
import { calibrationOffset } from '../dist/game/calibrate.js';
import { cleanNickname, randomNickname, NAME_MAX } from '../dist/core/names.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
};

// ---- story letter pools ------------------------------------------------------
test('every level only uses characters from its pool', () => {
  const problems = [];
  for (const s of SECTIONS)
    for (const l of s.levels)
      for (const line of l.lines) {
        const bad = [...new Set([...line].filter((ch) => !l.pool.includes(ch)))];
        if (bad.length) problems.push(`${l.id}: [${bad.join(' ')}] not allowed in "${line}"`);
        if (line.length > 48) problems.push(`${l.id}: line too long: "${line}"`);
        if (line !== line.trim()) problems.push(`${l.id}: stray whitespace in "${line}"`);
      }
  assert.deepEqual(problems, []);
});

test('levels in a section share one BPM and get tighter', () => {
  for (const s of SECTIONS) {
    const w = s.levels.map((l) => l.windowMs);
    assert.deepEqual(w, [...w].sort((a, b) => b - a), `${s.id} windows should not widen`);
  }
});

// ---- beat judging ---------------------------------------------------------------
test('judgeTiming grades by distance to the nearest slot', () => {
  const bpm = 60; // 1s per beat
  assert.equal(judgeTiming(5.0, 0, bpm, 1, 150).grade, 'perfect');
  assert.equal(judgeTiming(5.1, 0, bpm, 1, 150).grade, 'good');
  assert.equal(judgeTiming(5.4, 0, bpm, 1, 150).grade, 'off');
  assert.equal(judgeTiming(4.93, 0, bpm, 1, 150).grade, 'perfect');
  assert.ok(judgeTiming(4.9, 0, bpm, 1, 150).deltaMs < 0);
});

test('judgeTiming window shrinks with a finer grid', () => {
  // grid 2 at 60bpm: 0.5s slots, good window capped at 150ms (30%)
  assert.equal(judgeTiming(1.14, 0, 60, 2, 500).grade, 'good');
  assert.equal(judgeTiming(1.2, 0, 60, 2, 500).grade, 'off');
});

// ---- typing engine ---------------------------------------------------------------
test('typing: first wrong key marks the word, cursor does not advance', () => {
  const e = new TypingEngine(['ab cd']);
  let o = e.handleKey('x');
  assert.equal(o.kind, 'wrong');
  assert.equal(o.firstMiss, true);
  assert.equal(e.index, 0);
  o = e.handleKey('y');
  assert.equal(o.firstMiss, false, 'second wrong key in the same word is free');
  o = e.handleKey('a');
  assert.equal(o.kind, 'correct');
  assert.equal(o.inMissedWord, true);
});

test('typing: missed flag clears at the space, next word can miss again', () => {
  const e = new TypingEngine(['ab cd']);
  e.handleKey('x');
  e.handleKey('a');
  e.handleKey('b');
  const sp = e.handleKey(' ');
  assert.equal(sp.wordDone, true);
  assert.equal(sp.inMissedWord, true);
  assert.equal(e.wordMissed, false);
  const o = e.handleKey('z');
  assert.equal(o.firstMiss, true);
});

test('typing: lines advance and the level finishes', () => {
  const e = new TypingEngine(['ab', 'c']);
  e.handleKey('a');
  const b = e.handleKey('b');
  assert.equal(b.lineDone, false, 'the line is not done until its closing space');
  const o = e.handleKey(' ');
  assert.equal(o.lineDone, true);
  assert.equal(o.wordDone, true);
  assert.equal(e.line, 1);
  const last = e.handleKey('c');
  assert.equal(last.finished, true, 'the text ends on its last letter, no closing space');
  assert.equal(last.wordDone, true);
  assert.equal(e.handleKey('d').kind, 'ignored');
});

test('typing: the last word of a line is finished by space, and can be missed', () => {
  const e = new TypingEngine(['ab', 'c']);
  e.handleKey('a');
  e.handleKey('b');
  const o = e.handleKey('x'); // forgot the space
  assert.equal(o.kind, 'wrong');
  assert.equal(o.expected, ' ');
  assert.equal(o.firstMiss, true);
});

test('typing: modifier / multi-char keys are ignored', () => {
  const e = new TypingEngine(['a']);
  assert.equal(e.handleKey('Shift').kind, 'ignored');
  assert.equal(e.handleKey('Backspace').kind, 'ignored');
});

// ---- session ------------------------------------------------------------------------
const section = { bpm: 60, id: 't' };
const mk = (lines, grid = 1, windowMs = 150) => new GameSession({ id: 'l', name: 'l', grid, windowMs, pool: '', lines }, section, 0);

/** Type `text` with every key exactly on a beat starting at beat `from`. */
function typeOnBeat(s, text, from = 4) {
  [...text].forEach((ch, i) => s.handleKey(ch, from + i));
}

test('session: on-beat typing builds combo and score, no hearts lost', () => {
  const s = mk(['abcdefghij']);
  let result;
  s.on('finished', (r) => (result = r));
  typeOnBeat(s, 'abcdefghij');
  assert.equal(s.combo, 10);
  assert.equal(s.hearts, HEARTS);
  assert.equal(result.completed, true);
  assert.equal(result.stars, 3);
  assert.ok(result.score >= 1000);
  assert.ok(result.yarn > 0);
});

test('session: off-beat keys score a little but do not break the combo', () => {
  const s = mk(['abcd']);
  s.handleKey('a', 4);
  s.handleKey('b', 5.5); // right between beats
  assert.equal(s.combo, 1);
  s.handleKey('c', 6);
  assert.equal(s.combo, 2);
  assert.ok(s.score > 100 + 100);
});

test('session: a miss costs one heart per word, resets combo and thins the music', () => {
  const s = mk(['abcd efgh']);
  const music = [];
  s.on('music', (m) => music.push(m));
  typeOnBeat(s, 'ab');
  s.handleKey('x', 6); // miss
  assert.equal(s.hearts, HEARTS - 1);
  assert.equal(s.combo, 0);
  assert.deepEqual(s.layers(), { melody: 1, pad: 0, bass: 0, drums: 0 });
  assert.equal(music.at(-1).fast, true);
  s.handleKey('y', 6.1); // more wrong keys in the same word are free
  assert.equal(s.hearts, HEARTS - 1);
  assert.equal(s.invulnerable, true);
  // finishing the word types for free: no points, no combo
  const before = s.score;
  s.handleKey('c', 7);
  s.handleKey('d', 8);
  s.handleKey(' ', 9);
  assert.equal(s.score, before);
  assert.equal(s.combo, 0);
  assert.equal(s.invulnerable, false);
});

test('session: music returns in stages as the combo recovers', () => {
  const s = mk(['a '.repeat(14) + 'a']);
  let recovered = false;
  s.on('recovered', () => (recovered = true));
  s.handleKey('x', 4);
  s.handleKey('a', 5); // finish the missed word for free...
  s.handleKey(' ', 6);
  // ...then every on-beat key counts towards recovery
  for (let i = 0; s.recovering; i++) {
    s.handleKey('a', 7 + 2 * i);
    if (s.comboSinceMiss === RECOVER_BASS) assert.deepEqual(s.layers(), { melody: 1, pad: 0, bass: 1, drums: 0 });
    s.handleKey(' ', 8 + 2 * i);
    if (s.comboSinceMiss === RECOVER_BASS && s.recovering) assert.equal(s.layers().bass, 1);
  }
  assert.equal(s.comboSinceMiss >= RECOVER_FULL, true);
  assert.equal(recovered, true);
  assert.deepEqual(s.layers(), { melody: 1, pad: 1, bass: 1, drums: 1 });
});

test('session: five missed words fail the level', () => {
  const s = mk(['a b c d e f g h']);
  let result;
  s.on('finished', (r) => (result = r));
  for (let w = 0; w < HEARTS; w++) {
    s.handleKey('x', 4 + w * 2);
    s.handleKey([...'a b c d e'][w * 2], 5 + w * 2); // finish the word to reset invulnerability
    s.handleKey(' ', 5.5 + w * 2);
  }
  assert.equal(result.completed, false);
  assert.equal(result.stars, 0);
  assert.equal(result.heartsLeft, 0);
});

test('session: audio offset shifts judging', () => {
  const s = new GameSession({ id: 'l', name: 'l', grid: 1, windowMs: 150, pool: '', lines: ['ab'] }, section, 0, 0.1);
  s.handleKey('a', 4.1); // 100ms late, compensated by the offset
  assert.equal(s.combo, 1);
  assert.equal(s.score, 100);
});

// ---- cloud save merging -----------------------------------------------------------------
test('mergeSaves: best progress per level, union of items, newest balance and settings', () => {
  const base = defaultSave();
  const local = {
    ...base,
    updatedAt: 100,
    yarn: 50,
    settings: { ...base.settings, music: 0.2, audioOffsetMs: 40 },
    progress: { a: { stars: 3, bestScore: 900, bestCombo: 10 }, b: { stars: 1, bestScore: 100, bestCombo: 2 } },
    owned: [...base.owned, 'hat.beanie'],
  };
  const remote = {
    ...base,
    updatedAt: 200,
    yarn: 80,
    settings: { ...base.settings, music: 0.9, audioOffsetMs: -30 },
    progress: { a: { stars: 2, bestScore: 1200, bestCombo: 5 }, c: { stars: 2, bestScore: 300, bestCombo: 4 } },
    owned: [...base.owned, 'toy.fish'],
    equipped: { ...base.equipped, toy: 'toy.fish' },
  };
  const m = mergeSaves(local, remote);
  assert.deepEqual(m.progress.a, { stars: 3, bestScore: 1200, bestCombo: 10 });
  assert.ok(m.progress.b && m.progress.c);
  assert.ok(m.owned.includes('hat.beanie') && m.owned.includes('toy.fish'));
  assert.equal(m.yarn, 80, 'the newer save decides the balance');
  assert.equal(m.settings.music, 0.9);
  assert.equal(m.settings.audioOffsetMs, 40, 'audio offset stays with the device');
  assert.equal(m.equipped.toy, 'toy.fish');
  assert.equal(m.updatedAt, 200);
});

test('saves: old single-decor saves become a decor list; merging keeps only owned decor', () => {
  const old = normalizeSave({ owned: ['decor.rug', 'decor.none'], equipped: { decor: 'decor.rug' } });
  assert.deepEqual(old.equipped.decor, ['decor.rug']);
  assert.equal(old.equipped.room, 'room.night');
  assert.ok(!old.owned.includes('decor.none'));
  assert.deepEqual(normalizeSave({ equipped: { decor: 'decor.none' } }).equipped.decor, []);

  const base = defaultSave();
  const local = { ...base, updatedAt: 1, owned: [...base.owned, 'decor.rug'] };
  const remote = { ...base, updatedAt: 2, owned: [...base.owned, 'decor.plant'], equipped: { ...base.equipped, decor: ['decor.plant', 'decor.lamp'] } };
  assert.deepEqual(mergeSaves(local, remote).equipped.decor, ['decor.plant'], 'unowned decor is dropped');
});

// ---- practice mode ------------------------------------------------------------------------
test('practice: generated text is about 80 words in short lines', () => {
  const lines = generatePractice(42);
  const words = lines.join(' ').split(' ').length;
  assert.ok(words >= 75 && words <= 95, `${words} words`);
  assert.ok(lines.every((l) => l.length <= 42 && l === l.trim()));
  assert.deepEqual(generatePractice(42), lines, 'same seed, same text');
});

test('practice: quote texts are ~80 words of whole quotes, all typeable ASCII', () => {
  for (const q of QUOTES) assert.match(q.text, /^[ -~]+$/, q.text);
  let quotes = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const t = practiceText(seed);
    const words = t.lines.join(' ').split(' ').length;
    assert.ok(words >= 75 && words <= 95, `${words} words`);
    if (t.kind === 'quotes') {
      quotes++;
      assert.ok(t.sources.length > 0);
    }
  }
  assert.ok(quotes > 10, 'mostly quotes');
});

test('practice: mistakes block progress until fixed with backspace', () => {
  const e = new PracticeEngine(['ab cd']);
  e.key('a', 0);
  const bad = e.key('x', 100);
  assert.equal(bad.correct, false);
  assert.equal(bad.firstErrorInWord, true);
  assert.equal(e.key('b', 200).correct, false, 'typing on after a mistake is still wrong');
  e.backspace();
  e.backspace();
  assert.equal(e.typed, 'a');
  assert.equal(e.key('b', 300).correct, true);
  const w = e.key(' ', 400);
  assert.deepEqual(w, { kind: 'word', clean: false });
  assert.equal(e.combo, 0, 'a corrected word does not add to the combo');
  assert.equal(e.backspace().kind, 'ignored', "can't delete back into a finished word");
});

test('practice: clean words build the combo, finishing gives wpm, accuracy and score', () => {
  const e = new PracticeEngine(['ab cd', 'ef']);
  // 12 seconds for "ab cd ef" (8 chars) with one mistake
  [...'ab cd '].forEach((k, i) => e.key(k, i * 1000));
  assert.equal(e.combo, 2);
  e.key('x', 6000);
  e.backspace();
  e.key('e', 7000);
  const end = e.key('f', 12000);
  assert.deepEqual(end, { kind: 'word', clean: false }, 'the last letter finishes the text');
  assert.equal(e.finished, true);
  const r = e.result();
  assert.equal(r.seconds, 12);
  assert.equal(r.wpm, 8); // "ab cd ef" = 8 chars / 5 / 0.2 min
  assert.equal(r.errors, 1);
  assert.ok(Math.abs(r.accuracy - 8 / 9) < 1e-9);
  assert.equal(r.score, practiceScore(8, 8 / 9));
  assert.equal(r.maxCombo, 2);
});

test('practice: ctrl+backspace deletes the current word only', () => {
  const e = new PracticeEngine(['one two']);
  [...'one tw'].forEach((k) => e.key(k, 0));
  e.backspace(true);
  assert.equal(e.typed, 'one ');
});

// ---- calibration and nicknames ----------------------------------------------------------------
test('calibration: median tap delay becomes the offset, strays ignored', () => {
  const clicks = Array.from({ length: 12 }, (_, i) => i * 0.5);
  const taps = clicks.map((c, i) => c + 0.04 + (i % 2 ? 0.01 : -0.01)); // ~40 ms late
  taps.push(3.24); // a stray tap between clicks
  const r = calibrationOffset(taps, clicks);
  assert.equal(r.offsetMs, 40);
  assert.equal(r.taps, 12);
  assert.equal(calibrationOffset(taps.slice(0, 3), clicks), null, 'too few taps');
});

test('nicknames: cleaned, capped, and random ones look cozy', () => {
  assert.equal(cleanNickname('  <b>Dan</b>!!  '), 'bDanb');
  assert.equal(cleanNickname('x'.repeat(40)).length, NAME_MAX);
  assert.match(randomNickname(() => 0), /^[A-Z][a-z]+[A-Z][a-z]+\d\d$/);
});

console.log(`\n${passed} tests passed`);
