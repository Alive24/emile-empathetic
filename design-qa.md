# Design QA — Emile integrated navigation and streaming

## Visual truth and evidence

- Source visual truth: `/Users/chuntengxiao/.codex/generated_images/019fb445-8c7d-7fa0-b865-52f26303a7cf/exec-ee7f695e-fdf8-49f7-a5e3-54afd4b24ab7.png`
- Detailed implementation: `/private/tmp/emile-integrated-tabs.png`
- Lite replay implementation: `/private/tmp/emile-replay-return.png`
- Mobile implementation: `/private/tmp/emile-mobile-tabs.png`
- Full-view comparison: `/private/tmp/emile-return-reference-comparison.png`
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
- Opening replay exposes one `Return to ledger` button; using it returns to the selected Turn ledger tab.
- A typed test turn showed its first model text delta at 0.97 seconds, four visible text updates, and the completed rubric at 3.3 seconds.
- The provisional row remained selected and labelled `Streaming with Luna`; the Lite replay control stayed disabled until completion.
- The three workspace tabs fit at 390 px with no horizontal overflow.
- Page identity: `http://localhost:4173/`, title `Prototype`.
- Browser console: 0 errors or warnings.
- Framework overlay: none.

## Automated validation

- `npm test`: passed, 8 tests.
- `npm run build`: passed.
- `npm run test:sites`: passed, 4 tests.
- `git diff --check`: passed.

## Final result

passed
