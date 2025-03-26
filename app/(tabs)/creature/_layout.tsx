import { Stack } from 'expo-router';

export default function CreatureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // Enable swipe back gesture
        animation: 'slide_from_right', // Smooth native-style transition
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}