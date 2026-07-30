export const TTM_STAGES = [
  { name: "Precontemplation", key: "precontemplation", position: 0 },
  { name: "Contemplation", key: "contemplation", position: 1 },
  { name: "Preparation", key: "preparation", position: 2 },
  { name: "Action", key: "action", position: 3 },
];

export const DECISION_ORDER = {
  Continue: 0,
  Soften: 1,
  Checkpoint: 2,
  Escalate: 3,
};

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const round = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const DIAGNOSTIC_CHECK_PATTERN =
  /\b(?:are you safe|hurting yourself|hurt yourself|suicid(?:e|al)|self[- ]harm)\b/i;

function guardGeneratedAssistant(decision, assistant, directHarm) {
  if (
    decision === "Checkpoint" &&
    DIAGNOSTIC_CHECK_PATTERN.test(assistant)
  ) {
    return "Do you want to keep going with one small step, pause and come back to this, or involve someone you trust?";
  }

  if (decision === "Escalate" && !directHarm?.present) {
    return "This seems like more than I can help with. Please contact someone you trust or local emergency support now. I’ll stop the bill task here.";
  }

  return assistant;
}

const featureValue = (features, currentName, legacyName) =>
  clamp(features?.[currentName] ?? features?.[legacyName]);

export function stageName(position) {
  const stage = TTM_STAGES.reduce((nearest, candidate) =>
    Math.abs(candidate.position - position) <
    Math.abs(nearest.position - position)
      ? candidate
      : nearest,
  );

  return stage.name;
}

export function normalizeStageProbabilities(
  probabilities,
  stagePosition = 0,
  stageConfidence = 0.5,
) {
  const supplied = Object.fromEntries(
    TTM_STAGES.map(({ key }) => [
      key,
      Math.max(0, Number(probabilities?.[key]) || 0),
    ]),
  );
  const suppliedTotal = Object.values(supplied).reduce(
    (total, value) => total + value,
    0,
  );

  if (suppliedTotal > 0) {
    return Object.fromEntries(
      Object.entries(supplied).map(([key, value]) => [
        key,
        round(value / suppliedTotal, 4),
      ]),
    );
  }

  const position = clamp(stagePosition, 0, 3);
  const spread = 0.28 + (1 - clamp(stageConfidence)) * 0.72;
  const weights = TTM_STAGES.map(({ position: stage }) =>
    Math.exp(-0.5 * ((stage - position) / spread) ** 2),
  );
  const total = weights.reduce((sum, value) => sum + value, 0);

  return Object.fromEntries(
    TTM_STAGES.map(({ key }, index) => [
      key,
      round(weights[index] / total, 4),
    ]),
  );
}

function probabilityPosition(probabilities) {
  return TTM_STAGES.reduce(
    (total, stage) =>
      total + stage.position * (probabilities[stage.key] ?? 0),
    0,
  );
}

function mostLikelyStage(probabilities) {
  return TTM_STAGES.reduce((highest, stage) =>
    (probabilities[stage.key] ?? 0) >
    (probabilities[highest.key] ?? 0)
      ? stage
      : highest,
  ).name;
}

