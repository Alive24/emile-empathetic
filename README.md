# Emile (Behavioral Outlier Detector)

**Emile is a guardrail that listens to how someone is talking, not just what they're saying — so an AI assistant knows when to slow down, when to check in, and when to stop helping altogether.
Because nobody in crisis announces it. They just go quiet, and every piece of software on the market takes 'I'm fine' at face value**

Built for Track 2 (Guardrails) of the Empathetic Agents hackathon — EverSettled × ElevenLabs × Lovable.

---
## The person using it

Aged roughly 30–60, has just lost a parent, partner, or sibling, and is now the one responsible for the paperwork
Wants a specific answer, not support — is this bill mine, what does this letter mean, why am I still being billed three months on
Competent, and would be offended by being treated as a patient or a case
Often doing this at 11pm on a phone, because that's the only time they can face it
Can't separate the admin from the grief — opening a $14,000 statement is both at once
Asked how they're doing, will say "fine." Sometimes true, sometimes not, and they often can't tell you which

The business deploying it

Runs an AI agent in bereavement, probate, insurance claims, or medical billing — EverSettled, funeral providers, estate platforms, hospital patient-financial-services, life insurers
Real need: demand for help with this paperwork exceeds the human capacity to give it
Real exposure: an agent that cheerfully continues through form fields while someone quietly falls apart is a duty-of-care problem, not just poor UX
Current option is a keyword filter — catches the loud cases, misses the quiet ones, which are the ones that matter
Buying three things: pattern-based detection rather than vocabulary matching, four graded states instead of a binary helping/hard-stop flip, and an inspectable score trail for every decision
The score trail is what a compliance or clinical-governance review will actually ask to see

## The problem

Self-report fails exactly when it matters most. Denial, masking, shock and shutdown all produce a person who says "I'm fine" while every other signal says otherwise. Keyword-and-sentiment guardrails are calibrated for the opposite failure mode: they catch people who *sound* distressed and miss people who are calm, articulate and in crisis.

This detects the gap between what's said and what's happening.

The domain is settling medical bills after the death of someone close — a context where people are handed high-stakes paperwork during the worst month of their life, and where the practical task and the emotional load are impossible to separate.

## The approach

Two behavior-change frameworks:

- **TTM (Transtheoretical Model)** tells you *where someone is in a process* — precontemplation, contemplation, preparation, action.
- **COM-B** tells you *whether they currently have what they need to move forward* — capability, opportunity, motivation.

TTM alone tells you the state. COM-B alone tells you the capacity. Together, and tracked as a **delta rather than a snapshot**, they distinguish stable-if-sad from a genuine mid-conversation shift. That distinction is the whole product.

## Architecture

```
User message
     │
     ▼
[1] Feature extraction ──── linguistic + behavioral signals, per message
     │
     ▼
[2] TTM stage classifier ── precontemplation / contemplation / preparation / action
     │
     ▼
[3] COM-B gap scorer ────── capability, opportunity, motivation (0–1 each)
     │
     ▼
[4] Trajectory tracker ──── current turn vs. rolling window (last 3–5 turns)
     │
     ▼
[5] Decision layer ──────── continue / soften / checkpoint / escalate
     │
     ▼
Agent response (tone + content shaped by decision state)
```

### [1] Feature extraction

Six signals, chosen deliberately rather than thrown at a sentiment model:

| Signal | What it measures | Elevated when |
|---|---|---|
| **Absolutist ratio** | `count(absolutist_words) / total_words` — *always, never, nothing, no point, can't, hopeless, worthless…* | ratio > 0.03, or raw count ≥ 2 in one message |
| **Tense collapse** | Present tense used about a person or relationship that has ended. Under-researched relative to absolutist language, and a strong precontemplation marker in grief specifically. | narrow yes/no LLM classification returns yes |
| **Topic deflection** | Per-turn classification into practical / emotional / avoidant, scored on the *transition pattern* rather than the label | agent raises emotional content and reply is practical-only, 2+ consecutive turns |
| **Message length delta** | Rolling 3-turn word-count average | current turn < 40% of average (drop) or > 250% (spike — rambling after clipped replies is a pattern too) |
| **Question type** | Practical ("what forms do I need") vs. existential ("what's the point of any of this") | existential question present — weighted above a single absolutist word |
| **Response latency** | Where the interface exposes it | > 20s before answering a direct emotional question |

Regex is too fragile for tense collapse, so it uses a single narrow, inspectable LLM call per turn — one yes/no question, not "detect crisis." A narrow classifier holds up under questioning; an opaque one doesn't.

### [2] TTM stage classifier

Rules-based, ordered 0–3.

| Stage | Idx | Rule | Agent implication |
|---|---|---|---|
| Precontemplation | 0 | Deflection on 2+ consecutive turns **and** zero emotional keywords **and** (tense collapse or avoidant) | Don't push emotional content. Practical, warm, low-pressure. |
| Contemplation | 1 | Topic oscillates practical/emotional across the window **and** an existential question appears | Reflect back gently, don't rush to resolution. |
| Preparation | 2 | Practical questions increasing, deflection flags decreasing | Structured next steps are appropriate. |
| Action | 3 | Direct task requests, absolutist ratio near zero, length stable or increasing | Full task mode. |

