import type { ImageSourcePropType } from 'react-native';

export type ProfileIconOption = {
  key: string;
  label: string;
  source: ImageSourcePropType;
};

export const PROFILE_ICON_OPTIONS: ProfileIconOption[] = [
  {
    key: 'expo-logo',
    label: 'Expo',
    source: require('@/assets/images/expo-logo.png'),
  },
  {
    key: 'react-logo',
    label: 'React',
    source: require('@/assets/images/react-logo.png'),
  },
  {
    key: 'logo-glow',
    label: 'Glow',
    source: require('@/assets/images/logo-glow.png'),
  },
  {
    key: 'app-icon',
    label: 'Icon',
    source: require('@/assets/images/icon.png'),
  },
];

export const getProfileIconSource = (key: string): ImageSourcePropType => {
  if (key.startsWith('data:image/') || key.startsWith('http') || key.startsWith('file://')) {
    return { uri: key };
  }
  return PROFILE_ICON_OPTIONS.find((option) => option.key === key)?.source ?? PROFILE_ICON_OPTIONS[0].source;
};