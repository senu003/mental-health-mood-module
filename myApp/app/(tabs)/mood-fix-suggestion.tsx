import { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CURRENT_USER_ID } from '@/config/api';
import { moodFixActivities, type MoodFixActivity, type MoodValue } from '@/constants/mood-fix-activities';
import { MobilePalette } from '@/constants/theme';
import { fetchMoodFixActivities, fetchMoodHistory } from '@/services/mood-api';

const moods: MoodValue[] = ['terrible', 'sad', 'okay', 'good', 'great'];

const normalizeMood = (value: unknown): MoodValue => {
  const raw = String(value || '').toLowerCase().trim();
  if (moods.includes(raw as MoodValue)) {
    return raw as MoodValue;
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    if (asNumber <= 1) return 'terrible';
    if (asNumber <= 2) return 'sad';
    if (asNumber <= 3) return 'okay';
    if (asNumber <= 4) return 'good';
    return 'great';
  }

  return 'okay';
};

const toTitle = (value: MoodValue) => value.charAt(0).toUpperCase() + value.slice(1);

const toLocalActivity = (item: {
  _id?: string;
  activityId?: string;
  id?: string;
  title?: string;
  duration?: string;
  difficulty?: string;
  focusTag?: string;
  benefit?: string;
  description?: string;
  moods?: string[];
  steps?: string[];
}): MoodFixActivity => ({
  id: item.activityId || item.id || item._id || 'unknown-activity',
  title: item.title || 'Untitled activity',
  duration: item.duration || '',
  difficulty: item.difficulty || '',
  focusTag: item.focusTag || '',
  benefit: item.benefit || '',
  description: item.description || '',
  moods: (Array.isArray(item.moods) ? item.moods : []).filter((m): m is MoodValue => moods.includes(m as MoodValue)),
  steps: Array.isArray(item.steps) ? item.steps : [],
});

const iconByTag = (tag: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const key = tag.toLowerCase();
  if (key.includes('anx')) return 'weather-windy';
  if (key.includes('stress')) return 'lightning-bolt-outline';
  if (key.includes('sad')) return 'heart-outline';
  if (key.includes('happy')) return 'star-outline';
  if (key.includes('calm')) return 'meditation';
  return 'heart-pulse';
};

export default function MoodFixSuggestionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestMood, setLatestMood] = useState<MoodValue>('okay');
  const [activities, setActivities] = useState<MoodFixActivity[]>(moodFixActivities);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!CURRENT_USER_ID) {
        if (mounted) {
          setError('User is not configured. Please set EXPO_PUBLIC_USER_ID.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [history, activityCatalog] = await Promise.all([
          fetchMoodHistory(CURRENT_USER_ID),
          fetchMoodFixActivities(),
        ]);

        if (!mounted) {
          return;
        }

        const latest = Array.isArray(history) && history.length ? history[0] : null;
        setLatestMood(normalizeMood(latest?.mood));

        if (Array.isArray(activityCatalog) && activityCatalog.length) {
          setActivities(activityCatalog.map(toLocalActivity));
        } else {
          setActivities(moodFixActivities);
        }
      } catch {
        if (mounted) {
          setActivities(moodFixActivities);
          setError('Could not load latest mood or activity catalog. Showing default suggestions.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredActivities = useMemo(
    () => activities.filter((item) => item.moods.includes(latestMood)),
    [activities, latestMood],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push('/(tabs)/dashboard')} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={MobilePalette.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Mood Fix Suggestions</Text>
            <Text style={styles.headerSubtitle}>Activities based on your latest mood only</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Personalized for Your Mood: {toTitle(latestMood)}</Text>
          <Text style={styles.summaryText}>
            These activities are selected from the same mood-fix catalog used in the web app.
          </Text>
          {loading ? <Text style={styles.summaryHint}>Checking your latest mood...</Text> : null}
          {error ? <Text style={styles.summaryError}>{error}</Text> : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={MobilePalette.primary} />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : (
          <View style={styles.suggestionList}>
            {filteredActivities.map((activity) => (
              <View key={activity.id} style={styles.suggestionCard}>
                <View style={styles.suggestionIconWrap}>
                  <MaterialCommunityIcons
                    name={iconByTag(activity.focusTag)}
                    size={20}
                    color={MobilePalette.primary}
                  />
                </View>
                <View style={styles.suggestionCopy}>
                  <View style={styles.suggestionHeaderRow}>
                    <Text style={styles.suggestionTitle}>{activity.title}</Text>
                    <Text style={styles.suggestionDuration}>{activity.duration || 'Quick'}</Text>
                  </View>
                  <Text style={styles.suggestionDetail}>{activity.description}</Text>
                  <Pressable
                    style={styles.doButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/mood-fix-activity',
                        params: {
                          activityId: activity.id,
                          mood: latestMood,
                        },
                      })
                    }
                  >
                    <Text style={styles.doButtonText}>Do</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}

            {!filteredActivities.length ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No activities available for this mood right now.</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/checkin-step-one')}>
            <Text style={styles.primaryButtonText}>New check-in</Text>
          </Pressable>
        </View>
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
    paddingTop: 10,
    paddingBottom: 30,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 36,
    height: 36,
  },
  headerCopy: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#1b1b1b',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  headerSubtitle: {
    color: '#636363',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d5e8ff',
    backgroundColor: '#eef6ff',
    padding: 14,
  },
  summaryTitle: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryText: {
    color: '#475569',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  summaryHint: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryError: {
    marginTop: 6,
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionList: {
    gap: 10,
  },
  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#edf7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCopy: {
    flex: 1,
    gap: 6,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  suggestionTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  suggestionDuration: {
    color: MobilePalette.primary,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eef6ff',
    overflow: 'hidden',
  },
  suggestionDetail: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  doButton: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 14,
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtons: {
    marginTop: 8,
    gap: 10,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2d2d2',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: '#111',
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
