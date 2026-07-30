import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export function isElevenLabsConfigured(
  apiKey = process.env.ELEVENLABS_API_KEY,
) {
  return Boolean(apiKey && apiKey.trim());
}

function createClient(apiKey) {
  if (!isElevenLabsConfigured(apiKey)) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  return new ElevenLabsClient({ apiKey });
}

export async function transcribeWithElevenLabs({
  apiKey = process.env.ELEVENLABS_API_KEY,
  audio,
  modelId = process.env.ELEVENLABS_STT_MODEL || "scribe_v2",
}) {
  if (!audio || typeof audio.arrayBuffer !== "function") {
    throw new Error("A recorded audio file is required.");
  }

  const client = createClient(apiKey);
  const upload = new File(
    [await audio.arrayBuffer()],
    audio.name || "conversation-turn.webm",
    { type: audio.type || "audio/webm" },
  );
  const result = await client.speechToText.convert({
    file: upload,
    modelId,
    tagAudioEvents: true,
    diarize: false,
  });
  const transcript = result?.text?.trim();

  if (!transcript) {
    throw new Error("The recording did not contain transcribable speech.");
  }

  return {
    transcript,
    languageCode: result.languageCode || null,
    words: Array.isArray(result.words) ? result.words : [],
  };
}

export async function synthesizeWithElevenLabs({
  apiKey = process.env.ELEVENLABS_API_KEY,
  text,
  voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB",
  modelId = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
}) {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) {
    throw new Error("Text is required for speech synthesis.");
  }

  const client = createClient(apiKey);
  const stream = await client.textToSpeech.convert(voiceId, {
    text: trimmedText,
    modelId,
    outputFormat: "mp3_44100_128",
  });
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}
