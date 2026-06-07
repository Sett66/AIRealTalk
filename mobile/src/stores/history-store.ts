import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PracticeSummarySchema,
  SessionReportSchema,
  type PracticeSummary,
  type SessionReport,
} from '@airealtalk/shared';

const STORAGE_KEY = '@airealtalk/practice-history';
const REPORTS_KEY = '@airealtalk/session-reports';
const MAX_ENTRIES = 50;

async function readAll(): Promise<PracticeSummary[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const result = PracticeSummarySchema.safeParse(item);
        return result.success ? result.data : null;
      })
      .filter((item): item is PracticeSummary => item !== null);
  } catch {
    return [];
  }
}

async function writeAll(entries: PracticeSummary[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function readReports(): Promise<Record<string, SessionReport>> {
  const raw = await AsyncStorage.getItem(REPORTS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const reports: Record<string, SessionReport> = {};
    for (const [sessionId, value] of Object.entries(parsed)) {
      const result = SessionReportSchema.safeParse(value);
      if (result.success) {
        reports[sessionId] = result.data;
      }
    }
    return reports;
  } catch {
    return {};
  }
}

async function writeReports(reports: Record<string, SessionReport>): Promise<void> {
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function buildPracticeSummary(
  report: SessionReport,
  scenarioTitle: string,
): PracticeSummary {
  return {
    sessionId: report.sessionId,
    scenarioId: report.scenarioId,
    scenarioTitle,
    date: new Date().toISOString(),
    pronunciationAvg: report.pronunciationAvg,
    turnCount: report.turnCount,
    durationSec: report.durationSec,
  };
}

/** 保存练习摘要与完整报告（本地） */
export async function savePracticeRecord(
  report: SessionReport,
  scenarioTitle: string,
): Promise<void> {
  const summary = buildPracticeSummary(report, scenarioTitle);
  const existing = await readAll();
  const withoutDuplicate = existing.filter(
    (item) => item.sessionId !== summary.sessionId,
  );
  const nextSummaries = [summary, ...withoutDuplicate].slice(0, MAX_ENTRIES);
  const keptIds = new Set(nextSummaries.map((item) => item.sessionId));

  const reports = await readReports();
  reports[report.sessionId] = report;
  const prunedReports = Object.fromEntries(
    Object.entries(reports).filter(([sessionId]) => keptIds.has(sessionId)),
  );

  await Promise.all([writeAll(nextSummaries), writeReports(prunedReports)]);
}

export async function getSessionReport(
  sessionId: string,
): Promise<SessionReport | null> {
  const reports = await readReports();
  return reports[sessionId] ?? null;
}

export async function getPracticeHistory(): Promise<PracticeSummary[]> {
  const entries = await readAll();
  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getRecentPronunciationScores(
  limit = 7,
): Promise<Array<{ id: string; date: string; score: number; label: string }>> {
  const history = await getPracticeHistory();
  return history
    .filter((item) => item.pronunciationAvg !== undefined)
    .slice(0, limit)
    .reverse()
    .map((item) => ({
      id: item.sessionId,
      date: item.date,
      score: item.pronunciationAvg ?? 0,
      label: new Date(item.date).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
}
