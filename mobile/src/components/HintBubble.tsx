import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const AUTO_DISMISS_MS = 8000;

export type HintEntry = {
  message: string;
  severity: 'major' | 'minor';
};

type HintBubbleProps = {
  hints: HintEntry[];
  visible: boolean;
  onDismiss: () => void;
};

export function HintBubble({ hints, visible, onDismiss }: HintBubbleProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(0);
      return;
    }

    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    const timer = setTimeout(() => {
      onDismissRef.current();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible, hints, slideAnim]);

  if (!visible || hints.length === 0) {
    return null;
  }

  const majorCount = hints.filter((hint) => hint.severity === 'major').length;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-56, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={styles.label}>
          轻提示{hints.length > 1 ? ` (${hints.length})` : ''}
        </Text>
        {hints.map((hint, index) => (
          <View key={`${index}-${hint.message}`} style={styles.hintRow}>
            <View
              style={[
                styles.severityDot,
                hint.severity === 'major' ? styles.majorDot : styles.minorDot,
              ]}
            />
            <Text
              style={[
                styles.message,
                hint.severity === 'minor' && styles.minorMessage,
              ]}
            >
              {hint.message}
            </Text>
          </View>
        ))}
        {majorCount > 0 && hints.length > majorCount && (
          <Text style={styles.legend}>橙点 = 需优先修正</Text>
        )}
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="关闭提示"
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 12,
    gap: 8,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  majorDot: {
    backgroundColor: '#ea580c',
  },
  minorDot: {
    backgroundColor: '#f59e0b',
  },
  message: {
    flex: 1,
    fontSize: 15,
    color: '#9a3412',
    lineHeight: 21,
  },
  minorMessage: {
    color: '#b45309',
  },
  legend: {
    fontSize: 11,
    color: '#c2410c',
    fontStyle: 'italic',
  },
  closeButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#c2410c',
    fontWeight: '600',
  },
});
