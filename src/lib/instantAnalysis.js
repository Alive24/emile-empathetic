const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const includesAny = (text, expressions) =>
  expressions.some((expression) => expression.test(text));

const ABSOLUTIST_PATTERNS = [
  /\bno point\b/i,
  /\bnothing matters\b/i,
  /\beverything is\b/i,
  /\balways\b/i,
  /\bnever\b/i,
  /\bdone with all\b/i,
];

const SELF_BLAME_PATTERNS = [
  /\bmy fault\b/i,
  /\bif i had\b/i,
  /\bi should have\b/i,
  /\bshouldn't have\b/i,
];

export function buildInstantTurn({
  id,
  timestamp,
  transcript,
  durationMs = 0,
  previousTurns = [],
}) {
  const user = String(transcript || "").trim();
  const normalized = user.toLowerCase();
  const words = user.split(/\s+/).filter(Boolean);
  const previousWords = previousTurns.at(-1)?.user
    ?.split(/\s+/)
    .filter(Boolean).length;
  const messageLengthDrop = previousWords
    ? clamp((previousWords - words.length) / previousWords)
    : 0;
  const minimalAcknowledgment =
    /^(ok(?:ay)?|fine|sure|right|done)\.?$/i.test(user) ? 1 : 0;
  const absolutist = includesAny(normalized, ABSOLUTIST_PATTERNS) ? 0.78 : 0;
  const tenseCollapse = includesAny(normalized, SELF_BLAME_PATTERNS)
    ? 0.72
    : absolutist
      ? 0.42
      : 0;
  const cantTalkLong = includesAny(normalized, [
    /\bcan(?:not|'t) talk long\b/i,
    /\bnot much time\b/i,
    /\bkeep (?:it|this) short\b/i,
  ])
    ? 1
    : 0;
  const interruptionMentioned = includesAny(normalized, [
    /\binterrupted\b/i,
    /\bsomeone is here\b/i,
    /\bhave to go\b/i,
  ])
    ? 1
    : 0;
  const personalBaseline = previousTurns.at(-1)?.stagePosition ?? 2;
  const stagePosition = clamp(
    absolutist
      ? personalBaseline - 0.9
      : tenseCollapse
        ? personalBaseline - 0.55
        : /\b(i will|i can|let's|ready|start|continue)\b/i.test(user)
          ? Math.max(personalBaseline, 2.15)
          : personalBaseline,
    0,
    3,
  );
  const evidence = ["instant text pass"];

  if (messageLengthDrop >= 0.35) {
    evidence.push("length drop");
  } else if (tenseCollapse >= 0.5) {
    evidence.push("tense shift");
  } else if (cantTalkLong) {
    evidence.push("time constraint");
  } else {
    evidence.push("stage continuity");
  }

  return {
    id,
    timestamp,
    user,
    assistant: "",
    stagePosition,
    stageConfidence: 0.46,
    meaningfulness: clamp(0.35 + words.length / 50 + absolutist * 0.25),
    absolutist,
    features: {
      messageLengthDrop,
      tenseCollapse,
      speechRateDrop: durationMs > 0 && words.length < 5 ? 0.16 : 0,
      pauseRatioElevated: 0,
      cantTalkLong,
      lateNight: 0,
      interruptionMentioned,
      minimalAcknowledgment,
      monopitch: 0,
    },
    appropriateness: 82,
    responseRubric: {
      tone: 82,
      informationLoad: 82,
      safety: 82,
    },
    evidence,
    rationale:
      "Immediate text-only estimate. Luna is streaming the final reply and rubric.",
    provisional: true,
    streamingAssistant: true,
  };
}
