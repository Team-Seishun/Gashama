import { Tabs } from 'expo-router';

import TabBar from '@/components/tab-bar';
import { appTabDefinitions } from '@/constants/app-tabs';

export default function AppTabs() {

  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
    >
      {appTabDefinitions.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}

