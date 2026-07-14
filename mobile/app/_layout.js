import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../src/lib/theme';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: theme.bg }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'StackMax · Max' }} />
        <Stack.Screen name="stack" options={{ title: 'StackMax' }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Group' }} />
        <Stack.Screen name="capture/[groupId]" options={{ title: 'Measure', presentation: 'modal' }} />
        <Stack.Screen name="coach/[groupId]" options={{ title: 'Coach' }} />
      </Stack>
    </>
  );
}
