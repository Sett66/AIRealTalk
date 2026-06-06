import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SessionPhase } from '@airealtalk/shared';

const PHASE_LABELS: Record<SessionPhase, string> = {
  idle: '待发言',
  listening: '倾听中',
  processing: '思考中',
  speaking: '回复中',
};

const PHASE_COLORS: Record<SessionPhase, string> = {
  idle: '#64748b',
  listening: '#dc2626',
  processing: '#ca8a04',
  speaking: '#16a34a',
};

type PhaseIndicatorProps = {
  phase: SessionPhase;
};

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: PHASE_COLORS[phase] }]} />
      <Text style={[styles.label, { color: PHASE_COLORS[phase] }]}>
        {PHASE_LABELS[phase]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
