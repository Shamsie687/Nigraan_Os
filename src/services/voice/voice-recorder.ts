// ── Voice Recorder ─────────────────────────────────────────────────
//
// Minimal audio recording hook for voice reports.
//
// Uses expo-audio (AudioRecorder + useAudioRecorderState) to capture
// microphone input. The recording is saved locally; the URI can be
// used for playback or future transcription when a speech-to-text
// service is available.
//
// Limitations:
// - React Native and Expo do not ship built-in speech-to-text.
// - Automatic transcription requires a dedicated STT service
//   (e.g., @react-native-voice/voice with a development build).
// - This module provides real audio recording only.

import { useState, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  PermissionStatus,
} from 'expo-audio';

/** Result of a completed recording. */
export interface VoiceRecordingResult {
  /** Local file URI of the recorded audio */
  uri: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * React hook for recording audio from the device microphone.
 *
 * Usage:
 * ```ts
 * const { isRecording, durationMs, error, startRecording, stopRecording } = useVoiceRecorder();
 * ```
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== PermissionStatus.GRANTED) {
        setError(
          'Microphone permission is needed for voice recording. ' +
            'You can still type your description.',
        );
        return false;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start recording.';
      setError(message);
      return false;
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    try {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();

      const uri = recorder.uri;
      setIsRecording(false);

      if (!uri) {
        setError('Recording file could not be saved.');
        return null;
      }

      return { uri, durationMs };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not stop recording.';
      setError(message);
      setIsRecording(false);
      return null;
    }
  }, [recorder, recorderState.durationMillis]);

  return {
    isRecording,
    durationMs: recorderState.durationMillis,
    error,
    startRecording,
    stopRecording,
  };
}

/**
 * Format milliseconds as mm:ss display string.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
