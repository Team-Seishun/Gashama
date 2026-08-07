import { Tabs } from 'expo-router';

import TabBar from '@/components/tab-bar';
import { appTabDefinitions } from '@/constants/app-tabs';

export default function TabLayout() {

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {appTabDefinitions.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
