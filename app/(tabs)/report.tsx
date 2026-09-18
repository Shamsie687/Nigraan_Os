import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Icon,
  StatusBadge,
  colors,
  radius,
  spacing,
  typography,
  type IncidentStatus,
} from '../../src/design';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CONSTRAINTS,
  type IncidentCategory,
} from '../../src/services/incident';
import { submitReport } from '../../src/services/reports';
import {
  useVoiceRecorder,
  formatDuration,
  type VoiceRecordingResult,
} from '../../src/services/voice/voice-recorder';
import { useBrowserSpeechRecognition } from '../../src/services/voice/speech-recognition';
import { ProtectedScreen } from '../../src/components/SignInGate';
import { CivicMap, DEFAULT_REGION, type CivicMapCoords } from '../../src/components/CivicMap';
import { CATEGORIES } from '../../src/constants/civic';

// ── Constants ────────────────────────────────────────────────────

/** Location data captured from device GPS or pinned on the map */
interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  display: string;
  area?: string;
  /** How the location was determined */
  source: 'gps' | 'map';
}

/** Evidence photo captured or selected by the user */
interface EvidencePhoto {
  uri: string;
  width: number;
  height: number;
  source: 'camera' | 'gallery';
}

/** Maximum number of photos allowed per report */
const MAX_EVIDENCE_PHOTOS = 3;

type Step = 'entry' | 'describe' | 'category' | 'evidence' | 'location' | 'review' | 'success';

/** Auto-generated title from first sentence of description */
function extractTitle(description: string): string {
  const firstSentence = description.trim().split(/[.\n!?]/)[0];
  return firstSentence.slice(0, INCIDENT_CONSTRAINTS.title.maxLength).trim() || 'Untitled report';
}

// ── Component ────────────────────────────────────────────────────

export default function ReportScreen() {
  return (
    <ProtectedScreen
      title="Report a civic issue"
      message="Sign in to report civic issues in your area. Your reports help authorities identify and resolve problems faster."
      icon="edit"
    >
      <ReportFlow />
    </ProtectedScreen>
  );
}

/**
 * Multi-step report flow — the core citizen experience.
 *
 * Steps: Entry → Describe → Category (optional) → Evidence → Location → Review → Success
 *
 * Uses local state only. Submissions go to the NigraanOS backend
 * reports endpoint (POST /api/v1/reports).
 */
