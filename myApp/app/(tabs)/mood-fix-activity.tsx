import { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moodFixActivities, type MoodFixActivity, type MoodValue } from '@/constants/mood-fix-activities';
import { MobilePalette } from '@/constants/theme';
import { fetchMoodFixActivities } from '@/services/mood-api';

const toTitle = (value: string) => {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Okay';
};

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
  moods: Array.isArray(item.moods) ? (item.moods as MoodValue[]) : [],
  steps: Array.isArray(item.steps) ? item.steps : [],
});

export default function MoodFixActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const activityId = typeof params.activityId === 'string' ? params.activityId : '';
  const mood = typeof params.mood === 'string' ? params.mood : 'okay';

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<MoodFixActivity[]>(moodFixActivities);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const catalog = await fetchMoodFixActivities();
        if (mounted && Array.isArray(catalog) && catalog.length) {
          setActivities(catalog.map(toLocalActivity));
        }
      } catch {
        if (mounted) {
          setActivities(moodFixActivities);
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

  const activity = useMemo(() => activities.find((item) => item.id === activityId) || null, [activities, activityId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push('/(tabs)/mood-fix-suggestion')} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={MobilePalette.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSubtitle}>Essential details only</Text>
          </View>
          <View style={styles.iconSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={MobilePalette.primary} />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </View>
        ) : !activity ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Activity not found</Text>
            <Text style={styles.emptyText}>Please go back and choose another activity.</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{activity.title}</Text>
              <Text style={styles.heroMeta}>Mood: {toTitle(mood)} • Duration: {activity.duration || 'Quick'}</Text>
              <Text style={styles.heroDescription}>{activity.description}</Text>
            </View>

            <View style={styles.stepsCard}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {activity.steps.map((step, index) => (
                <View key={`${activity.id}-${index}`} style={styles.stepRow}>
                  <View style={styles.stepIndexWrap}>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {activity.benefit ? (
              <View style={styles.benefitCard}>
                <Text style={styles.benefitLabel}>Benefit</Text>
                <Text style={styles.benefitText}>{activity.benefit}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.footerButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/mood-fix-suggestion')}>
            <Text style={styles.secondaryButtonText}>Back to suggestions</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.primaryButtonText}>Dashboard</Text>
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
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d5e8ff',
    backgroundColor: '#eef6ff',
    padding: 14,
    gap: 6,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  heroMeta: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  heroDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  stepsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepIndexWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#edf7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepIndex: {
    color: MobilePalette.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  benefitCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7f0d8',
    backgroundColor: '#ebfbf1',
    padding: 12,
    gap: 4,
  },
  benefitLabel: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
  },
  benefitText: {
    color: '#14532d',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
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
