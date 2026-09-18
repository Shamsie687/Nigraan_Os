/**
 * Civic Assistant — Chat Screen
 *
 * Minimal in-app assistant where citizens ask civic questions and
 * receive deterministic assessments from the on-device civic rules
 * engine (civic-rules.ts). No AI model. No backend call. All responses
 * are transparent, rule-based analyses labelled "Civic Assessment".
 *
 * Supports:
 * - Civic problem questions (water, roads, electricity, etc.)
 * - Report guidance (how to describe issues)
 * - Severity / urgency guidance
 * - Recommended next actions
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Icon,
  colors,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
} from '../../src/design';
import {
  analyzeCivicIssue,
  type CivicAssessment,
  type Severity,
} from '../../src/services/intelligence/civic-rules';

// ── Types ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Structured assessment — only present on assistant messages */
  assessment?: CivicAssessment;
  timestamp: number;
}

// ── Helpers ────────────────────────────────────────────────────────

let _msgId = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++_msgId}`;
}

/** Format a CivicAssessment into a readable chat response. */
function formatAssessment(a: CivicAssessment): string {
  const lines: string[] = [];

  // Header
  lines.push(`**${a.categoryLabel}** — ${severityLabel(a.severity)} severity`);
  lines.push('');

  // Summary
  lines.push(a.summary);
  lines.push('');

  // Urgency reason
  lines.push(`*Urgency:* ${a.urgencyReason}`);
  lines.push('');

  // Potential impacts
  if (a.potentialImpacts.length > 0) {
    lines.push('*Potential impacts:*');
    for (const impact of a.potentialImpacts) {
      lines.push(`• ${impact}`);
    }
    lines.push('');
  }

  // Recommended actions
  if (a.recommendedActions.length > 0) {
    lines.push('*Recommended actions:*');
    for (const action of a.recommendedActions) {
      lines.push(`• ${action}`);
    }
    lines.push('');
  }

  // Ripple effects
  if (a.rippleEffects.length > 0) {
    lines.push(`*Ripple: ${a.rippleTrigger}*`);
    for (const effect of a.rippleEffects) {
      lines.push(`• ${effect}`);
    }
    lines.push(`Overall: ${a.rippleOverallImpact}`);
  }

  return lines.join('\n');
}

function severityLabel(s: Severity): string {
  switch (s) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
  }
}

function severityColor(s: Severity): string {
  switch (s) {
    case 'critical':
      return colors.error;
    case 'high':
      return colors.warning;
    case 'medium':
      return colors.info;
    case 'low':
      return colors.success;
  }
}

const WELCOME_TEXT =
  "I'm the NigraanOS Civic Assistant. Describe a civic issue you're seeing — " +
  'a water leak, broken road, power outage, waste problem, or any civic concern — ' +
  "and I'll provide an assessment with severity, impacts, and recommended actions.\n\n" +
  'My analysis is rule-based and transparent, not AI-generated.';

const SUGGESTED_QUESTIONS = [
  'Water pipe leaking on main road',
  'Large pothole near school',
  'Power outage in my area since morning',
  'Garbage not collected for a week',
];

// ── Components ─────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <View style={[styles.severityBadge, { backgroundColor: `${severityColor(severity)}18` }]}>
      <View style={[styles.severityDot, { backgroundColor: severityColor(severity) }]} />
      <Text style={[styles.severityLabel, { color: severityColor(severity) }]}>
        {severityLabel(severity)}
      </Text>
    </View>
  );
}

/** Minimal Markdown-like rendering: **bold** and *italic*. */
function RichText({ text, style }: { text: string; style?: object }) {
  const parts: Array<{ text: string; bold: boolean; italic: boolean }> = [];

  // Simple parser: split by **..** and *..* markers
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[2]) {
      // **bold**
      parts.push({ text: match[2], bold: true, italic: false });
    } else if (match[3]) {
      // *italic*
      parts.push({ text: match[3], bold: false, italic: true });
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }

  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <Text
          key={i}
          style={
            part.bold
              ? { fontWeight: '600' }
              : part.italic
                ? { fontStyle: 'italic' }
                : undefined
          }
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({
  text,
  assessment,
}: {
  text: string;
  assessment?: CivicAssessment;
}) {
  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantBadge}>
        <Icon name="shield" size={13} color={colors.primary} />
      </View>
      <View style={styles.assistantBubble}>
        <View style={styles.assistantHeader}>
          <Text style={styles.assistantLabel}>Civic Assessment</Text>
          {assessment ? <SeverityBadge severity={assessment.severity} /> : null}
        </View>
        {assessment ? (
          <View>
            <RichText text={text} style={styles.assistantText} />
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>
                Confidence: {assessment.confidence}%
              </Text>
            </View>
          </View>
        ) : (
          <RichText text={text} style={styles.assistantText} />
        )}
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: WELCOME_TEXT,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      // Run the deterministic civic rules engine
      const assessment = analyzeCivicIssue(trimmed);
      const responseText = formatAssessment(assessment);

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: responseText,
        assessment,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
    },
    [],
  );

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) =>
      item.role === 'user' ? (
        <UserBubble text={item.text} />
      ) : (
        <AssistantBubble text={item.text} assessment={item.assessment} />
      ),
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const showSuggestions = messages.length <= 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            showSuggestions ? (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Try asking about:</Text>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.suggestionChipPressed,
                    ]}
                    onPress={() => handleSuggestion(q)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ask: ${q}`}
                  >
                    <Icon name="search" size={13} color={colors.primary} />
                    <Text style={styles.suggestionText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Describe a civic issue…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
            accessibilityLabel="Type a civic issue description"
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!input.trim()) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Icon
              name="send"
              size={18}
              color={input.trim() ? colors.textOnPrimary : colors.textTertiary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Chat content
  chatContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // User bubble
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userText: {
    ...typography.styles.bodySmall,
    color: colors.textOnPrimary,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Assistant bubble
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  assistantBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  assistantBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderBottomLeftRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  assistantLabel: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  assistantText: {
    ...typography.styles.bodySmall,
    color: colors.text,
    lineHeight: typography.lineHeight.relaxed,
  },
  confidenceRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  confidenceLabel: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },

  // Severity badge
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.sm,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
  },

  // Suggestions
  suggestionsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  suggestionsTitle: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  suggestionChipPressed: {
    opacity: 0.8,
    backgroundColor: colors.primaryLight,
  },
  suggestionText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1,
    ...typography.styles.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
});
