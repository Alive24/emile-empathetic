export const TTM_STAGES = [
  { name: "Precontemplation", position: 0 },
  { name: "Contemplation", position: 1 },
  { name: "Preparation", position: 2 },
  { name: "Action", position: 3 },
];

export const DECISION_ORDER = {
  Continue: 0,
  Soften: 1,
  Checkpoint: 2,
  Escalate: 3,
};

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const round = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const DIAGNOSTIC_CHECK_PATTERN =
  /\b(?:are you safe|hurting yourself|hurt yourself|suicid(?:e|al)|self[- ]harm)\b/i;

function guardGeneratedAssistant(decision, assistant) {
  if (
    decision === "Checkpoint" &&
    DIAGNOSTIC_CHECK_PATTERN.test(assistant)
  ) {
    return "Do you want to keep going with one small step, pause and come back to this, or involve someone you trust?";
  }

  if (decision === "Escalate") {
    return "This seems like more than I can help with. Please contact someone you trust or local emergency support now. I’ll stop the bill task here.";
  }

  return assistant;
}

export function stageName(position) {
  const stage = TTM_STAGES.reduce((nearest, candidate) =>
    Math.abs(candidate.position - position) <
    Math.abs(nearest.position - position)
      ? candidate
      : nearest,
  );

  return stage.name;
}

export function scoreComb(features) {
  const capability = clamp(
    0.3 * features.messageLengthDrop +
      0.3 * features.tenseCollapse +
      0.2 * features.speechRateDrop +
      0.2 * features.pauseRatioElevated,
  );

  const opportunity = clamp(
    0.5 * features.cantTalkLong +
      0.3 * features.lateNight +
      0.2 * features.interruptionMentioned,
  );

  const motivation = clamp(
    0.4 * features.minimalAcknowledgment +
      0.3 * features.noQuestionLastTwoTurns +
      0.3 * features.monopitch,
  );

  return {
    capability: round(capability),
    opportunity: round(opportunity),
    motivation: round(motivation),
    behaviorScore: round(capability + opportunity + motivation),
    decisionRisk: round(
      0.45 * capability + 0.1 * opportunity + 0.45 * motivation,
    ),
  };
}

export function scoreConversation(rawTurns) {
  const scored = [];

  for (const raw of rawTurns) {
    const previous = scored.at(-1);
    const twoBack = scored.at(-2);
    const noQuestionLastTwoTurns =
      previous &&
      !raw.user.includes("?") &&
      !previous.user.includes("?")
        ? 1
        : 0;

    const comb = scoreComb({
      ...raw.features,
      noQuestionLastTwoTurns,
    });

    const stageRegression = Boolean(
      previous && previous.stagePosition - raw.stagePosition >= 0.6,
    );
    const sustainedRegression = Boolean(
      previous &&
        twoBack &&
        twoBack.stagePosition > previous.stagePosition &&
        previous.stagePosition > raw.stagePosition &&
        twoBack.stagePosition - raw.stagePosition >= 1,
    );
    const absolutistSpike = Boolean(
      raw.absolutist >= 0.65 &&
        (!previous || raw.absolutist - previous.absolutist >= 0.45),
    );

    let decision = "Continue";

    if (
      sustainedRegression &&
      comb.capability >= 0.62 &&
      raw.absolutist >= 0.7
    ) {
      decision = "Escalate";
    } else if (stageRegression || absolutistSpike) {
      decision = "Checkpoint";
    } else if (comb.capability >= 0.28 || comb.motivation >= 0.32) {
      decision = "Soften";
    }

    scored.push({
      ...raw,
      assistant: raw.guardGeneratedReply
        ? guardGeneratedAssistant(decision, raw.assistant)
        : raw.assistant,
      ...comb,
      stage: stageName(raw.stagePosition),
      stageRegression,
      sustainedRegression,
      absolutistSpike,
      decision,
      featureInputs: {
        ...raw.features,
        noQuestionLastTwoTurns,
      },
    });
  }

  return scored;
}

export function summarizeConversation(turns) {
  if (!turns.length) {
    return null;
  }

  const weighted = turns.map((turn, index) => ({
    ...turn,
    aggregateWeight:
      turn.meaningfulness * (0.7 + (0.3 * (index + 1)) / turns.length),
  }));
  const weightTotal = weighted.reduce(
    (total, turn) => total + turn.aggregateWeight,
    0,
  );
  const weightedAverage = (field) =>
    weighted.reduce(
      (total, turn) => total + turn[field] * turn.aggregateWeight,
      0,
    ) / weightTotal;

  const stagePosition = weightedAverage("stagePosition");
  const latest = turns.at(-1);
  const highestDecision = turns.reduce((highest, turn) =>
    DECISION_ORDER[turn.decision] > DECISION_ORDER[highest.decision]
      ? turn
      : highest,
  );

  return {
    stagePosition: round(stagePosition),
    stage: stageName(stagePosition),
    capability: round(weightedAverage("capability")),
    opportunity: round(weightedAverage("opportunity")),
    motivation: round(weightedAverage("motivation")),
    behaviorScore: round(weightedAverage("behaviorScore")),
    decisionRisk: round(weightedAverage("decisionRisk")),
    appropriateness: Math.round(weightedAverage("appropriateness")),
    decision: latest.decision,
    peakDecision: highestDecision.decision,
    confidence: latest.stageConfidence >= 0.78 ? "high" : "moderate",
  };
}

export function makeBeliefSamples(turns) {
  const offsets = [
    -1.65, -1.35, -1.1, -0.9, -0.72, -0.55, -0.4, -0.27, -0.15, -0.05,
    0.05, 0.15, 0.27, 0.4, 0.55, 0.72, 0.9, 1.1, 1.35, 1.65,
  ];

  return turns.flatMap((turn, turnIndex) => {
    const sampleCount = Math.max(5, Math.round(turn.meaningfulness * 20));
    const spread = 0.18 + (1 - turn.stageConfidence) * 0.6;
    const start = Math.floor((offsets.length - sampleCount) / 2);
    const chosenOffsets = offsets.slice(start, start + sampleCount);

    return chosenOffsets.map((offset, sampleIndex) => ({
      stagePosition: round(
        clamp(turn.stagePosition + offset * spread, 0, 3),
        3,
      ),
      sourceTurn: `Turn ${turnIndex + 1}`,
      sample: sampleIndex + 1,
    }));
  });
}
