import assert from "node:assert/strict";
import test from "node:test";
import {
  makeBeliefSamples,
  scoreComb,
  scoreConversation,
  summarizeConversation,
} from "../src/lib/scoring.js";
import { buildInstantTurn } from "../src/lib/instantAnalysis.js";
import { extractStreamedAssistant } from "../server/openaiAnalysis.mjs";

test("COM-B formulas preserve the requested coefficients", () => {
  const result = scoreComb({
    messageLengthDrop: 1,
    tenseCollapse: 0.5,
    speechRateDrop: 0.25,
    pauseRatioElevated: 0.75,
    cantTalkLong: 1,
    lateNight: 0.5,
    interruptionMentioned: 0.25,
    minimalAcknowledgment: 0.5,
    noQuestionLastTwoTurns: 1,
    monopitch: 0.5,
  });

  assert.equal(result.capability, 0.65);
  assert.equal(result.opportunity, 0.7);
  assert.equal(result.motivation, 0.65);
  assert.equal(result.behaviorScore, 2);
  assert.equal(result.decisionRisk, 0.66);
});

test("opportunity alone cannot escalate the decision layer", () => {
  const turns = scoreConversation([
    {
      id: "late",
      user: "I can’t talk long, but which document is next?",
      assistant: "Let’s keep it brief.",
      stagePosition: 2.4,
      stageConfidence: 0.8,
      meaningfulness: 0.7,
      absolutist: 0,
      features: {
        messageLengthDrop: 0,
        tenseCollapse: 0,
        speechRateDrop: 0,
        pauseRatioElevated: 0,
        cantTalkLong: 1,
        lateNight: 1,
        interruptionMentioned: 1,
        minimalAcknowledgment: 0,
        monopitch: 0,
      },
      appropriateness: 90,
      responseRubric: { tone: 90, informationLoad: 90, safety: 90 },
      evidence: [],
      rationale: "",
    },
  ]);

  assert.equal(turns[0].opportunity, 1);
  assert.equal(turns[0].decision, "Continue");
});

test("sustained regression with capability load and absolutist language escalates", () => {
  const base = {
    assistant: "Response",
    stageConfidence: 0.8,
    meaningfulness: 0.8,
    appropriateness: 90,
    responseRubric: { tone: 90, informationLoad: 90, safety: 90 },
    evidence: [],
    rationale: "",
  };
  const low = {
    messageLengthDrop: 0,
    tenseCollapse: 0,
    speechRateDrop: 0,
    pauseRatioElevated: 0,
    cantTalkLong: 0,
    lateNight: 0,
    interruptionMentioned: 0,
    minimalAcknowledgment: 0,
    monopitch: 0,
  };
  const high = {
    ...low,
    messageLengthDrop: 0.9,
    tenseCollapse: 0.9,
    speechRateDrop: 0.9,
    pauseRatioElevated: 0.9,
    minimalAcknowledgment: 0.8,
    monopitch: 0.8,
  };
  const turns = scoreConversation([
    {
      ...base,
      id: "one",
      user: "What comes next?",
      stagePosition: 2.4,
      absolutist: 0,
      features: low,
    },
    {
      ...base,
      id: "two",
      user: "I’m fine.",
      stagePosition: 1.1,
      absolutist: 0.1,
      features: high,
    },
    {
      ...base,
      id: "three",
      user: "There is no point. I know exactly what I will do.",
      stagePosition: 0.2,
      absolutist: 1,
      features: high,
    },
  ]);

  assert.equal(turns[2].sustainedRegression, true);
  assert.equal(turns[2].decision, "Escalate");
});

test("conversation summary and belief samples remain bounded", () => {
  const turns = scoreConversation([
    {
      id: "bounded",
      user: "What is next?",
      assistant: "One step.",
      stagePosition: 2,
      stageConfidence: 0.7,
      meaningfulness: 1,
      absolutist: 0,
      features: {
        messageLengthDrop: 0,
        tenseCollapse: 0,
        speechRateDrop: 0,
        pauseRatioElevated: 0,
        cantTalkLong: 0,
        lateNight: 0,
        interruptionMentioned: 0,
        minimalAcknowledgment: 0,
        monopitch: 0,
      },
      appropriateness: 90,
      responseRubric: { tone: 90, informationLoad: 90, safety: 90 },
      evidence: [],
      rationale: "",
    },
  ]);

  const summary = summarizeConversation(turns);
  const samples = makeBeliefSamples(turns);

  assert.equal(summary.stage, "Preparation");
  assert.ok(samples.length >= 5);
  assert.ok(samples.every((sample) => sample.stagePosition >= 0));
  assert.ok(samples.every((sample) => sample.stagePosition <= 3));
});

test("instant analysis creates a bounded provisional turn", () => {
  const turn = buildInstantTurn({
    id: "preview",
    timestamp: "00:00:10",
    transcript: "I can continue, but keep this short.",
    previousTurns: [],
  });

  assert.equal(turn.provisional, true);
  assert.ok(turn.stagePosition >= 0 && turn.stagePosition <= 3);
  assert.ok(turn.meaningfulness >= 0 && turn.meaningfulness <= 1);
  assert.equal(turn.features.cantTalkLong, 1);
  assert.equal(turn.assistant, "");
  assert.equal(turn.streamingAssistant, true);
});

test("instant analysis recognizes an absolutist regression signal", () => {
  const turn = buildInstantTurn({
    id: "preview-risk",
    timestamp: "00:00:20",
    transcript: "There is no point. I am done with all of this.",
    previousTurns: [{ user: "What comes next?", stagePosition: 2.4 }],
  });

  assert.ok(turn.absolutist >= 0.65);
  assert.ok(turn.stagePosition < 2.4);
});

test("generated checkpoint replies cannot become diagnostic questions", () => {
  const turns = scoreConversation([
    {
      id: "guardrail-check",
      user: "There is no point. I am done with all of this.",
      assistant:
        "Are you safe right now, or are you thinking about hurting yourself?",
      stagePosition: 0.2,
      stageConfidence: 0.9,
      meaningfulness: 0.9,
      absolutist: 0.9,
      features: {
        messageLengthDrop: 0,
        tenseCollapse: 0,
        speechRateDrop: 0,
        pauseRatioElevated: 0,
        cantTalkLong: 0,
        lateNight: 0,
        interruptionMentioned: 0,
        minimalAcknowledgment: 0,
        monopitch: 0,
      },
      appropriateness: 90,
      responseRubric: { tone: 90, informationLoad: 90, safety: 90 },
      evidence: [],
      rationale: "",
      guardGeneratedReply: true,
    },
  ]);

  assert.equal(turns[0].decision, "Checkpoint");
  assert.doesNotMatch(turns[0].assistant, /safe|hurting yourself/i);
  assert.match(turns[0].assistant, /keep going|pause/i);
});

test("streamed structured output exposes partial assistant text", () => {
  assert.equal(
    extractStreamedAssistant(
      '{"assistant":"Keep going with one small step, or pause',
    ),
    "Keep going with one small step, or pause",
  );
  assert.equal(
    extractStreamedAssistant(
      '{"assistant":"A quoted \\"choice\\" and a new\\nline","stagePosition":',
    ),
    'A quoted "choice" and a new\nline',
  );
});
