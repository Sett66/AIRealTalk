import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { HealthResponse } from '@airealtalk/shared';
import { HealthResponseSchema } from '@airealtalk/shared';
import { API_BASE_URL } from '../config';

type LoadState = 'idle' | 'loading' | 'ok' | 'error';

export function HomeScreen() {
  const [state, setState] = useState<LoadState>('idle');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json: unknown = await response.json();
      const parsed = HealthResponseSchema.parse(json);
      setHealth(parsed);
      setState('ok');
    } catch (error) {
      setHealth(null);
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AIRealTalk</Text>
      <Text style={styles.subtitle}>英语口语练习 · Issue #01 基建</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Backend 健康检查</Text>
        <Text style={styles.apiUrl}>{API_BASE_URL}/health</Text>

        {state === 'loading' && <ActivityIndicator size="large" color="#2563eb" />}

        {state === 'ok' && health && (
          <View style={styles.resultOk}>
            <Text style={styles.statusBadge}>● 已连接</Text>
            <Text style={styles.resultText}>status: {health.status}</Text>
            <Text style={styles.resultText}>timestamp: {health.timestamp}</Text>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.resultError}>
            <Text style={styles.statusBadgeError}>● 未连接</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.hint}>
              请启动 backend，真机请将 src/config.ts 中的 IP 改为电脑局域网地址。
            </Text>
          </View>
        )}

        <Pressable style={styles.button} onPress={() => void fetchHealth()}>
          <Text style={styles.buttonText}>重新检测</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  apiUrl: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  resultOk: {
    gap: 4,
  },
  resultError: {
    gap: 6,
  },
  statusBadge: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 16,
  },
  statusBadgeError: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 16,
  },
  resultText: {
    color: '#475569',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  hint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
