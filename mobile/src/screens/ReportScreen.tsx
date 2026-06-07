import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SessionReport } from '@airealtalk/shared';
import { ScreenContainer } from '../components/ScreenContainer';

const CATEGORY_LABELS: Record<string, string> = {
  tense: '时态',
  preposition: '介词',
  collocation: '搭配',
  expression: '表达',
  other: '其他',
};

type ReportScreenProps = {
  report: SessionReport;
  scenarioTitle: string;
  onDone: () => void;
};

function formatDuration(durationSec: number): string {
  if (durationSec < 60) {
    return `${durationSec} 秒`;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`;
}

export function ReportScreen({
  report,
  scenarioTitle,
  onDone,
}: ReportScreenProps) {
  return (
    <ScreenContainer style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>练习报告</Text>
        <Text style={styles.subtitle}>{scenarioTitle}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>总结</Text>
          <Text style={styles.summaryText}>{report.summary}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="对话轮次" value={String(report.turnCount)} />
          <StatCard label="发言时长" value={formatDuration(report.durationSec)} />
          <StatCard label="语速 WPM" value={String(report.wpm)} />
          <StatCard
            label="目标覆盖"
            value={`${report.goalCoverage}%`}
          />
        </View>

        <Section title="语法问题分类">
          {report.grammarIssues.length === 0 ? (
            <Text style={styles.emptyText}>暂无语法分类统计</Text>
          ) : (
            report.grammarIssues.map((issue) => (
              <View key={`${issue.type}-${issue.count}`} style={styles.issueRow}>
                <Text style={styles.issueType}>{issue.type}</Text>
                <Text style={styles.issueCount}>{issue.count} 处</Text>
              </View>
            ))
          )}
        </Section>

        <Section title={`表达纠错（${report.corrections.length}）`}>
          {report.corrections.map((correction, index) => (
            <View key={`${index}-${correction.original}`} style={styles.correctionCard}>
              <Text style={styles.correctionCategory}>
                {CATEGORY_LABELS[correction.category] ?? correction.category}
              </Text>
              <View style={styles.correctionBlock}>
                <Text style={styles.correctionLabel}>原文</Text>
                <Text style={styles.correctionOriginal}>{correction.original}</Text>
              </View>
              <View style={styles.correctionBlock}>
                <Text style={styles.correctionLabel}>建议</Text>
                <Text style={styles.correctionSuggestion}>
                  {correction.suggestion}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>

      <Pressable style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>返回场景选择</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 16,
  },
  content: {
    gap: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  summaryText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  issueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  issueType: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  issueCount: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '700',
  },
  correctionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  correctionCategory: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  correctionBlock: {
    gap: 4,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  correctionOriginal: {
    fontSize: 15,
    color: '#dc2626',
    lineHeight: 21,
  },
  correctionSuggestion: {
    fontSize: 15,
    color: '#16a34a',
    lineHeight: 21,
  },
  doneButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
