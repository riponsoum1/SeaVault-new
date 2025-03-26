import 'expo-router/entry';

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('/Users/tariqbakkali/Documents/SeaVault/seavaultapp/app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App); 