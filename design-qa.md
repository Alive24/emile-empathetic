# Design QA — Conversation Measurement Prototype

## Visual truth

- Selected reference: `/Users/chuntengxiao/.codex/generated_images/019fb408-97e1-7380-873d-f6033710d185/call_qygj9DB8cw9YOw6TZVhmC7TA.png`
- Reference image: 1487 × 1058 px.
- Implementation evidence: `/Users/chuntengxiao/GitHub/emile-empathetic/implementation-1440x1024.png`
- Comparison evidence: `/Users/chuntengxiao/GitHub/emile-empathetic/qa-comparison.png`
- Responsive evidence: `/Users/chuntengxiao/GitHub/emile-empathetic/implementation-mobile-390x844.png`

## Captured state

- Viewport: 1440 × 1024 CSS px at DPR 1.
- App state: first four seeded turns visible; current decision is `Checkpoint`.
- Selected evidence: newest turn.
- All three Flint charts reported ready.
- Full-resolution side-by-side comparison was sufficient for inspecting the primary analysis panels, decision strip, and live ledger; no separate focused crop was required.

## Intentional differences from the selected reference

- The source visual used one top-level trajectory and a dominant horizontal ledger. The implementation follows the refined brief: separate TTM and COM-B analysis panels, a model-belief density distribution, and a four-state decision strip.
- The evidence ledger is newest-first so the current live turn remains visible after the charts.
- The source waveform rail is represented by an interactive microphone control plus a waveform icon.
- Scores differ from the concept because the prototype uses the requested formula-driven fixtures rather than decorative placeholder values.

## QA history

### P0

- Fixed a React/Vega DOM ownership conflict by giving Vega a dedicated host element.
- Fixed the generated density mark when Flint returned a string-valued mark.

### P1

- Corrected the two-turn no-question history input.
- Adjusted the fourth stage fixture so it classifies as Precontemplation and demonstrates regression.
- Reordered the ledger newest-first and tightened panel height so live evidence appears in the primary viewport.
- Removed a redundant mark colour override that produced a Vega warning.

### P2

- Shortened narrow-stage labels for chart legibility.
- Fixed the title wrapping at mid-sized desktop widths.
- Added compact mobile stacking and verified no horizontal overflow at 390 × 844.

## Required surface review

- Typography: clear hierarchy; labels, chart annotations, and numeric values remain legible on the dark surface.
- Spacing/layout: analysis panels align to the source visual rhythm; controls and decision states retain separation at desktop and mobile widths.
- Colour/tokens: restrained navy surface with cyan, amber, violet, coral, and teal signal colours; no unintentional gradients.
- Assets: Phosphor icons are used for all interface symbols; no placeholder or hand-drawn assets.
- Copy/content: inference is explicitly framed as behavioural measurement rather than diagnosis, and the density chart is labelled as an ordinal model-belief approximation.

## Browser evidence

- Initial render: three charts ready, no horizontal overflow, no console errors or warnings.
- Interactions checked: microphone toggle, formula reveal, next turn, reset/restart path.
- Next-turn state reached `Escalate` with the sustained-regression fixture.
- Responsive render checked at 390 × 844.

## Result

passed
