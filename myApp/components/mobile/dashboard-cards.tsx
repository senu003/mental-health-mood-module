import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MobilePalette } from '@/constants/theme';

type CardProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
};

type TrendRowProps = {
  label: string;
  value: number;
  hasData: boolean;
};

type QuickActionProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

export const MetricCard = ({ icon, label, value }: CardProps) => (
  <View style={styles.metricCard}>
    <View style={styles.metricIconWrap}>
      <MaterialCommunityIcons name={icon} size={22} color={MobilePalette.primary} />
    </View>
    <View style={styles.metricTextWrap}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  </View>
);

export const TrendRow = ({ label, value, hasData }: TrendRowProps) => {
  const width = `${Math.max(12, Math.min(100, (value / 10) * 100))}%`;

  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendLabel}>{label}</Text>
      <View style={styles.trendBarTrack}>
        <View
          style={[
            styles.trendBarFill,
            {
              width,
              opacity: hasData ? 1 : 0.35,
            },
          ]}
        />
      </View>
      <Text style={styles.trendValue}>{value.toFixed(1)}/10</Text>
    </View>
  );
};

export const QuickActionCard = ({ icon, title, description, onPress }: QuickActionProps) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.quickActionCard, pressed && styles.pressed]}>
    <View style={styles.quickActionIconWrap}>
      <MaterialCommunityIcons name={icon} size={24} color={MobilePalette.primary} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
    <Text style={styles.quickActionDescription}>{description}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#deebf5',
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MobilePalette.softSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextWrap: {
    flex: 1,
  },
  metricLabel: {
    color: '#5b7083',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#111',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 3,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  trendLabel: {
    width: 42,
    color: '#475467',
    fontSize: 15,
    fontWeight: '700',
  },
  trendBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dbe6ee',
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: MobilePalette.primary,
  },
  trendValue: {
    width: 58,
    textAlign: 'right',
    color: '#344054',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MobilePalette.softSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
  },
  quickActionDescription: {
    color: '#6b6262',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 22,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
