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
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!initialized) {
      return;
    }

    if (!session) {
      setHasProfile(false);
      setProfileChecked(true);
      return;
    }

    setProfileChecked(false);

    profileApi
      .getProfileByUserId(session.user.id)
      .then(({ data }) => {
        if (!isActive) {
          return;
        }

        setHasProfile(Boolean(data));
        setProfileChecked(true);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setHasProfile(false);
        setProfileChecked(true);
      });

    return () => {
      isActive = false;
    };
  }, [initialized, session]);

  useEffect(() => {
    if (!initialized) return;
    if (session && !profileChecked) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inProfileSetup = (segments[0] as string) === 'profile-setup';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (session && !hasProfile && !inProfileSetup) {
      router.replace('/profile-setup' as any);
    } else if (session && hasProfile && inProfileSetup) {
      router.replace('/' as any);
    } else if (session && inAuthGroup) {
      router.replace((hasProfile ? '/' : '/profile-setup') as any);
    }
  }, [session, initialized, segments, profileChecked, hasProfile, router]);

  if (!initialized || (session && !profileChecked)) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {!session || !hasProfile ? <Slot /> : <AppTabs />}
    </ThemeProvider>
  );
}
