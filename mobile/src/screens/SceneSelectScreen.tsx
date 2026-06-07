import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScenarioListSchema, type Scenario } from '@airealtalk/shared';
import { ScreenContainer } from '../components/ScreenContainer';
import { API_BASE_URL } from '../config';

type LoadState = 'loading' | 'ok' | 'error';

type SceneSelectScreenProps = {
  onSelectScenario: (scenario: Scenario) => void;
  onBack: () => void;
};

export function SceneSelectScreen({
  onSelectScenario,
  onBack,
}: SceneSelectScreenProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/scenarios`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json: unknown = await response.json();
      const parsed = ScenarioListSchema.parse(json);
      setScenarios(parsed);
      setState('ok');
    } catch (error) {
      setScenarios([]);
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    void fetchScenarios();
  }, [fetchScenarios]);

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="返回首页"
        >
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>选择场景</Text>
        <Text style={styles.subtitle}>面试 · 点餐 · 会议</Text>
      </View>

      {state === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.hint}>加载场景中…</Text>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>无法加载场景：{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => void fetchScenarios()}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      )}

      {state === 'ok' && (
        <ScrollView contentContainerStyle={styles.list}>
          {scenarios.map((scenario) => (
            <Pressable
              key={scenario.id}
              style={styles.card}
              onPress={() => onSelectScenario(scenario)}
            >
              <Text style={styles.cardTitle}>{scenario.title}</Text>
              <Text style={styles.cardSubtitle}>{scenario.titleEn}</Text>
              <Text style={styles.cardRole}>{scenario.role}</Text>
              <Text style={styles.cardDifficulty}>难度 {scenario.difficulty}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    gap: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    marginBottom: 8,
    paddingRight: 12,
  },
  backText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hint: {
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  cardRole: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  cardDifficulty: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
});
