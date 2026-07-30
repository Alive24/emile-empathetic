# Design QA — Emile shared conversation logs

## Visual truth and evidence

- Source visual truth: `/Users/chuntengxiao/.codex/generated_images/019fb445-8c7d-7fa0-b865-52f26303a7cf/exec-ee7f695e-fdf8-49f7-a5e3-54afd4b24ab7.png`
- Detailed implementation: `/private/tmp/emile-integrated-tabs.png`
- Lite replay implementation: `/private/tmp/emile-replay-return.png`
- Mobile implementation: `/private/tmp/emile-mobile-tabs.png`
- Full-view comparison: `/private/tmp/emile-return-reference-comparison.png`
- Turn-ledger log switcher: `/private/tmp/emile-ledger-log-switcher.png`
- Turn-ledger mobile switcher: `/private/tmp/emile-ledger-log-switcher-mobile.png`
- Luna reply-stream fix: `/private/tmp/emile-luna-stream-fixed.png`
- TTM overall probabilities: `/private/tmp/emile-ttm-probabilities-desktop.png`
- TTM mobile probabilities: `/private/tmp/emile-ttm-probabilities-mobile.png`
- TTM per-turn probabilities: `/private/tmp/emile-ttm-probabilities-ledger.png`
- Unified selected-source analysis: `/private/tmp/emile-unified-live-analysis.png`
- Unified selected-source ledger: `/private/tmp/emile-unified-turn-ledger.png`
- Swapped detailed tab order: `/private/tmp/emile-tab-order-swapped.png`
- Off-domain TTM and corrected Luna reply: `/private/tmp/emile-ttm-na-corrected-response.png`
- Calm-crisis TTM decoupling: `/private/tmp/emile-calm-crisis-ttm-decoupled.png`
- Source and replay pixels: 1024 × 1536 each, normalized at DPR 1.
- Detailed viewport: 1440 × 1024 CSS px at DPR 1.
- Mobile viewport: 390 × 844 CSS px at DPR 1.
- Compared state: three gradual-drift turns visible in Lite replay.

## Comparison history

1. The existing dual-view build had a global navigator above the detailed dashboard. The requested refinement moved `Lite replay` into the existing workspace tab row and removed the global bar.
2. The first updated replay capture was placed beside the 1024 × 1536 source visual. The warm canvas, centred column, typography, flat message cards, state bars, and spacing remain faithful.
3. `Return to ledger` is an intentional product addition not present in the source. It uses the existing paper-like button treatment and sits outside the conversation column without moving its centre line.
4. No actionable P0/P1/P2 mismatches remained after the integrated desktop and mobile checks.

## Required fidelity surfaces

- Fonts and typography: DM Sans hierarchy and IBM Plex Mono diagnostic labels remain consistent; no new font styles were introduced.
- Spacing and layout rhythm: removing the global 53 px navigator restores the detailed dashboard to the full viewport. The replay return control does not alter message widths or vertical rhythm.
- Colors and tokens: warm off-white canvas, hairline borders, sage/amber/coral/red state colors, and muted control text are unchanged.
- Image and asset quality: the interface has no raster content or custom image assets; the return icon uses the installed Phosphor icon set.
- Copy and content: the canned “I’m checking this turn against the conversation now.” sentence is absent. Model reply text streams into the assistant cell.

## Interaction and browser evidence

- `Lite replay` appears directly beside `Live analysis` and `Turn ledger`.
- The workspace tab order is `Turn ledger`, `Live analysis`, then `Lite replay`; Turn ledger is the initial active view.
- Opening replay exposes one `Return to ledger` button; using it returns to the selected Turn ledger tab.
- The Turn ledger exposes only `gradual drift`, `calm crisis`, and `frustrated but fine` through one labelled conversation-log selector; the separate `Live conversation` option has been removed.
- Each scripted option renders all eleven turns from the same fixture used by Lite replay, preserves its exact state sequence and evidence tags, and expands the newest turn by default.
- Switching a ledger fixture updates the microphone-rail count, workspace-tab count, elapsed time, conversation-level decision, all three Live analysis charts, and the overall TTM probabilities.
- The selected fixture is the live conversation. Recording and typing append to it without changing the selection; each fixture retains its own appended live turns when switching away and back.
- In browser QA, `frustrated but fine` changed Live analysis from the gradual-drift `Escalate` state to `Continue`. A typed turn increased that source from 11 to 12 turns, appeared in its ledger, updated Live analysis, and remained present after switching to `calm crisis` and back.
- A typed turn keeps `Assistant reply` empty while awaiting the first Luna delta. The user transcript appears only in the `User` column.
- The exact reported transcript, `Why am I killing rabbit`, completed with a distinct Luna reply; the raw endpoint emitted incremental `assistant.delta` events containing that reply.
- Exact and transcript-prefixed assistant echoes are suppressed during streaming, rejected on completion, and retried once through Luna.
- The live TTM extractor returns four normalized stage probabilities. The overall panel and expanded ledger turn show all four percentages, allocated to display as exactly 100%.
- The overall Flint probability curve and all three Flint charts render ready on desktop and mobile; the mobile layout has no horizontal overflow.
- A live analyzed turn completed with probabilities of 17% precontemplation, 15% contemplation, 53% preparation, and 15% action.
- A typed test turn showed its first model text delta at 0.97 seconds, four visible text updates, and the completed rubric at 3.3 seconds.
- The provisional row remained selected and labelled `Streaming with Luna`; the Lite replay control stayed disabled until completion.
- The exact reported turn, `I want to kill a rabbit`, completed with `TTM · not applicable`, `N/A` stage and confidence, no per-turn TTM probabilities, and an explicit note that the turn is excluded from the TTM trajectory.
- The same turn retained COM-B and direct-harm evidence, routed to `Checkpoint`, and produced a distinct Luna reply scoring 100/100: `Do you want to step away and pause, or involve someone you trust?`
- Off-domain turns are excluded from both the Flint TTM observation plot and aggregate stage probabilities. They remain present in the COM-B trajectory and decision layer.
- Calm crisis now uses explicit per-turn TTM positions instead of deriving stage from the guardrail state. Its aggregate is `Action` (44% Action, 26% Precontemplation), while the independent current decision remains `Escalate`.
- The final four calm-crisis turns visibly demonstrate the separation: each is `Action` in the ledger while remaining `Escalate` for response routing.
- The three workspace tabs fit at 390 px with no horizontal overflow.
- Page identity: `http://localhost:4173/`, title `Prototype`.
- Browser console: 0 errors or warnings.
- Framework overlay: none.

## Automated validation

- `npm test`: passed, 17 tests.
- `npm run build`: passed.
- `npm run test:sites`: passed, 4 tests.
- `git diff --check`: passed.

## Final result

passed
