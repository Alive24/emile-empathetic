import {
  analyzeRecordedTurn,
  analyzeTranscript,
  isOpenAIConfigured,
} from "./openaiAnalysis.mjs";
import {
  isElevenLabsConfigured,
  synthesizeWithElevenLabs,
  transcribeWithElevenLabs,
} from "./elevenLabsSpeech.mjs";

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function startEventStream(response) {
  response.statusCode = 200;
  response.setHeader(
    "Content-Type",
    "application/x-ndjson; charset=utf-8",
  );
  response.setHeader("Cache-Control", "no-cache, no-store");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();
}

function sendStreamEvent(response, payload) {
  response.write(`${JSON.stringify(payload)}\n`);
}

async function toWebRequest(request) {
  return new Request(`http://${request.headers.host}${request.url}`, {
    method: request.method,
    headers: request.headers,
    body: request,
    duplex: "half",
  });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function openAIAnalysisPlugin(env) {
  const apiKey = env.OPENAI_API_KEY;
  const elevenLabsApiKey = env.ELEVENLABS_API_KEY;

  return {
    name: "openai-analysis-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url === "/api/config" && request.method === "GET") {
          sendJson(response, 200, {
            configured: isOpenAIConfigured(apiKey),
            elevenLabsConfigured:
              isElevenLabsConfigured(elevenLabsApiKey),
            analysisModel: env.OPENAI_ANALYSIS_MODEL || "gpt-5.6",
            reasoningEffort: env.OPENAI_REASONING_EFFORT || "none",
            transcriptionModel:
              env.ELEVENLABS_STT_MODEL || "scribe_v2",
            speechModel:
              env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
          });
          return;
        }

        if (request.url === "/api/speak" && request.method === "POST") {
          if (!isElevenLabsConfigured(elevenLabsApiKey)) {
            sendJson(response, 503, {
              error:
                "ElevenLabs is not configured. Add ELEVENLABS_API_KEY to .env.local and restart the preview.",
            });
            return;
          }

          try {
            const payload = await readJson(request);
            const text = String(payload.text || "").trim();
            if (!text || text.length > 2400) {
              sendJson(response, 400, {
                error: "Speech text must be between 1 and 2,400 characters.",
              });
              return;
            }
            const audio = await synthesizeWithElevenLabs({
              apiKey: elevenLabsApiKey,
              text,
              voiceId: env.ELEVENLABS_VOICE_ID,
              modelId: env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
            });
            response.statusCode = 200;
            response.setHeader("Content-Type", "audio/mpeg");
            response.setHeader("Cache-Control", "no-store");
            response.end(audio);
          } catch (error) {
            console.error("ElevenLabs speech synthesis failed", error);
            sendJson(response, 500, {
              error:
                error instanceof Error
                  ? error.message
                  : "The assistant reply could not be read aloud.",
            });
          }
          return;
        }

        if (request.url !== "/api/analyze" || request.method !== "POST") {
          next();
          return;
        }

        if (!isOpenAIConfigured(apiKey)) {
          sendJson(response, 503, {
            error:
              "OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart the preview.",
          });
          return;
        }

        let streamStarted = false;

        try {
          const webRequest = await toWebRequest(request);
          const formData = await webRequest.formData();
          const audio = formData.get("audio");
          const transcript = String(formData.get("transcript") || "").trim();
          const history = JSON.parse(formData.get("history") || "[]");
          const durationMs = Number(formData.get("durationMs") || 0);
          let resolvedTranscript = transcript;
          let transcriptionModel = transcript
            ? "browser-speech-recognition"
            : env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe";

          if (
            !resolvedTranscript &&
            audio &&
            typeof audio.arrayBuffer === "function" &&
            audio.size > 0 &&
            isElevenLabsConfigured(elevenLabsApiKey)
          ) {
            try {
              const transcription = await transcribeWithElevenLabs({
                apiKey: elevenLabsApiKey,
                audio,
                modelId: env.ELEVENLABS_STT_MODEL || "scribe_v2",
              });
              resolvedTranscript = transcription.transcript;
              transcriptionModel =
                env.ELEVENLABS_STT_MODEL || "scribe_v2";
            } catch (error) {
              if (!resolvedTranscript) {
                throw error;
              }
              console.warn(
                "ElevenLabs transcription failed; using browser transcript.",
              );
            }
          }

          const common = {
            apiKey,
            baseURL: env.OPENAI_BASE_URL,
            history,
            durationMs,
            analysisModel: env.OPENAI_ANALYSIS_MODEL || "gpt-5.6",
            reasoningEffort: env.OPENAI_REASONING_EFFORT || "none",
            transcriptionModel,
            onAssistantDelta(delta, assistant) {
              if (!streamStarted) {
                startEventStream(response);
                streamStarted = true;
              }
              sendStreamEvent(response, {
                type: "assistant.delta",
                delta,
                assistant,
              });
            },
          };

          if (resolvedTranscript) {
            startEventStream(response);
            streamStarted = true;
            sendStreamEvent(response, {
              type: "transcript",
              transcript: resolvedTranscript,
            });
          }

          const result = resolvedTranscript
            ? await analyzeTranscript({
                ...common,
                transcript: resolvedTranscript,
              })
            : await analyzeRecordedTurn({
                ...common,
                audio,
                onTranscript(transcribedText) {
                  if (!streamStarted) {
                    startEventStream(response);
                    streamStarted = true;
                  }
                  sendStreamEvent(response, {
                    type: "transcript",
                    transcript: transcribedText,
                  });
                },
              });

          if (!streamStarted) {
            startEventStream(response);
            streamStarted = true;
          }
          sendStreamEvent(response, { type: "result", payload: result });
          response.end();
        } catch (error) {
          console.error("OpenAI analysis failed", error);
          const message =
            error instanceof Error
              ? error.message
              : "The recording could not be analyzed.";
          if (streamStarted) {
            sendStreamEvent(response, { type: "error", error: message });
            response.end();
          } else {
            sendJson(response, 500, { error: message });
          }
        }
      });
    },
  };
}