If no rule matches cleanly, hold the previous stage rather than guessing.

### [3] COM-B gap scores

Weighted sums, capped at 1.0:

```
capability  = 0.3·(length drop) + 0.3·(tense collapse) + 0.2·(speech rate drop) + 0.2·(pause ratio)
opportunity = 0.5·("can't talk long") + 0.3·(late-night timestamp) + 0.2·(interruption mentioned)
motivation  = 0.4·(minimal acknowledgment tokens) + 0.3·(no question in last 2 turns) + 0.3·(monopitch)
```

Opportunity is deliberately low-weight — it's the softest signal and never drives escalation alone.

### [4] Trajectory tracker

The single most important design decision: **score the delta, not the snapshot.**

- **Stage regression** — current stage index < previous turn's index.
- **Feature spike** — a signal that sat in the normal band for 2+ turns crosses into elevated. Weighted above a signal that's been elevated the whole conversation.
- **Sustained gap** — any COM-B gap ≥ 0.6 across 2+ consecutive turns. A stuck person, not a bad message.

### [5] Decision layer

Four states, not binary. Each maps to a distinct system-prompt block, so the state changes what the agent *does*, not just what it logs.

| State | Trigger | Behavior |
|---|---|---|
| **Continue** | Stage stable, all gaps < 0.3 | Normal flow, full task capability. No emotional commentary they didn't ask for. |
| **Soften** | Any single gap in [0.3, 0.6), or motivation gap > 0.5 | One piece of information per reply. No lists. Nothing new introduced. Don't ask how they are, don't comment on their tone — just be easier to read. |
| **Checkpoint** | Stage regression, or any gap ≥ 0.6, or absolutist spike | One question before continuing: about what they want to do next, never diagnostic, never yes/no, with stopping as a genuinely available answer. Then silence for at least 3 turns — repeated checking reads as being managed. |
| **Escalate** | (Regression **and** capability ≥ 0.6), **or** absolutist ratio > 0.05 sustained 2+ turns, **or** tense collapse alongside a sustained capability gap, **or** voice markers compounding with a text capability gap ≥ 0.6 | Stop task mode. Say plainly this is more than the tool can help with, point to a person (a doctor, someone they trust, or the 988 Suicide & Crisis Lifeline), and stop. Steady, not gentle — softness here reads as evasion. |

Escalate is an OR of *compounding* conditions rather than a single red-flag keyword. That's what makes it survive the calm-but-crisis case, which trips no keyword list but still shows tense collapse plus a sustained capability gap.

### [6] Voice layer (optional)

Where voice input is available, five DSP features scored against a **rolling personal baseline from the same conversation** — not a population norm:

- Monopitch: F0 standard deviation > 30% below baseline
- Pause ratio: silence / total utterance > 0.35 (elevated), > 0.5 (high)
- Speech rate: syllables/sec down > 25% from baseline
- Energy slope: end amplitude < 60% of start (psychomotor retardation pattern)
- Zero-crossing rate: tie-breaker only, low weight

On output, decision state maps to voice parameters — pacing slows on *soften* and *checkpoint*; on *escalate* the voice gets more direct and steady rather than softer, because steadiness reads as trustworthy in a real crisis and saccharine gentleness reads as evasive.

## Domain-specific handling

- **Bill-exposure flag** — the checkpoint threshold drops for two turns after the agent asks the user to look at a bill. Being shown a number attached to a dead person is a predictable shock point, not a random one.
- **Hard limit on liability** — the agent never confirms personal liability for medical debt. It explains what a term means and what the process usually looks like, then names who is qualified to advise.

## Adversarial test cases

The guardrail is judged on how it holds up against inputs designed to break it. These are built in as fixtures:

1. **Calm crisis** — articulate, composed, no distress vocabulary ("I've worked out exactly what I'm going to do"). Tests over-reliance on emotional-sounding language.
2. **Hyperbole, not crisis** — "this is killing me, these forms are impossible." Tests false-positive rate.
3. **Gradual drift** — decline spread across 6–8 turns with no single sharp signal. Tests whether the trajectory tracker catches slope, not just spikes.
4. **Direct probing** — "are you even paying attention to what I'm saying." Should checkpoint, not escalate.

## Limitations

Thresholds are hand-set from the literature and from a few hours of testing, not calibrated against real transcripts. Voice baselines are per-conversation, so the first few turns are weakly informed. Tense collapse is under-researched compared to absolutist language, and the classifier reflects that uncertainty.

**This is not a crisis service and does not attempt to be one.** It detects that a conversation has exceeded what an assistant should be handling, and hands off. It does not diagnose, does not name what it thinks is happening to someone, and does not treat.
