import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  type PressableProps,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MobilePalette } from '@/constants/theme';
import { SidebarDrawer } from '@/components/mobile/sidebar-drawer';
import { MetricCard, TrendRow } from '@/components/mobile/dashboard-cards';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const fmtAverage = (value: number | string) => {
  const numericValue = Number(value || 0);
  return `${numericValue.toFixed(1)}/10`;
};

const getTodayLabel = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TactilePressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

function TactilePressable({ style, scaleTo = 0.97, onPressIn, onPressOut, ...props }: TactilePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: 120 });
        onPressOut?.(event);
      }}
    />
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { stats, weeklyMood, loading, error, refresh } = useDashboardData();
  const todayLabel = getTodayLabel();

  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <SidebarDrawer visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111" />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerKicker}>Mood Tracking</Text>
            <Text style={styles.headerTitle}>Track your emotional wellbeing</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => setSidebarVisible(true)} style={styles.iconButton}>
              <MaterialCommunityIcons name="menu" size={22} color="#111" />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)' as never)} style={styles.iconButton}>
              <MaterialCommunityIcons name="cog-outline" size={22} color="#111" />
            </Pressable>
          </View>
        </View>

        <Animated.View
          style={styles.metaRow}
          entering={FadeInDown.delay(40).duration(420).springify().damping(18)}
        >
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="calendar-today" size={14} color={MobilePalette.primary} />
            <Text style={styles.metaPillText}>{todayLabel}</Text>
          </View>
          <View style={[styles.metaPill, styles.metaPillStrong]}>
            <MaterialCommunityIcons name="fire" size={14} color="#fff" />
            <Text style={styles.metaPillStrongText}>{stats.checkInStreak} day streak</Text>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={MobilePalette.primary} />
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Dashboard unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Animated.View
              style={styles.metricsWrap}
              entering={FadeInDown.delay(90).duration(460).springify().damping(18)}
            >
              <MetricCard icon="trending-up" label="7-Day Average" value={fmtAverage(stats.sevenDayAverage)} />
              <MetricCard icon="calendar-check" label="Check-in Streak" value={`${stats.checkInStreak} days`} />
              <MetricCard icon="heart-pulse" label="Recovery Score" value={`${stats.recoveryScore}%`} />
            </Animated.View>

            <Animated.View
              style={styles.checkInCard}
              entering={FadeInDown.delay(150).duration(500).springify().damping(19)}
            >
              <View style={styles.checkInHeader}>
                <View style={styles.checkInIconWrap}>
                  <MaterialCommunityIcons name="clock-outline" size={22} color={MobilePalette.primary} />
                </View>
                <Text style={styles.checkInTitle}>Daily Check-in</Text>
              </View>
              <View style={[styles.checkInBody, isWide && styles.checkInBodyWide]}>
                <Text style={styles.checkInPrompt}>How are you feeling today?</Text>
                <TactilePressable onPress={() => router.push('/(tabs)/checkin-step-one' as never)} style={styles.checkInButton}>
                  <Text style={styles.checkInButtonText}>Start Check-in</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
                </TactilePressable>
              </View>
            </Animated.View>

            <View style={[styles.trendSection, isWide && styles.trendSectionWide]}>
              <Animated.View
                style={styles.trendCard}
                entering={FadeInDown.delay(220).duration(540).springify().damping(20)}
              >
                <Text style={styles.sectionEyebrow}>Weekly Overview</Text>
                <Text style={styles.sectionTitle}>This Week's Mood Trends</Text>
                <View style={styles.trendList}>
                  {weeklyMood.map((item) => (
                    <TrendRow
                      key={item.fullDate}
                      label={item.day}
                      value={Number(item.value || 0)}
                      hasData={item.hasData}
                    />
                  ))}
                </View>

                <Pressable onPress={() => router.push('/history' as never)} style={styles.historyButton}>
                  <Text style={styles.historyButtonText}>View Full History</Text>
                </Pressable>

                <Animated.View
                  style={styles.inlineQuickActionsRow}
                  entering={FadeInDown.delay(300).duration(520).springify().damping(20)}
                >
                  <Animated.View entering={FadeInDown.delay(340).duration(420).springify().damping(20)}>
                    <TactilePressable
                    style={[styles.inlineQuickActionButton, styles.inlineQuickActionPrimary]}
                    onPress={() => router.push('/dashboard' as never)}
                      scaleTo={0.975}
                  >
                    <View style={styles.inlineIconWrap}>
                      <MaterialCommunityIcons name="brain" size={20} color={MobilePalette.primary} />
                    </View>
                    <View style={styles.inlineTextWrap}>
                      <Text style={styles.inlineQuickActionTitle}>Insight</Text>
                      <Text style={styles.inlineQuickActionSubtitle}>See patterns and triggers</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#111" />
                    </TactilePressable>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(390).duration(420).springify().damping(20)}>
                    <TactilePressable
                    style={[styles.inlineQuickActionButton, styles.inlineQuickActionSecondary]}
                    onPress={() => router.push('/(tabs)/mood-fix-suggestion' as never)}
                      scaleTo={0.975}
                  >
                    <View style={styles.inlineIconWrap}>
                      <MaterialCommunityIcons name="sparkles" size={20} color={MobilePalette.primary} />
                    </View>
                    <View style={styles.inlineTextWrap}>
                      <Text style={styles.inlineQuickActionTitle}>Mood Fix</Text>
                      <Text style={styles.inlineQuickActionSubtitle}>Try activities for today</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#111" />
                    </TactilePressable>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7fbff',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MobilePalette.softSurface,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -90,
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: MobilePalette.softSurface,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 44,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerKicker: {
    color: '#111',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  headerTitle: {
    color: '#6f6a6a',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#d7e7f3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metaPillStrong: {
    backgroundColor: MobilePalette.primary,
    borderColor: MobilePalette.primary,
  },
  metaPillText: {
    color: '#425466',
    fontSize: 12,
    fontWeight: '700',
  },
  metaPillStrongText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    gap: 12,
  },
  loadingText: {
    color: '#6f6a6a',
    fontSize: 15,
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 24,
    backgroundColor: '#fff1f1',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffd0d0',
    gap: 10,
  },
  errorTitle: {
    color: '#8f1d1d',
    fontSize: 20,
    fontWeight: '900',
  },
  errorText: {
    color: '#8f1d1d',
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  metricsWrap: {
    gap: 12,
  },
  checkInCard: {
    borderRadius: 26,
    backgroundColor: MobilePalette.softSurface,
    borderWidth: 1,
    borderColor: '#bfe9fb',
    padding: 20,
    shadowColor: MobilePalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInTitle: {
    color: '#111',
    fontSize: 22,
    fontWeight: '900',
  },
  checkInBody: {
    gap: 16,
    marginTop: 14,
  },
  checkInBodyWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkInPrompt: {
    flex: 1,
    color: '#475467',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  checkInButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#101828',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  checkInButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  trendSection: {
    gap: 16,
  },
  trendSectionWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trendCard: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#deebf5',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionEyebrow: {
    color: MobilePalette.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#111',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
  },
  trendList: {
    marginTop: 4,
  },
  historyButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccdbea',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  historyButtonText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '800',
  },
  inlineQuickActionsRow: {
    marginTop: 12,
    gap: 12,
  },
  inlineQuickActionButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d2e6f5',
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: MobilePalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inlineQuickActionPrimary: {
    backgroundColor: MobilePalette.softSurface,
  },
  inlineQuickActionSecondary: {
    backgroundColor: MobilePalette.softSurface,
  },
  inlineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  inlineTextWrap: {
    flex: 1,
  },
  inlineQuickActionTitle: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
  inlineQuickActionSubtitle: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
});