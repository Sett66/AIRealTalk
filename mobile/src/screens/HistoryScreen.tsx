import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PracticeSummary, SessionReport } from '@airealtalk/shared';
import { ScoreTrendChart } from '../components/ScoreTrendChart';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  getPracticeHistory,
  getRecentPronunciationScores,
  getSessionReport,
} from '../stores/history-store';

type HistoryScreenProps = {
  onBack: () => void;
  onOpenReport: (report: SessionReport, scenarioTitle: string) => void;
};

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(durationSec: number): string {
  if (durationSec < 60) {
    return `${durationSec} 秒`;
  }
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`;
}

export function HistoryScreen({ onBack, onOpenReport }: HistoryScreenProps) {
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [history, setHistory] = useState<PracticeSummary[]>([]);
  const [trendPoints, setTrendPoints] = useState<
    Array<{ id: string; date: string; score: number; label: string }>
  >([]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const [entries, scores] = await Promise.all([
      getPracticeHistory(),
      getRecentPronunciationScores(7),
    ]);
    setHistory(entries);
    setTrendPoints(scores);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleOpenReport = async (item: PracticeSummary) => {
    setOpeningId(item.sessionId);
    try {
      const report = await getSessionReport(item.sessionId);
      if (!report) {
        Alert.alert(
          '无法查看报告',
          '该练习的详细报告未保存（可能是功能上线前的旧记录）。',
        );
        return;
      }
      onOpenReport(report, item.scenarioTitle);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </Pressable>
        <Text style={styles.title}>练习历史</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近 7 次发音均分</Text>
            {history.length >= 3 && trendPoints.length >= 2 ? (
              <ScoreTrendChart points={trendPoints} />
            ) : (
              <Text style={styles.hint}>
                已完成 {history.length} 次练习，再练 {Math.max(0, 3 - history.length)} 次可显示趋势图
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>历史记录（{history.length}）</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>暂无练习记录，完成一次对话后会自动保存</Text>
            ) : (
              history.map((item) => (
                <Pressable
                  key={item.sessionId}
                  style={({ pressed }) => [
                    styles.historyCard,
                    pressed && styles.historyCardPressed,
                  ]}
                  disabled={openingId === item.sessionId}
                  onPress={() => void handleOpenReport(item)}
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.scenarioTitle}>{item.scenarioTitle}</Text>
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      发音 {item.pronunciationAvg ?? '—'} 分
                    </Text>
                    <Text style={styles.metaText}>{item.turnCount} 轮</Text>
                    <Text style={styles.metaText}>
                      {formatDuration(item.durationSec)}
                    </Text>
                  </View>
                  <Text style={styles.tapHint}>
                    {openingId === item.sessionId ? '加载中…' : '点击查看详细报告 ›'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
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
    gap: 8,
    marginBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  loader: {
    marginTop: 40,
  },
  content: {
    gap: 20,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 8,
  },
  historyCardPressed: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  historyHeader: {
    gap: 4,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
});