function ReportFlow() {
  const [step, setStep] = useState<Step>('entry');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [evidence, setEvidence] = useState<EvidencePhoto[]>([]);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const title = extractTitle(description);
  const charCount = description.length;
  const descMin = INCIDENT_CONSTRAINTS.description.minLength;
  const descMax = INCIDENT_CONSTRAINTS.description.maxLength;
  const isDescValid = charCount >= descMin && charCount <= descMax;

  // Image evidence is mandatory — at least one photo must be attached
  const evidenceReady = evidence.length > 0;

  // Prevent duplicate submission
  const canSubmit = isDescValid && evidenceReady && !isSubmitting && step !== 'success';

  const goBack = useCallback(() => {
    const order: Step[] = ['entry', 'describe', 'category', 'evidence', 'location', 'review'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  }, [step]);

  const handleReset = useCallback(() => {
    setStep('entry');
    setDescription('');
    setCategory(null);
    setEvidence([]);
    setLocation(null);
    setIsSubmitting(false);
    setSubmitError('');
  }, []);

  /**
   * Submit the report through the NigraanOS backend.
   * At least one evidence photo is required before submission — the
   * backend verifies it before storing the report.
   */
  const handleSubmit = useCallback(async () => {
    // Hard gate: image evidence is mandatory
    if (evidence.length === 0) {
      setSubmitError(
        'Image evidence is required. Add at least one photo before submitting.'
      );
      return;
    }

    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // POST /api/v1/reports with the session token attached when
      // available (public submission otherwise) — no Supabase session
      // is required, so submissions never fail with "session expired".
      const result = await submitReport({
        title,
        description,
        category: category ?? 'other',
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        photoUri: evidence[0].uri,
      });

      if (!result.success) {
        setSubmitError(
          result.error || 'Failed to submit report. Please try again.'
        );
        return;
      }

      setStep('success');
    } catch {
      setSubmitError('Submission failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, title, description, category, location, evidence]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── Back bar ──────────────────────────────────────────── */}
      {step !== 'entry' && step !== 'success' && (
        <Pressable
          onPress={goBack}
          disabled={isSubmitting}
          style={[styles.backBar, isSubmitting && styles.backBarDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Go to previous step"
        >
          <Icon name="back" size={20} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'entry' && <EntryStep onStart={() => setStep('describe')} />}
        {step === 'describe' && (
          <DescribeStep
            description={description}
            onChangeDescription={setDescription}
            charCount={charCount}
            isDescValid={isDescValid}
            onContinue={() => setStep('category')}
          />
        )}
        {step === 'category' && (
          <CategoryStep
            selected={category}
            onSelect={setCategory}
            onContinue={() => setStep('evidence')}
          />
        )}
        {step === 'evidence' && (
          <EvidenceStep
            photos={evidence}
            onPhotosChange={setEvidence}
            onContinue={() => setStep('location')}
          />
        )}
        {step === 'location' && (
          <LocationStep
            location={location}
            onLocationChange={setLocation}
            onContinue={() => setStep('review')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            title={title}
            description={description}
            category={category}
            evidence={evidence}
            location={location}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        )}
        {step === 'success' && (
          <SuccessStep title={title} onDone={handleReset} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 1 — ENTRY
// ════════════════════════════════════════════════════════════════════

function EntryStep({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.centeredContent}>
      <View style={styles.entryIconCircle}>
        <Icon name="report" size={32} color={colors.primary} />
      </View>
      <Text style={styles.heading}>Report a civic issue</Text>
      <Text style={styles.subheading}>
        Tell us what&apos;s happening in your area — a broken pipe, a pothole,
        garbage piling up, or anything that needs attention.
      </Text>

      <View style={styles.howItWorks}>
        <HowItWorksItem icon="edit" text="Describe the problem in your own words" />
        <HowItWorksItem icon="location" text="We&apos;ll note the location" />
        <HowItWorksItem icon="send" text="Submit — NigraanOS analyzes and routes it" />
      </View>

      <View style={styles.entryFooter}>
        <Button label="Start a report" variant="primary" size="lg" fullWidth onPress={onStart} />
        <Text style={styles.reassurance}>
          Takes about 30 seconds. Your report stays private.
        </Text>
      </View>
    </View>
  );
}

function HowItWorksItem({ icon, text }: { icon: 'edit' | 'location' | 'send'; text: string }) {
  return (
    <View style={styles.howItem}>
      <View style={styles.howIcon}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.howText}>{text}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 2 — DESCRIBE
// ════════════════════════════════════════════════════════════════════

function DescribeStep({
  description,
  onChangeDescription,
  charCount,
  isDescValid,
  onContinue,
}: {
  description: string;
  onChangeDescription: (text: string) => void;
  charCount: number;
  isDescValid: boolean;
  onContinue: () => void;
}) {
  const descMax = INCIDENT_CONSTRAINTS.description.maxLength;
  const descMin = INCIDENT_CONSTRAINTS.description.minLength;
  const remaining = descMax - charCount;
  const showCount = charCount > descMax * 0.7;

  const { isRecording, durationMs, error: voiceError, startRecording, stopRecording } =
    useVoiceRecorder();
  const [voiceResult, setVoiceResult] = useState<VoiceRecordingResult | null>(null);

  // Browser-native speech-to-text (web): appends live transcripts to the
  // description field. Falls back to audio recording where unsupported.
  const handleVoiceText = useCallback(
    (text: string) => onChangeDescription(text.slice(0, descMax)),
    [onChangeDescription, descMax]
  );
  const {
    supported: speechSupported,
    isListening: isSpeechListening,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
  } = useBrowserSpeechRecognition({ baseText: description, onText: handleVoiceText });

  /** Microphone is active on either voice path */
  const isVoiceActive = isRecording || isSpeechListening;
  const activeVoiceError = speechSupported ? speechError : voiceError;

  const handleVoiceToggle = useCallback(async () => {
    if (speechSupported) {
      if (isSpeechListening) {
        stopSpeech();
      } else {
        setVoiceResult(null);
        startSpeech();
      }
      return;
    }
    if (isRecording) {
      const result = await stopRecording();
      if (result) setVoiceResult(result);
    } else {
      setVoiceResult(null);
      await startRecording();
    }
  }, [
    speechSupported,
    isSpeechListening,
    startSpeech,
    stopSpeech,
    isRecording,
    startRecording,
    stopRecording,
  ]);

  return (
    <View style={styles.stepContent}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What&apos;s happening?</Text>
        <Text style={styles.subheading}>
          Describe the issue in your own words. Be as specific as you can —
          the more detail, the better we can help.
        </Text>

        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={(text) => onChangeDescription(text.slice(0, descMax))}
          placeholder="e.g., There is a large pothole on Main Boulevard near the Gulberg signal that has been causing accidents for the past week…"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoFocus
          accessibilityLabel="Describe the problem"
        />

        {/* Voice recording button */}
        <View style={styles.voiceRow}>
          <Pressable
            onPress={handleVoiceToggle}
            style={[styles.voiceBtn, isVoiceActive && styles.voiceBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={isVoiceActive ? 'Stop voice input' : 'Start voice input'}
          >
            {isVoiceActive ? (
              <View style={styles.voiceRecordingIndicator}>
                <View style={styles.voiceDot} />
                <Text style={styles.voiceTimer}>
                  {isSpeechListening ? 'Listening\u2026' : formatDuration(durationMs)}
                </Text>
              </View>
            ) : (
              <>
                <Icon name="microphone" size={18} color={voiceResult ? colors.success : colors.primary} />
                <Text style={[styles.voiceBtnLabel, voiceResult && styles.voiceBtnLabelDone]}>
                  {voiceResult ? 'Recorded' : 'Voice'}
                </Text>
              </>
            )}
          </Pressable>
          {voiceResult && !isRecording && (
            <Text style={styles.voiceSavedHint}>
              Audio saved ({formatDuration(voiceResult.durationMs)}). Type your description below.
            </Text>
          )}
          {speechSupported && !isVoiceActive && (
            <Text style={styles.voiceSavedHint}>
              Tap Voice and speak — your words appear in the description above as you talk.
            </Text>
          )}
        </View>

        {/* Voice error */}
        {activeVoiceError ? (
          <Text style={styles.voiceError}>{activeVoiceError}</Text>
        ) : null}

        <View style={styles.charRow}>
          {charCount > 0 && charCount < descMin ? (
            <Text style={styles.charHint}>
              {descMin - charCount} more characters needed
            </Text>
          ) : (
            <View />
          )}
          {showCount && (
            <Text style={[styles.charCount, remaining < 100 && styles.charCountWarn]}>
              {remaining} left
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isDescValid}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 3 — CATEGORY (optional)
// ════════════════════════════════════════════════════════════════════

function CategoryStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: IncidentCategory | null;
  onSelect: (cat: IncidentCategory | null) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What type of issue is this?</Text>
        <Text style={styles.subheading}>
          Pick a category to help us route your report faster. You can
          skip this — we&apos;ll figure it out.
        </Text>

        <View style={styles.categoryGrid}>
          {INCIDENT_CATEGORIES.map((cat) => {
            const meta = CATEGORIES[cat] ?? CATEGORIES.other;
            const isSelected = selected === cat;

            return (
              <Pressable
                key={cat}
                onPress={() => onSelect(isSelected ? null : cat)}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={meta.label}
              >
                <Icon name={meta.icon} size={24} color={isSelected ? colors.textOnPrimary : meta.color} />
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                  numberOfLines={2}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={selected ? 'Continue' : 'Skip — continue anyway'}
          variant={selected ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 4 — EVIDENCE (optional)
// ════════════════════════════════════════════════════════════════════

/**
 * Evidence step — allows citizen to capture or select photos as evidence.
 * Permissions are requested only when the user chooses an action.
 * At least one photo is required; up to 3 photos allowed.
 */
function EvidenceStep({
  photos,
  onPhotosChange,
  onContinue,
}: {
  photos: EvidencePhoto[];
  onPhotosChange: (photos: EvidencePhoto[]) => void;
  onContinue: () => void;
}) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMissingPhotoError, setShowMissingPhotoError] = useState(false);

  const canAddMore = photos.length < MAX_EVIDENCE_PHOTOS;
  const canContinue = photos.length > 0;

  /**
   * Taps land here only while the Continue button is disabled (no photo
   * attached yet) — surface an inline error instead of proceeding.
   */
  const handleBlockedContinue = useCallback(() => {
    if (!canContinue) setShowMissingPhotoError(true);
  }, [canContinue]);

  /** Capture a new photo using the device camera */
  const capturePhoto = useCallback(async () => {
    setIsCapturing(true);
    setErrorMsg('');

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg(
          'Camera permission is needed to take photos. You can still select a photo from your gallery.'
        );
        setIsCapturing(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: EvidencePhoto = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          source: 'camera',
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch {
      setErrorMsg('Could not access camera. Please try again or select from gallery.');
    } finally {
      setIsCapturing(false);
    }
  }, [photos, onPhotosChange]);

  /** Select a photo from the device gallery */
  const selectFromGallery = useCallback(async () => {
    setIsCapturing(true);
    setErrorMsg('');

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg(
          'Photo library permission is needed to select images. You can take a photo instead.'
        );
        setIsCapturing(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: EvidencePhoto = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          source: 'gallery',
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch {
      setErrorMsg('Could not access photo library. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [photos, onPhotosChange]);

  /** Remove a photo from the evidence list */
  const removePhoto = useCallback(
    (index: number) => {
      onPhotosChange(photos.filter((_, i) => i !== index));
      // Reset the blocked-attempt hint until the next attempt
      setShowMissingPhotoError(false);
    },
    [photos, onPhotosChange]
  );

  return (
    <View style={styles.stepContent}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Add evidence</Text>
        <Text style={styles.subheading}>
          A photo is required with every report. Capture a fresh photo for
          the strongest evidence, or choose one from your gallery.
        </Text>

        {/* Evidence preview grid */}
        {photos.length > 0 && (
          <View style={styles.evidenceGrid}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.evidenceItem}>
                <Image source={{ uri: photo.uri }} style={styles.evidenceImage} />
                <Pressable
                  onPress={() => removePhoto(index)}
                  style={styles.evidenceRemoveBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Text style={styles.evidenceRemoveIcon}>{'\u2715'}</Text>
                </Pressable>
                <View style={styles.evidenceBadge}>
                  <Text style={styles.evidenceBadgeText}>
                    {photo.source === 'camera' ? 'New' : 'Gallery'}
                  </Text>
                </View>
              </View>
            ))}

            {/* Add more placeholder */}
            {canAddMore && (
              <Pressable
                onPress={capturePhoto}
                style={styles.evidenceAddBtn}
                accessibilityRole="button"
                accessibilityLabel="Add another photo"
              >
                <Text style={styles.evidenceAddIcon}>+</Text>
                <Text style={styles.evidenceAddText}>Add</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Error display */}
        {errorMsg ? (
          <Card padding="lg" elevation="sm" style={styles.locationCardError}>
            <View style={styles.locationCardHeader}>
              <Text style={styles.errorEmoji}>{'\u26A0'}</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          </Card>
        ) : null}

        {/* Privacy info */}
        <View style={styles.locationInfoRow}>
          <Icon name="info" size={16} color={colors.primary} />
          <Text style={styles.locationInfoText}>
            At least one photo is required. Photos are only shared with the
            authorities handling your report. You can add up to{' '}
            {MAX_EVIDENCE_PHOTOS} photos.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* Primary action: Capture new photo */}
        {canAddMore && (
          <Button
            label="Capture now"
            variant="primary"
            size="lg"
            fullWidth
            loading={isCapturing}
            disabled={isCapturing}
            onPress={capturePhoto}
          />
        )}

        {/* Secondary action: Select from gallery */}
        {canAddMore && (
          <>
            <View style={styles.locationSkipSpacer} />
            <Button
              label="Choose from gallery"
              variant="secondary"
              size="lg"
              fullWidth
              disabled={isCapturing}
              onPress={selectFromGallery}
            />
          </>
        )}

        {/* Continue button — disabled until at least one photo is attached.
            The wrapper captures taps on the disabled button so we can show
            an inline error instead of silently ignoring the attempt. */}
        <View style={styles.locationSkipSpacer} />
        <Pressable onPress={handleBlockedContinue}>
          <Button
            label="Continue"
            variant={canContinue ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            disabled={!canContinue || isCapturing}
            onPress={onContinue}
          />
        </Pressable>

        {showMissingPhotoError && !canContinue ? (
          <Text style={styles.evidenceRequiredError}>
            Image evidence is required. Capture a photo or choose one from
            your gallery before continuing.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 5 — LOCATION
// ════════════════════════════════════════════════════════════════════

/**
 * Location step — captures the spot via device GPS or lets the citizen
 * pin it on a Leaflet/OpenStreetMap map (no API key required).
 * Permission is requested only when the user taps “Use my location”.
 */
function LocationStep({
  location,
  onLocationChange,
  onContinue,
}: {
  location: ReportLocation | null;
  onLocationChange: (loc: ReportLocation | null) => void;
  onContinue: () => void;
}) {
  const [locState, setLocState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    location ? 'success' : 'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  /** Monotonic id so stale reverse-geocode results are ignored */
  const pickSeq = useRef(0);

  /**
   * Handle a tap on the map (location-picker mode): pin the tapped
   * coordinates immediately, then refine the label with an address.
   */
  const applyMapPick = useCallback(
    (coords: CivicMapCoords) => {
      const seq = pickSeq.current + 1;
      pickSeq.current = seq;
      setErrorMsg('');
      setLocState('success');
      onLocationChange({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: null,
        display: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        source: 'map',
      });

      // Reverse geocoding is unavailable on some platforms (e.g., web);
      // the coordinate label above remains in that case.
      (async () => {
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (pickSeq.current !== seq || addresses.length === 0) return;
          const addr = addresses[0];
          const display = [addr.street, addr.city, addr.region, addr.country]
            .filter(Boolean)
            .join(', ');
          onLocationChange({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: null,
            display:
              display ||
              `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
            area: addr.subregion || addr.city || undefined,
            source: 'map',
          });
        } catch {
          // Ignore — the coordinate label is already applied
        }
      })();
    },
    [onLocationChange]
  );

  /** Region for the picker map: Karachi by default, else the current pin */
  const mapRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_REGION;

  const fetchLocation = useCallback(async () => {
    setLocState('loading');
    setErrorMsg('');

    try {
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setLocState('error');
        setErrorMsg(
          'Location services are turned off. Please enable them in your phone\u2019s Settings, or continue without location.'
        );
        return;
      }

      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocState('error');
        if (status === 'denied') {
          setErrorMsg(
            'Location permission was denied. You can still submit your report \u2014 we just won\u2019t be able to show exactly where the issue is.'
          );
        } else {
          setErrorMsg(
            'Location access is not available on this device. You can continue without adding a location.'
          );
        }
        return;
      }

      // Get current position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode for human-readable address
      let display = 'Location detected';
      let area: string | undefined;

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        if (addresses.length > 0) {
          const addr = addresses[0];
          display = [addr.street, addr.city, addr.region, addr.country]
            .filter(Boolean)
            .join(', ');
          area = addr.subregion || addr.city || undefined;
        }
      } catch {
        // Reverse geocoding failed — show coordinates-based fallback
        display = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      }

      onLocationChange({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        display,
        area,
        source: 'gps',
      });
      setLocState('success');
    } catch (err) {
      setLocState('error');
      setErrorMsg(
        'Could not detect your location. Please check your connection and try again.'
      );
    }
  }, [onLocationChange]);

  // ── IDLE: Show privacy explanation before requesting permission ──
  if (locState === 'idle') {
    return (
      <View style={styles.stepContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Add your location</Text>
          <Text style={styles.subheading}>
            Knowing where the issue is helps us route your report to the right
            authority. Tap the map to drop a pin, or share your current
            location — either way it&apos;s only used for this report.
          </Text>

          {/* Privacy-first explainer card */}
          <Card padding="lg" elevation="sm" style={styles.locationCard}>
            <View style={styles.locationCardHeader}>
              <Icon name="location" size={24} color={colors.primary} />
              <Text style={styles.locationCardTitle}>Why we need your location</Text>
            </View>

            <View style={styles.locationReasonItem}>
              <Text style={styles.locationReasonDot}>{'\u2022'}</Text>
              <Text style={styles.locationReasonText}>
                Pinpoints the exact spot of the issue for faster response
              </Text>
            </View>
            <View style={styles.locationReasonItem}>
              <Text style={styles.locationReasonDot}>{'\u2022'}</Text>
              <Text style={styles.locationReasonText}>
                Routes your report to the correct local authority
              </Text>
            </View>
            <View style={styles.locationReasonItem}>
              <Text style={styles.locationReasonDot}>{'\u2022'}</Text>
              <Text style={styles.locationReasonText}>
                Only approximate area is shared publicly \u2014 precise coordinates
                stay private
              </Text>
            </View>
          </Card>

          <View style={styles.locationInfoRow}>
            <Icon name="info" size={16} color={colors.primary} />
            <Text style={styles.locationInfoText}>
              We only access your location once, for this report. You can
              always skip and add location details later.
            </Text>
          </View>

          {/* Map picker — tap anywhere to pin the spot (no permission needed) */}
          <Card padding="none" elevation="sm" style={styles.mapCard}>
            <CivicMap
              markers={[]}
              selectedMarkerId={null}
              onMarkerSelect={() => {}}
              region={DEFAULT_REGION}
              onLocationPick={applyMapPick}
              pickedLocation={location}
            />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Use my location"
            variant="primary"
            size="lg"
            fullWidth
            onPress={fetchLocation}
          />
          <View style={styles.locationSkipSpacer} />
          <Button
            label="Skip \u2014 continue without location"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={onContinue}
          />
        </View>
      </View>
    );
  }

  // ── LOADING: Detecting location ─────────────────────────────────────
  if (locState === 'loading') {
    return (
      <View style={styles.stepContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Detecting location</Text>
          <Text style={styles.subheading}>
            Please wait while we find your current location\u2026
          </Text>

          <Card padding="none" elevation="sm" style={styles.mapPlaceholder}>
            <View style={styles.mapInner}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.mapLabel}>Finding your location\u2026</Text>
              <Text style={styles.mapSublabel}>
                This may take a few seconds depending on GPS signal.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // ── ERROR: Permission denied, services disabled, or fetch failure ────
  if (locState === 'error') {
    return (
      <View style={styles.stepContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Location unavailable</Text>
          <Text style={styles.subheading}>
            We couldn&apos;t detect your location. You can try again or
            continue without it.
          </Text>

          <Card padding="lg" elevation="sm" style={styles.locationCardError}>
            <View style={styles.locationCardHeader}>
              <Text style={styles.errorEmoji}>{'\u26A0'}</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          </Card>

          <View style={styles.locationInfoRow}>
            <Icon name="info" size={16} color={colors.primary} />
            <Text style={styles.locationInfoText}>
              Your report will still be submitted. Authorities can use your
              description to identify the location.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Try again"
            variant="primary"
            size="lg"
            fullWidth
            onPress={fetchLocation}
          />
          <View style={styles.locationSkipSpacer} />
          <Button
            label="Continue without location"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={onContinue}
          />
        </View>
      </View>
    );
  }

  // ── SUCCESS: Location captured ──────────────────────────────────────
  const isMapPick = location?.source === 'map';
  const accuracyLabel = isMapPick
    ? 'Pinned on map'
    : location?.accuracy
      ? location.accuracy <= 20
        ? 'High accuracy'
        : location.accuracy <= 100
          ? 'Good accuracy'
          : 'Approximate'
      : 'Accuracy unknown';

  return (
    <View style={styles.stepContent}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>
          {isMapPick ? 'Location pinned' : 'Location detected'}
        </Text>
        <Text style={styles.subheading}>
          {isMapPick
            ? 'Your report will use the spot you pinned. Tap the map to adjust it, or continue.'
            : 'We found your approximate location. Tap the map to adjust the exact spot if needed.'}
        </Text>

        {/* Location display card */}
        <Card padding="lg" elevation="sm" style={styles.locationCardSuccess}>
          <View style={styles.locationPinRow}>
            <View style={styles.locationPinIcon}>
              <Icon name="location" size={24} color={colors.primary} />
            </View>
            <View style={styles.locationPinDetails}>
              <Text style={styles.locationDisplayText} numberOfLines={2}>
                {location?.display}
              </Text>
              {location?.area ? (
                <Text style={styles.locationAreaText}>{location.area}</Text>
              ) : null}
              <Text style={styles.locationAccuracyText}>{accuracyLabel}</Text>
            </View>
          </View>
        </Card>

        {/* Map picker — tap to adjust the pinned spot */}
        <Card padding="none" elevation="sm" style={styles.mapCard}>
          <CivicMap
            markers={[]}
            selectedMarkerId={null}
            onMarkerSelect={() => {}}
            region={mapRegion}
            onLocationPick={applyMapPick}
            pickedLocation={location}
          />
        </Card>

        {/* Privacy note */}
        <View style={styles.locationInfoRow}>
          <Icon name="info" size={16} color={colors.primary} />
          <Text style={styles.locationInfoText}>
            Only the approximate area is shared with authorities. Your exact
            coordinates are kept private and are not visible to other users.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" variant="primary" size="lg" fullWidth onPress={onContinue} />
        <View style={styles.locationSkipSpacer} />
        <Button
          label={isMapPick ? 'Use my location instead' : 'Detect again'}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={fetchLocation}
        />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 5 — REVIEW
// ════════════════════════════════════════════════════════════════════

function ReviewStep({
  title,
  description,
  category,
  evidence,
  location,
  isSubmitting,
  submitError,
  onSubmit,
}: {
  title: string;
  description: string;
  category: IncidentCategory | null;
  evidence: EvidencePhoto[];
  location: ReportLocation | null;
  isSubmitting: boolean;
  submitError: string;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Review your report</Text>
        <Text style={styles.subheading}>
          Make sure everything looks right before submitting. You can go
          back to make changes.
        </Text>

        <Card padding="lg" elevation="sm">
          {/* Title */}
          <View style={styles.reviewField}>
            <Text style={styles.reviewLabel}>Title</Text>
            <Text style={styles.reviewValue}>{title}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.reviewField}>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValueLong}>{description}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Category */}
          <View style={styles.reviewField}>
            <Text style={styles.reviewLabel}>Category</Text>
            <Text style={styles.reviewValue}>
              {category ? CATEGORIES[category]?.label ?? category : 'Not selected (auto-detect)'}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Location */}
          <View style={styles.reviewField}>
            <Text style={styles.reviewLabel}>Location</Text>
            <Text style={styles.reviewValue}>
              {location
                ? location.area && location.display
                  ? `${location.area}, ${location.display}`
                  : location.display
                : 'Location not captured'}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Evidence */}
          <View style={styles.reviewField}>
            <Text style={styles.reviewLabel}>Evidence</Text>
            <Text style={styles.reviewValue}>
              {evidence.length > 0
                ? `${evidence.length} photo${evidence.length > 1 ? 's' : ''} attached`
                : 'No photos attached'}
            </Text>
          </View>
        </Card>

        <View style={styles.reviewNote}>
          <Icon name="info" size={14} color={colors.primary} />
          <Text style={styles.reviewNoteText}>
            After you submit, NigraanOS will analyse your report and route it
            to the right authority. Your report starts as{' '}
            <Text style={styles.reviewBold}>Reported</Text> — it becomes{' '}
            <Text style={styles.reviewBold}>Verified</Text> only after
            confirmation by officials.
          </Text>
        </View>

        {submitError ? (
          <Text style={styles.submitError}>{submitError}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Submit report"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting || evidence.length === 0}
          onPress={onSubmit}
        />
        {isSubmitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.submittingText} accessibilityLiveRegion="polite">
              Submitting your report — verifying evidence…
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 6 — SUCCESS
// ════════════════════════════════════════════════════════════════════

function SuccessStep({ title, onDone }: { title: string; onDone: () => void }) {
  return (
    <View style={styles.centeredContent}>
      <View style={styles.successIconCircle}>
        <Icon name="check" size={36} color={colors.textInverse} />
      </View>

      <Text style={styles.heading}>Report submitted</Text>
      <Text style={styles.subheading}>
        Thank you for making your community better. Your report is now
        being processed by NigraanOS.
      </Text>

      <Card padding="lg" elevation="sm" style={styles.successCard}>
        <View style={styles.successRow}>
          <Text style={styles.successLabel}>Report</Text>
          <Text style={styles.successValue} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.successRow}>
          <Text style={styles.successLabel}>Status</Text>
          <StatusBadge status={'REPORTED' as IncidentStatus} />
        </View>
      </Card>

      <View style={styles.successSteps}>
        <Text style={styles.successStepsHeading}>What happens next?</Text>
        <Text style={styles.successStepText}>
          1. NigraanOS analyses your report with AI
        </Text>
        <Text style={styles.successStepText}>
          2. If others report the same issue, it gets corroborated
        </Text>
        <Text style={styles.successStepText}>
          3. The relevant authority is notified for action
        </Text>
        <Text style={styles.successStepText}>
          4. You&apos;ll be updated as the status changes
        </Text>
      </View>

      <View style={styles.successFooter}>
        <Button label="Report another issue" variant="primary" size="lg" fullWidth onPress={onDone} />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },

  // Back bar
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  backLabel: {
    ...typography.styles.bodyMedium,
    color: colors.text,
  },
  backBarDisabled: {
    opacity: 0.4,
  },

  // Step layout
  stepContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  centeredContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // Typography
  heading: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing['2xl'],
  },

  // ── Entry step ─────────────────────────────────────────────────

  entryIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing['2xl'],
  },
  howItWorks: {
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  howItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  howIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: {
    ...typography.styles.body,
    color: colors.text,
    flex: 1,
  },
  entryFooter: {
    gap: spacing.md,
  },
  reassurance: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // ── Describe step ──────────────────────────────────────────────

  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 160,
    ...typography.styles.body,
    color: colors.text,
  },
  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  charHint: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  charCount: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  charCountWarn: {
    color: colors.warning,
  },

  // ── Voice recording (Describe step) ────────────────────────────

  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceBtnActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  voiceBtnLabel: {
    ...typography.styles.label,
    color: colors.primary,
  },
  voiceBtnLabelDone: {
    color: colors.success,
  },
  voiceRecordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  voiceTimer: {
    ...typography.styles.label,
    color: colors.error,
    fontVariant: ['tabular-nums'],
  },
  voiceSavedHint: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  voiceError: {
    ...typography.styles.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // ── Category step ──────────────────────────────────────────────

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryChip: {
    width: '48%' as unknown as number,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 88,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryLabel: {
    ...typography.styles.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.primary,
  },

  // ── Location step ──────────────────────────────────────────────

  mapCard: {
    height: 220,
    marginBottom: spacing.lg,
  },
mapPlaceholder: {
    height: 200,
    marginBottom: spacing.lg,
  },
  mapInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
  },
  mapLabel: {
    ...typography.styles.bodyMedium,
    color: colors.textTertiary,
  },
  mapSublabel: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
  },
  locationInfoText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
  locationCard: {
    marginBottom: spacing.lg,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationCardTitle: {
    ...typography.styles.title,
    color: colors.text,
    flex: 1,
  },
  locationReasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  locationReasonDot: {
    ...typography.styles.body,
    color: colors.primary,
    lineHeight: typography.lineHeight.relaxed,
  },
  locationReasonText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
  locationCardError: {
    backgroundColor: colors.errorLight,
    marginBottom: spacing.lg,
  },
  errorEmoji: {
    fontSize: 20,
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
  locationCardSuccess: {
    backgroundColor: colors.successLight,
    marginBottom: spacing.lg,
  },
  locationPinRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  locationPinIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinDetails: {
    flex: 1,
    gap: 2,
  },
  locationDisplayText: {
    ...typography.styles.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  locationAreaText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  locationAccuracyText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  locationSkipSpacer: {
    height: spacing.sm,
  },

  // ── Evidence step ──────────────────────────────────────────────

  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  evidenceItem: {
    width: '30%' as unknown as number,
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceRemoveBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceRemoveIcon: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  evidenceBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  evidenceBadgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '500',
  },
  evidenceAddBtn: {
    width: '30%' as unknown as number,
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  evidenceAddIcon: {
    fontSize: 28,
    color: colors.textTertiary,
    lineHeight: 32,
  },
  evidenceAddText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  evidenceRequiredError: {
    ...typography.styles.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // ── Review step ────────────────────────────────────────────────

  reviewField: {
    paddingVertical: spacing.md,
  },
  reviewLabel: {
    ...typography.styles.label,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    ...typography.styles.bodyMedium,
    color: colors.text,
  },
  reviewValueLong: {
    ...typography.styles.body,
    color: colors.text,
    lineHeight: typography.lineHeight.relaxed,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
  },
  reviewNoteText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
  reviewBold: {
    fontWeight: '600',
  },
  submitError: {
    ...typography.styles.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submittingText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },

  // ── Success step ───────────────────────────────────────────────

  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  successCard: {
    alignSelf: 'stretch',
    marginVertical: spacing.xl,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  successLabel: {
    ...typography.styles.label,
    color: colors.textTertiary,
  },
  successValue: {
    ...typography.styles.bodyMedium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.lg,
  },
  successSteps: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
  successStepsHeading: {
    ...typography.styles.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  successStepText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  successFooter: {
    alignSelf: 'stretch',
  },
});
