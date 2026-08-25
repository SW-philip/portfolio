# Cousins Player — Pacing Breaks and Back Navigation

**Date:** 2026-08-25
**Scope:** `cousins/public/cousins/js/engine.js`, `cousins/public/cousins/css/style.css`, `cousins/public/cousins/stories/shorestorm.json`. Also mirrors into `/home/prepko/games/story-editor-preview.js`, the standalone authoring tool's preview engine.

## Problem

`engine.js` types beats one after another and only stops for a tap at an explicit `wait`, `choice`, or `freeText` beat. Nothing forces a pause otherwise, so a long run of `line`/`say`/`adult`/`power` beats with no `wait` between them plays as an uninterrupted wall of text. A scan of `shorestorm.json` found 10 such runs across the 4 chapters, ranging 11-15 beats long (target is 6-10 before a break).

There's also no way to go back. Once a kid taps past a screen or makes a choice, it's gone — they can't reread the previous beat or reconsider a decision.

## Goals

1. No stretch of narration should run longer than 6-10 beats without a pause.
2. A kid can tap **Back** at any pause point to return to the previous screen, including undoing a choice's effects so they can pick again.
3. Keep `story-editor-preview.js` (the authoring tool's "Play through" preview) behaviorally in sync with the live engine, so pacing looks the same at write time as it does live.

## Content fix: hand-placed waits at the worst spots

Insert an explicit `{"type": "wait"}` beat at a natural scene break inside each of the 10 long runs, splitting each into two chunks of 4-7 beats:

| Chapter | Split after beat index | Break point |
|---|---|---|
| 1 | 4 | House/family intro → "Down the hall, Memaw is waking up..." |
| 1 | 40 | Six cousins head to the beach → low-tide sand description |
| 1 | 66 | Ivory searching in the wind → she finds the shell |
| 1 | 99 | Laine chasing the tide → something rolls against her ankle |
| 2 | 23 | Theo/Wesley staring at the pit → the pit worker approaches |
| 2 | 134 | Cousins gather in the bleachers → their dialogue exchange |
| 3 | 170 | Salt thanks the boys → she turns to Clementine/Laine |
| 3 | 190 | "Nobody decided..." → the drive-home image shift |
| 4 | 92 | Salt's line about the bolt → she hands it over |
| 4 | 143 | Henry/Elijah asleep → Laine and the boys in the other car |

This is a one-time hand edit to `shorestorm.json`; indices are against the file's current on-disk state (which already has unrelated in-progress wording edits from a prior session — those are left untouched).

## Engine change: screen/checkpoint model

`engine.js` currently plays beats via plain recursion (`playBeats` calls itself into `option.beats`). That can't be unwound to support "go back," so the traversal becomes an explicit **frame stack** instead of the JS call stack:

```
frameStack = [{ beats: chapterBeats, index: 0 }]
```

When a `choice` beat resolves, `{ beats: option.beats, index: 0 }` is pushed onto the stack; when a frame's beats run out, it's popped and its parent frame resumes from its next index. This mirrors what recursion already does, just made explicit and snapshot-able.

A **screen** is one run of beats typed since the last pause, ending at:
- an explicit `wait` beat,
- a `choice` beat (ends the screen so options can render),
- a `freeText` beat, or
- a **soft break**: a random threshold of 6-10 narration beats (line/say/adult/power), picked fresh per screen. Standalone `effect` beats are invisible and don't count toward this.

A **checkpoint** is `{ frameStack, effects }`, deep-copied and captured at the start of each screen. `checkpoints[i]` is the state right before screen `i` began.

Flow:
- **Continue** (soft break or explicit wait): save `checkpoints[i+1]` = current state, advance the frame stack, render screen `i+1`.
- **Choice selected**: merge the option's effects into `effects`, push the option's beats as a new frame, save `checkpoints[i+1]`, render screen `i+1`.
- **Free text submitted**: same, writing the value to `effects[beat.stateKey]`.
- **Back** (from screen `i`, `i > 0`): remove screen `i`'s DOM, restore `frameStack`/`effects` from `checkpoints[i-1]`, remove screen `i-1`'s stale DOM, and re-render screen `i-1` from scratch (retyped, ending in a fresh interactive control). Because the restored `effects` is the snapshot from *before* screen `i-1`'s choice (if it ended in one) was made, stepping back past a choice cleanly undoes it — the next pick isn't double-counted.

Each screen renders inside its own wrapper element. When advancing forward (Continue / choice picked / text submitted), the just-completed screen's interactive controls (the Back/Continue buttons, choice buttons, or text input) are removed from its wrapper, leaving only its typed text behind — that's what Back's retype-and-replace targets. Screens before `i-1` are never touched, so a kid can still scroll up to reread anything earlier; Back only rewinds the interactive state by one step.

`playBeats(beats)` still returns a promise that resolves with the final `effects` once the frame stack is exhausted — `play.js`'s chapter-completion flow (posting progress, unlocking the next chapter) is unchanged.

## UI

A small `← Back` button appears next to the primary control whenever there's a previous screen (never on screen 1):
- Next to `[ tap to continue ]` at soft breaks and explicit waits.
- Above/alongside the two choice option buttons at a `choice` pause.
- Alongside the input at a `freeText` pause.

Styled less prominent than the primary action — reusing the dashed, lower-emphasis look already established by `.story-mode-option` — so it doesn't compete with or get mistaken for the real choice.

## Preview tool

`story-editor-preview.js` is a near-duplicate of `engine.js` (no `wait`-vs-soft-break distinction currently, no Back at all) used only by the local authoring tool in `/home/prepko/games` to preview a chapter while writing it. It gets the same screen/checkpoint/soft-break/Back treatment, so an author previewing a new chapter sees the same pacing and controls a kid will see live. `story-editor.html`'s preview panel styling picks up the same Back button treatment.

## Non-goals

- No change to `postProgress`/save semantics — Back is purely client-side, in-memory, mid-chapter navigation. Nothing is persisted until a chapter finishes.
- No reordering or rewriting of story content beyond inserting the 10 waits above.
- No change to the existing "🎬 Story mode" replay button or `knownState` logic.
- No conditional/branching-on-state beats — out of scope, already flagged as future work in the story-editor plan.

## Testing

- `story-editor-model.test.mjs` / `story-editor-preview.test.mjs` (existing test files in `/home/prepko/games`) get coverage added for: soft-break threshold triggering, checkpoint capture/restore, and Back undoing a choice's effects.
- Manual pass: play through all 4 shorestorm chapters in a browser, confirming no run exceeds 10 beats without a pause, and Back works at a soft break, an explicit wait, and a choice.
