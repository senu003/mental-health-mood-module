import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LabReport, Marker } from '@/services/mood-api';

type BiomarkerCardProps = {
  biomarker?: Marker;
  index?: number;
};

export function BiomarkerCard({ biomarker }: BiomarkerCardProps) {
  if (!biomarker) return null;

  const statusColors = {
    normal: '#ECFDF3',
    low: '#FEFCE8',
    high: '#FEF2F2',
    'not-found': '#F8FAFC',
  };

  const statusTextColors = {
    normal: '#0A7E3C',
    low: '#92400E',
    high: '#7C2D12',
    'not-found': '#475569',
  };

  const statusBgColor = statusColors[biomarker.status as keyof typeof statusColors] || '#F8FAFC';
  const statusTextColor =
    statusTextColors[biomarker.status as keyof typeof statusTextColors] || '#475569';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.biomarkerName}>{biomarker.name}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusBgColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusTextColor,
              },
            ]}
          >
            {biomarker.status.charAt(0).toUpperCase() + biomarker.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {biomarker.value && (
          <View style={styles.metricRow}>
            <Text style={styles.label}>Value:</Text>
            <Text style={styles.value}>
              {biomarker.value} {biomarker.unit || ''}
            </Text>
          </View>
        )}

        {biomarker.referenceRange && (
          <View style={styles.metricRow}>
            <Text style={styles.label}>Range:</Text>
            <Text style={styles.value}>{biomarker.referenceRange}</Text>
          </View>
        )}

        {biomarker.explanation && (
          <View style={styles.explanationSection}>
            <Text style={styles.explanation}>{biomarker.explanation}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

type ScoreGaugeProps = {
  score?: number;
};

export function ScoreGauge({ score }: ScoreGaugeProps) {
  if (score === undefined || score === null) return null;

  const getScoreBand = (score: number) => {
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Moderate';
    return 'Needs Attention';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#0A7E3C';
    if (score >= 50) return '#D97706';
    return '#DC2626';
  };

  return (
    <View style={styles.scoreContainer}>
      <View
        style={[
          styles.scoreCircle,
          {
            borderColor: getScoreColor(score),
          },
        ]}
      >
        <Text style={styles.scoreValue}>{Math.round(score)}</Text>
      </View>
      <Text style={styles.scoreBand}>{getScoreBand(score)}</Text>
    </View>
  );
}

type StatsCardProps = {
  label: string;
  value: string | number | null | undefined;
  icon?: string;
};

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsLabel}>{label}</Text>
      <Text style={styles.statsValue}>{value ?? 'N/A'}</Text>
    </View>
  );
}

type ReportCardProps = {
  report: LabReport;
  onPress?: () => void;
};

export function ReportCard({ report, onPress }: ReportCardProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return '#6B7280';
    if (score >= 70) return '#0A7E3C';
    if (score >= 50) return '#D97706';
    return '#DC2626';
  };

  return (
    <Pressable
      style={styles.reportCard}
      onPress={onPress}
      {...(onPress && { accessible: true, accessibilityRole: 'button' })}
    >
      <View style={styles.reportCardHeader}>
        <View>
          <Text style={styles.reportName}>{report.displayName || report.fileName}</Text>
          <Text style={styles.reportDate}>
            {new Date(report.uploadedAt).toLocaleDateString()}
          </Text>
        </View>
        {report.overallScore !== undefined && (
          <View
            style={[
              styles.scoreMiniBadge,
              {
                borderColor: getScoreColor(report.overallScore),
              },
            ]}
          >
            <Text style={[styles.scoreMiniText, { color: getScoreColor(report.overallScore) }]}>
              {Math.round(report.overallScore)}
            </Text>
          </View>
        )}
      </View>

      {report.summary && (
        <Text style={styles.reportSummary} numberOfLines={2}>
          {report.summary}
        </Text>
      )}

      <View style={styles.reportTagsRow}>
        {report.biomarkers && report.biomarkers.length > 0 && (
          <Text style={styles.tagCount}>{report.biomarkers.length} biomarkers</Text>
        )}
        {report.dataQuality !== undefined && (
          <Text style={styles.tagQuality}>{Math.round(report.dataQuality)}% complete</Text>
        )}
      </View>
    </Pressable>
  );
}

type RecommendationItemProps = {
  text: string;
  isDaily?: boolean;
};

export function RecommendationItem({ text, isDaily }: RecommendationItemProps) {
  return (
    <View style={styles.recommendationItem}>
      <Text style={styles.recommendationIcon}>{isDaily ? '→' : '✓'}</Text>
      <Text style={styles.recommendationText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  biomarkerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  explanationSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  explanation: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scoreBand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statsLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scoreMiniBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreMiniText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportSummary: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 18,
  },
  reportTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagCount: {
    fontSize: 11,
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagQuality: {
    fontSize: 11,
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderRadius: 6,
  },
  recommendationIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#0C5BD5',
    fontWeight: 'bold',
  },
  recommendationText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },
});
