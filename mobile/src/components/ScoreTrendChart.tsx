import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

export type ScorePoint = {
  id: string;
  label: string;
  score: number;
};

type ScoreTrendChartProps = {
  points: ScorePoint[];
};

const CHART_HEIGHT = 132;
const PAD_X = 20;
const PAD_TOP = 16;
const LABEL_HEIGHT = 40;

export function ScoreTrendChart({ points }: ScoreTrendChartProps) {
  const { width: screenWidth } = useWindowDimensions();

  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>完成至少 2 次练习后显示趋势</Text>
      </View>
    );
  }

  const chartWidth = screenWidth - 40;
  const plotWidth = chartWidth - PAD_X * 2;
  const plotHeight = CHART_HEIGHT - PAD_TOP - 8;

  const minScore = Math.max(0, Math.min(...points.map((p) => p.score)) - 8);
  const maxScore = Math.min(100, Math.max(...points.map((p) => p.score)) + 8);
  const range = Math.max(maxScore - minScore, 1);

  const coords = points.map((point, index) => {
    const x =
      PAD_X +
      (points.length === 1
        ? plotWidth / 2
        : (index / (points.length - 1)) * plotWidth);
    const y =
      PAD_TOP + plotHeight - ((point.score - minScore) / range) * plotHeight;
    return { ...point, x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View style={styles.wrapper}>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = PAD_TOP + plotHeight * (1 - ratio);
          return (
            <Line
              key={ratio}
              x1={PAD_X}
              y1={y}
              x2={PAD_X + plotWidth}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((point) => (
          <Circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={6}
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth={2}
          />
        ))}
      </Svg>

      <View style={styles.labelsRow}>
        {coords.map((point) => (
          <View key={point.id} style={styles.labelCol}>
            <Text style={styles.scoreLabel}>{point.score}</Text>
            <Text style={styles.dateLabel} numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 8,
    overflow: 'visible',
  },
  labelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    minHeight: LABEL_HEIGHT,
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
