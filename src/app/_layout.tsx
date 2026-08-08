import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileApi } from '@/features/profile/api/api';
import { ProfileContext } from '@/features/profile/contexts/ProfileContext';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, initialized } = useAuth();
  
  
  const [profileState, setProfileState] = useState({ checked: false, hasProfile: false, sessionId: null as string | null });

  useEffect(() => {
    let isActive = true;

    if (!initialized) {
      return;
    }

    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        __DEV__ && console.log('[Layout] Profile API returned:', data);
        setProfileState({
          checked: true,
          hasProfile: Boolean(data && data.nickname && data.nickname !== '新規ユーザー'),
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
  }, [initialized, session, profileState.checked, profileState.sessionId]);
/*
  useEffect(() => {
    if (!initialized) return;
    if (session && (!profileState.checked || profileState.sessionId !== session?.user.id)) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inProfileSetup = (segments[0] as string) === 'profile-setup';

    __DEV__ && console.log('[Layout] Nav Check:', { 
      sessionExists: !!session, 
      hasProfile: profileState.hasProfile, 
      inAuthGroup, 
      inProfileSetup, 
      segments 
    });

    // Need a small timeout to let navigation state settle before replacing on iOS
    const timeoutId = setTimeout(() => {
      if (!session && !inAuthGroup) {
        __DEV__ && console.log('[Layout] Routing to /(auth)/login');
        router.replace('/(auth)/login' as any);
      } else if (session && !profileState.hasProfile && !inProfileSetup) {
        __DEV__ && console.log('[Layout] Routing to /profile-setup');
        router.replace('/profile-setup' as any);
      } else if (session && profileState.hasProfile && inProfileSetup) {
        __DEV__ && console.log('[Layout] Routing to /(tabs)');
        router.replace('/(tabs)' as any);
      } else if (session && inAuthGroup) {
        __DEV__ && console.log('[Layout] Routing from auth. hasProfile?', profileState.hasProfile);
        router.replace((profileState.hasProfile ? '/(tabs)' : '/profile-setup') as any);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [session, initialized, segments, profileState, router]);
*/
  const isReady = initialized && (!session || profileState.checked);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ProfileContext.Provider value={{
            hasProfile: profileState.hasProfile,
            setHasProfile: (hasProfile) => setProfileState(prev => ({ ...prev, hasProfile }))
          }}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }} />
          </ProfileContext.Provider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
