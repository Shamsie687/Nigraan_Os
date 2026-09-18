// ── Browser Speech Recognition ─────────────────────────────────────
//
// Live voice-to-text for the description field on web.
//
// Uses the browser-native Web Speech API (`SpeechRecognition` /
// `webkitSpeechRecognition`) — no API keys and no external services.
// Transcripts (interim and final) are streamed to the caller so they
// can be appended to the issue description as the user speaks.
//
// On platforms without the API (Android/iOS), `supported` is false and
// callers should fall back to audio recording (useVoiceRecorder).

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Minimal Web Speech API typings ─────────────────────────────────
// (The DOM lib ships these only as experimental types; we declare the
// subset we use so the module stays portable across TS configs.)

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Resolve the browser constructor, preferring the standard name. */
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** User-facing messages for SpeechRecognitionErrorEvent.error codes. */
const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'Microphone access was blocked. Allow microphone permissions in your browser and try again.',
  'service-not-allowed':
    'Speech recognition is blocked in this browser. You can still type your description.',
  'audio-capture':
    'No microphone was found. Check your device and try again.',
  network:
    'Voice input needs an internet connection. Check your connection and try again.',
  'no-speech': 'No speech was detected. Tap Voice and try again.',
};

const SPEECH_FALLBACK_ERROR =
  'Voice input stopped unexpectedly. You can still type your description.';

/** Join existing text with dictated text, normalizing whitespace. */
function mergeSpeechText(base: string, dictated: string): string {
  const spoken = dictated.replace(/\s+/g, ' ').trim();
  if (!spoken) return base;
  return base ? `${base} ${spoken}` : spoken;
}

// ── Hook ───────────────────────────────────────────────────────────

export interface UseBrowserSpeechOptions {
  /** Text already in the field — new speech is appended after it. */
  baseText: string;
  /** Receives the combined text (base + dictated) as it evolves. */
  onText: (text: string) => void;
}

export interface BrowserSpeechState {
  /** True when the current runtime has the Web Speech API (web only). */
  supported: boolean;
  /** True while the microphone is actively listening. */
  isListening: boolean;
  /** User-facing error message, if any. */
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * React hook that drives browser speech recognition.
 *
 * Usage:
 * ```ts
 * const speech = useBrowserSpeechRecognition({
 *   baseText: description,
 *   onText: setDescription,
 * });
 * ```
 */
export function useBrowserSpeechRecognition({
  baseText,
  onText,
}: UseBrowserSpeechOptions): BrowserSpeechState {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');
  const finalTextRef = useRef('');
  const onTextRef = useRef(onText);
  const disposedRef = useRef(false);

  // Keep the latest callback without re-creating recognitions
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const supported = getSpeechRecognitionConstructor() !== null;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError(
        'Voice input is not supported in this browser. You can still type your description.',
      );
      return;
    }
    if (recognitionRef.current) return; // already listening

    setError(null);
    disposedRef.current = false;
    // Snapshot the field text so live transcripts append after it
    baseTextRef.current = baseText.trimEnd();
    finalTextRef.current = '';

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      if (!disposedRef.current) setIsListening(true);
    };

    recognition.onresult = (event) => {
      if (disposedRef.current) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) finalTextRef.current += transcript;
        else interim += transcript;
      }
      // Stream base + final + interim into the field as it evolves
      onTextRef.current(
        mergeSpeechText(baseTextRef.current, finalTextRef.current + interim),
      );
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      if (disposedRef.current || event.error === 'aborted') return;
      setIsListening(false);
      setError(SPEECH_ERROR_MESSAGES[event.error] ?? SPEECH_FALLBACK_ERROR);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (disposedRef.current) return;
      setIsListening(false);
      // Commit the final transcript, dropping any trailing interim text
      if (finalTextRef.current) {
        onTextRef.current(
          mergeSpeechText(baseTextRef.current, finalTextRef.current),
        );
      }
    };

    recognitionRef.current = recognition;
    try {
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError('Could not start voice input. Please try again.');
    }
  }, [baseText]);

  // Abort any active recognition when the screen unmounts
  useEffect(() => {
    return () => {
      disposedRef.current = true;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return { supported, isListening, error, start, stop };
}
