import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mood Fix',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-pulse" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-text" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="checkin-step-one"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="checkin-step-two"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="checkin-summary"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood-fix-suggestion"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood-fix-activity"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
