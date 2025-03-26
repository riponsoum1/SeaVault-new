import { Tabs } from 'expo-router';
import { Home, Search, Plus, List, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ size, color }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ size, color }) => <Search size={size} color={color} />, href: null }} />
      <Tabs.Screen name="add" options={{ title: 'Add', tabBarIcon: ({ size, color }) => <Plus size={size} color={color} />, href: null }} />
      <Tabs.Screen name="creatures" options={{ title: 'Collection', tabBarIcon: ({ size, color }) => <List size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ size, color }) => <User size={size} color={color} /> }} />
      <Tabs.Screen name="creature" options={{ href: null }} />
    </Tabs>
  );
}