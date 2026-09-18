import { Tabs } from 'expo-router';
import { Icon, colors, typography } from '../../src/design';
import type { IconName } from '../../src/design';
import type { ColorValue } from 'react-native';

/**
 * Tab icon using the NigraanOS design system Icon component.
 */
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return (
    <Icon
      name={name}
      size={22}
      color={color as string}
      style={{ opacity: focused ? 1 : 0.55 }}
    />
  );
}

/**
 * Bottom tab navigation layout.
 *
 * Defines the primary tabs of the NigraanOS citizen app:
 * Home, Map, Report, Alerts, Activity, and Profile.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colors.borderLight,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          ...typography.styles.caption,
          fontSize: 11,
          marginTop: -2,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          ...typography.styles.subheading,
          color: colors.primary,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'NigraanOS',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerTitle: 'Civic Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          headerTitle: 'Report an Issue',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="edit" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          headerTitle: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bell" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          headerTitle: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="activity" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
      {/* Hidden from tab bar — accessed via home screen entry */}
      <Tabs.Screen
        name="assistant"
        options={{
          headerTitle: 'Civic Assistant',
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
