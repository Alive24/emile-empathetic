import { useRef, useState } from "react";

function preferredMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function useTurnRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const stopPromiseRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error("This browser does not support microphone recording.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );

    chunksRef.current = [];
    transcriptRef.current = "";
    streamRef.current = stream;
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-GB";
      recognition.addEventListener("result", (event) => {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript || "";
        }
        transcriptRef.current = transcript.trim();
      });
      recognition.addEventListener("error", () => {
        recognitionRef.current = null;
      });
      recognition.start();
      recognitionRef.current = recognition;
    }

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      const durationMs = Math.max(
        1,
        Math.round(performance.now() - startedAtRef.current),
      );
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      recorderRef.current = null;
      streamRef.current = null;
      setIsRecording(false);
      window.setTimeout(() => {
        stopPromiseRef.current?.resolve({
          blob,
          durationMs,
          transcript: transcriptRef.current,
        });
        stopPromiseRef.current = null;
      }, 180);
    });

    recorder.addEventListener("error", () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      stopPromiseRef.current?.reject(
        new Error("The browser could not finish the recording."),
      );
      stopPromiseRef.current = null;
    });

    recorder.start();
    setIsRecording(true);
  };

  const stop = () =>
    new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("No recording is active."));
        return;
      }

      stopPromiseRef.current = { resolve, reject };
      recorder.stop();
    });

  return { isRecording, start, stop };
}
