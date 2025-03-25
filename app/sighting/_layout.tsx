import { Stack } from 'expo-router';

export default function SightingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}