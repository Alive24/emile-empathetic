import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const boundedScore = z.number().min(0).max(1);

const TurnAnalysis = z.object({
  stagePosition: z.number().min(0).max(3),
  stageConfidence: boundedScore,
  meaningfulness: boundedScore,
  absolutist: boundedScore,
  features: z.object({
    messageLengthDrop: boundedScore,
    tenseCollapse: boundedScore,
    speechRateDrop: boundedScore,
    pauseRatioElevated: boundedScore,
    cantTalkLong: boundedScore,
    lateNight: boundedScore,
    interruptionMentioned: boundedScore,
    minimalAcknowledgment: boundedScore,
    monopitch: boundedScore,
  }),
  appropriateness: z.number().int().min(0).max(100),
  evidence: z.array(z.string()).min(2).max(4),
  rationale: z.string(),
  assistant: z.string(),
});

const SYSTEM_PROMPT = `
You are the inference layer for a short, non-clinical behavioural measurement demo.
Do not diagnose, name a disorder, or claim certainty about a person's mental state.
Score only evidence present in the transcript and supplied conversation history.
Use conservative values when audio-only properties cannot be established.

TTM stage axis:
0 = Precontemplation, 1 = Contemplation, 2 = Preparation, 3 = Action.

COM-B feature inputs are normalized from 0 to 1. The application calculates:
Capability = .3 message-length drop + .3 tense collapse + .2 speech-rate drop + .2 elevated pause ratio.
Opportunity = .5 explicit "can't talk long" + .3 late-night + .2 interruption.
Motivation = .4 minimal acknowledgement + .3 no question in two turns + .3 monopitch.

The application routes to Continue, Soften, Checkpoint, or Escalate after your
structured observation. Opportunity is deliberately a soft signal and must never
drive escalation alone.

Write a concise proposed assistant reply that is appropriate to the observable
signals. For any concerning or ambiguous content, be direct, non-leading, and
avoid pretending this demo replaces human support.

The appropriateness field MUST be an integer percentage from 0 to 100 evaluating
your proposed assistant reply, never a 0-to-1 fraction. Use 90–100 for an excellent
fit, 75–89 for a good but imperfect fit, and lower scores only for meaningful issues.
`.trim();

function safeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.slice(-8).map((turn) => ({
    user: String(turn.user ?? "").slice(0, 1200),
    assistant: String(turn.assistant ?? "").slice(0, 1200),
    stage: String(turn.stage ?? ""),
    decision: String(turn.decision ?? ""),
  }));
}

export function isOpenAIConfigured(apiKey = process.env.OPENAI_API_KEY) {
  return Boolean(apiKey && apiKey.trim());
}

export async function analyzeRecordedTurn({
  apiKey = process.env.OPENAI_API_KEY,
  baseURL = process.env.OPENAI_BASE_URL,
  audio,
  history,
  durationMs,
  analysisModel = process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.6",
  reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "none",
  transcriptionModel =
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
}) {
  if (!isOpenAIConfigured(apiKey)) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!audio || typeof audio.arrayBuffer !== "function") {
    throw new Error("A recorded audio file is required.");
  }

  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  const upload = await toFile(
    audioBuffer,
    audio.name || "conversation-turn.webm",
    { type: audio.type || "audio/webm" },
  );

  const transcription = await client.audio.transcriptions.create({
    file: upload,
    model: transcriptionModel,
  });

  const transcript = transcription.text?.trim();
  if (!transcript) {
    throw new Error("The recording did not contain transcribable speech.");
  }

  return analyzeTranscript({
    apiKey,
    baseURL,
    transcript,
    history,
    durationMs,
    analysisModel,
    reasoningEffort,
    transcriptionModel,
  });
}

export async function analyzeTranscript({
  apiKey = process.env.OPENAI_API_KEY,
  baseURL = process.env.OPENAI_BASE_URL,
  transcript,
  history,
  durationMs,
  analysisModel = process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.6",
  reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "none",
  transcriptionModel =
    process.env.OPENAI_TRANSCRIPTION_MODEL || "browser-speech-recognition",
}) {
  if (!isOpenAIConfigured(apiKey)) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!transcript?.trim()) {
    throw new Error("A transcript is required for analysis.");
  }

  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  const response = await client.responses.parse({
    model: analysisModel,
    reasoning: { effort: reasoningEffort },
    max_output_tokens: 700,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          conversationHistory: safeHistory(history),
          currentTranscript: transcript.trim(),
          recordingDurationMs: Number(durationMs) || null,
          task:
            "Classify this turn, estimate normalized rubric inputs, evaluate an appropriate response, and draft that response.",
        }),
      },
    ],
    text: {
      format: zodTextFormat(TurnAnalysis, "behavioural_turn_analysis"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The analysis model did not return a structured result.");
  }

  return {
    transcript: transcript.trim(),
    analysis: response.output_parsed,
    models: {
      analysis: analysisModel,
      transcription: transcriptionModel,
    },
  };
}