export function scoreComb(features = {}) {
  const capability = clamp(
    0.25 * featureValue(features, "lengthDrop", "messageLengthDrop") +
      0.25 * featureValue(features, "tenseCollapse") +
      0.3 * featureValue(features, "treatmentSelfBlame") +
      0.1 * featureValue(features, "speechRateDrop") +
      0.1 * featureValue(features, "pauseRatioElevated"),
  );

  const opportunity = clamp(
    0.5 * featureValue(features, "cannotTalkLong", "cantTalkLong") +
      0.3 * featureValue(features, "lateNight") +
      0.2 * featureValue(features, "interruption", "interruptionMentioned"),
  );

  const motivation = clamp(
    0.4 * featureValue(features, "minimalAcknowledgement", "minimalAcknowledgment") +
      0.3 * featureValue(
        features,
        "noQuestionInLastTwoTurns",
        "noQuestionLastTwoTurns",
      ) +
      0.3 * featureValue(features, "monopitch"),
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

function isBillInspectionRequest(text = "") {
  return /\b(itemi[sz]ed bill|statement|EOB)\b/i.test(text) &&
    /\b(check|inspect|look at|review|find|open)\b/i.test(text);
}

function harmRequiresEscalation(directHarm = {}) {
  if (!directHarm.present || directHarm.figurative) {
    return false;
  }

  const actionOrPlan = ["plan", "action_in_progress"].includes(
    directHarm.intentLevel,
  );
  const directIntent = directHarm.intentLevel === "intent";
  return (
    actionOrPlan ||
    directHarm.immediacy === "immediate" ||
    (directHarm.repeated && directIntent)
  );
}

function hasRecentCheckpoint(scored) {
  return scored.slice(-3).some((turn) => turn.decision === "Checkpoint");
}

export function scoreConversation(rawTurns) {
  const scored = [];

  for (const raw of rawTurns) {
    const previous = scored.at(-1);
    const twoBack = scored.at(-2);
    const priorAssistantTurns = scored.slice(-2);
    const noQuestionLastTwoTurns = Boolean(
      previous && !raw.user.includes("?") && !previous.user.includes("?"),
    )
      ? 1
      : 0;
    const billExposure = priorAssistantTurns.some((turn) =>
      isBillInspectionRequest(turn.assistant),
    );
    const normalizedFeatures = {
      ...raw.features,
      noQuestionInLastTwoTurns: noQuestionLastTwoTurns,
      billExposure,
    };
    const comb = scoreComb(normalizedFeatures);
    const ttmApplicable = raw.ttmApplicable !== false;
    const inferredStageProbabilities = normalizeStageProbabilities(
      raw.stageProbabilities,
      raw.stagePosition,
      raw.stageConfidence,
    );
    const stageProbabilities = ttmApplicable
      ? inferredStageProbabilities
      : previous?.stageProbabilities ?? inferredStageProbabilities;
    const stagePosition = probabilityPosition(stageProbabilities);
    const stageConfidence = Math.max(...Object.values(stageProbabilities));
    const stageRegression = Boolean(
      ttmApplicable && previous && previous.stagePosition - stagePosition >= 0.6,
    );
    const sustainedRegression = Boolean(
      ttmApplicable &&
        previous &&
        twoBack &&
        twoBack.stagePosition > previous.stagePosition &&
        previous.stagePosition > stagePosition &&
        twoBack.stagePosition - stagePosition >= 1,
    );
    const sustainedCapabilityGap = Boolean(
      previous && previous.capability >= 0.6 && comb.capability >= 0.6,
    );
    const sustainedAbsolutist = Boolean(
      previous &&
        (previous.absolutist ?? 0) > 0.05 &&
        (raw.absolutist ?? 0) > 0.05 &&
        (raw.absolutistTerms ?? 0) >= 2,
    );
    const absolutistSpike = Boolean(
      (raw.absolutistTerms ?? 0) >= 2 &&
        scored.length >= 2 &&
        scored.slice(-2).every((turn) => (turn.absolutistTerms ?? 0) === 0),
    );
    // Opportunity remains observable, but a time or interruption constraint alone
    // must not take over the routing layer.
    const routingGap = Math.max(comb.capability, comb.motivation);
    const checkpointThreshold = billExposure ? 0.45 : 0.6;
    const voiceCompounding = Boolean(
      normalizedFeatures.monopitch != null &&
        normalizedFeatures.pauseRatioElevated != null &&
        normalizedFeatures.monopitch >= 0.6 &&
        normalizedFeatures.pauseRatioElevated >= 0.6 &&
        comb.capability >= 0.6,
    );
    const escalationEvidence = Boolean(
      (stageRegression && comb.capability >= 0.6) ||
        sustainedAbsolutist ||
        (normalizedFeatures.tenseCollapse >= 0.6 && sustainedCapabilityGap) ||
        voiceCompounding,
    );
    const directHarm = raw.directHarm ?? { present: false };

    let decision = "Continue";
    if (harmRequiresEscalation(directHarm)) {
      decision = "Escalate";
    } else if (directHarm.present && !directHarm.figurative) {
      decision = "Checkpoint";
    } else if (escalationEvidence) {
      decision = "Escalate";
    } else if (
      stageRegression ||
      routingGap >= checkpointThreshold ||
      absolutistSpike
    ) {
      decision = hasRecentCheckpoint(scored) ? "Soften" : "Checkpoint";
    } else if (routingGap >= 0.3 || comb.motivation > 0.5) {
      decision = "Soften";
    }

    if (raw.fixedDecision in DECISION_ORDER) {
      decision = raw.fixedDecision;
    }

    scored.push({
      ...raw,
      assistant: raw.guardGeneratedReply
        ? guardGeneratedAssistant(decision, raw.assistant, directHarm)
        : raw.assistant,
      ...comb,
      stagePosition,
      stageProbabilities,
      stageConfidence,
      stage: mostLikelyStage(stageProbabilities),
      ttmApplicable,
      stageRegression,
      sustainedRegression,
      sustainedCapabilityGap,
      sustainedAbsolutist,
      absolutistSpike,
      billExposure,
      decision,
      featureInputs: normalizedFeatures,
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

  const stageProbabilities = Object.fromEntries(
    TTM_STAGES.map(({ key }) => [
      key,
      round(
        weighted.reduce(
          (total, turn) =>
            total +
            (turn.stageProbabilities?.[key] ?? 0) * turn.aggregateWeight,
          0,
        ) / weightTotal,
        4,
      ),
    ]),
  );
  const stagePosition = probabilityPosition(stageProbabilities);
  const latest = turns.at(-1);
  const highestDecision = turns.reduce((highest, turn) =>
    DECISION_ORDER[turn.decision] > DECISION_ORDER[highest.decision]
      ? turn
      : highest,
  );

  return {
    stagePosition: round(stagePosition),
    stageProbabilities,
    stage: mostLikelyStage(stageProbabilities),
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

export function aggregateStageProbabilities(turns) {
  return summarizeConversation(turns).stageProbabilities;
}
