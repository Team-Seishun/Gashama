import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileApi } from '@/features/profile/api/api';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [profileState, setProfileState] = useState({ checked: false, hasProfile: false, sessionId: null as string | null });

  useEffect(() => {
    let isActive = true;

    if (!initialized) {
      return;
    }

    if (!session) {
      setProfileState({ checked: true, hasProfile: false, sessionId: null });
      return;
    }

    // Only fetch if we haven't checked for this specific session yet
    if (profileState.sessionId === session.user.id && profileState.checked) {
      return;
    }

    setProfileState(prev => ({ ...prev, checked: false, sessionId: session.user.id }));

    profileApi
      .getProfileByUserId(session.user.id)
      .then(({ data }) => {
        if (!isActive) return;
        setProfileState({
          checked: true,
          hasProfile: Boolean(data && data.nickname),
          sessionId: session.user.id,
        });
      })
      .catch(() => {
        if (!isActive) return;
        setProfileState({
          checked: true,
          hasProfile: false,
          sessionId: session.user.id,
        });
      });

    return () => {
      isActive = false;
    };
  }, [initialized, session]);

  useEffect(() => {
    if (!initialized) return;
    if (session && (!profileState.checked || profileState.sessionId !== session?.user.id)) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inProfileSetup = (segments[0] as string) === 'profile-setup';

    // Need a small timeout to let navigation state settle before replacing on iOS
    const timeoutId = setTimeout(() => {
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      } else if (session && !profileState.hasProfile && !inProfileSetup) {
        router.replace('/profile-setup' as any);
      } else if (session && profileState.hasProfile && inProfileSetup) {
        router.replace('/' as any);
      } else if (session && inAuthGroup) {
        router.replace((profileState.hasProfile ? '/' : '/profile-setup') as any);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [session, initialized, segments, profileState, router]);

  if (!initialized || (session && !profileState.checked)) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {!session || !profileState.hasProfile ? <Slot /> : <AppTabs />}
    </ThemeProvider>
  );
}
