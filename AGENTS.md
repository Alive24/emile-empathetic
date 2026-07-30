# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Active visual and product direction

- Keep two first-class views without a global navigator: place `Lite replay` beside `Live analysis` and `Turn ledger`, and provide a clear `Return to ledger` button inside replay.
- Use the approved warm Emile visual language across both views: warm off-white background, clean sans-serif, flat paper-like cards, hairline borders, generous whitespace, and restrained semantic colour.
- Preserve the detailed view's persistent microphone rail, Live analysis / Turn ledger tabs, Flint charts, recording, OpenAI inference, ElevenLabs transcription, and reply playback.
- Stream the model-generated assistant reply into the provisional ledger row. Never substitute canned holding copy while analysis is running.
- Keep the replay view front-end-only with scripted scenarios, one turn revealed per click, state bars, and an eleven-step trajectory strip.
- In Lite replay, fill the trajectory strip left-to-right as turns appear and automatically scroll to the page bottom after each new turn.
- Treat the prototype as a model-measurement demonstration, not a clinical or production product.
- Every visible turn must show TTM classification, COM-B gaps, assistant-response appropriateness, and the resulting four-state decision.
- Use Microsoft Flint for the TTM observation, TTM belief-distribution, and COM-B trajectory charts.
- Opportunity gap may be displayed at full scale but must not drive escalation by itself.

## Master build-flow context

Use [Emile master build flow · MD](https://docs.google.com/document/d/1B93qEevx2LaaLJi0I3R6tP2j_BTHhqXDnLqS2PGxmY8/edit) as the domain and behavioral reference for the prototype.

- Primary demo domain: settling medical bills after the death of someone close, in a US context and American English.
- Treat the user as a capable adult handling difficult practical work—not as a patient, case, or diagnostic subject.
- The standout domain signal is `billExposure`: when the assistant asks the user to inspect an itemized bill, statement, or EOB, mark the following two turns as an agent-induced risk window and lower the checkpoint gap threshold from `0.60` to `0.45`.
- Add treatment-decision self-blame as a narrow domain feature. It contributes `0.30` to the medical-bills capability score and must not be broadened into general sentiment inference.
- For the medical-bills demo variant, use:
  - `capability = 0.25 × lengthDrop + 0.25 × tenseCollapse + 0.30 × treatmentSelfBlame + 0.10 × speechRateDrop + 0.10 × pauseRatioElevated`
  - `opportunity = 0.50 × cannotTalkLong + 0.30 × lateNight + 0.20 × interruption`
  - `motivation = 0.40 × minimalAcknowledgement + 0.30 × noQuestionInLastTwoTurns + 0.30 × monopitch`
- Voice signals are measured only against the conversation's rolling personal baseline, never population norms.
- TTM stage rules are ordinal and conservative. If no stage matches cleanly, retain the previous stage; do not invent a classification.
- A spike is a feature that crosses into elevated after at least two normal turns. A continuously elevated feature is not a new spike.
- A sustained gap is any gap at or above `0.60` for two or more consecutive turns.
- Decision thresholds for the medical-bills variant:
  - `Continue`: stage stable and every gap below `0.30`.
  - `Soften`: any single gap in `[0.30, 0.60)`, or motivation alone above `0.50`.
  - `Checkpoint`: stage regression, any gap at or above `0.60`, any gap at or above `0.45` during the `billExposure` window, or an absolutist spike of at least two terms after two clean turns.
  - `Escalate`: compounding evidence only—regression with capability at or above `0.60`; sustained absolutist ratio above `0.05`; tense collapse with a sustained capability gap; or, in voice mode, monopitch plus high pause ratio plus capability at or above `0.60`.
- Escalation must never be triggered by one keyword or by opportunity alone.
- The observability UI must expose extracted features, all three COM-B gaps, TTM stage, trajectory flags, `billExposure`, and the resulting state. Showing the reasoning is a core demo requirement.
- State behavior:
  - `Continue`: answer the practical question normally and offer a concrete next step without unsolicited emotional commentary.
  - `Soften`: deliver one piece of information, use shorter sentences, introduce no new load, and prefer one optional next step over another question.
  - `Checkpoint`: ask one plain, non-diagnostic, non-yes/no choice about continuing or pausing, then stop. If the user continues, return to softened delivery and do not checkpoint again for at least three turns.
  - `Escalate`: stop task mode, state directly that the situation is beyond the tool, point to a person or appropriate human support, avoid diagnosis or trigger explanations, and keep the response to four sentences or fewer.
- Assistant copy constraints: plain language, no therapeutic filler, no feeling-summary preamble, at most one question per reply, and no more than 120 words unless the user requests detail.
- Never give legal, financial, tax, or medical advice; never tell someone whether they personally owe a deceased person's medical debt.
- Essential adversarial fixtures:
  - baseline practical frustration remains `Continue`;
  - drift demonstrates `Soften → Checkpoint → Escalate`;
  - calm crisis escalates without distress vocabulary;
  - hyperbole does not escalate when engagement and stage remain stable;
  - one upbeat turn does not reset a slow decline;
  - direct frustration with the tool checkpoints rather than escalates;
  - avoidance-motivated overpayment of a possibly unowed medical bill checkpoints.
- Never cut from the demo: the rubric ledger, calm-crisis adversarial case, `billExposure` flag, medical-debt liability limit, or four-state decision layer.
