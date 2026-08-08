import { Tabs } from 'expo-router';

import TabBar from '@/components/tab-bar';
import { appTabDefinitions } from '@/constants/app-tabs';

<<<<<<< HEAD:src/app/(tabs)/_layout.tsx
export default function TabLayout() {

=======
export default function AppTabs() {
>>>>>>> origin/main:src/components/app-tabs.tsx
  return (
    <Tabs
      tabBar={(props: any) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {appTabDefinitions.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
<<<<<<< HEAD:src/app/(tabs)/_layout.tsx
}
=======
}
>>>>>>> origin/main:src/components/app-tabs.tsx
