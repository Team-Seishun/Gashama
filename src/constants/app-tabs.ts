export type AppTabName = 'index' | 'post' | 'camera' | 'chat' | 'profile';

export type AppTabDefinition = {
  name: AppTabName;
  title: string;
  iconName: 'map' | 'plus-square' | 'camera' | 'message-circle' | 'user' | 'repeat';
};

export const appTabDefinitions: AppTabDefinition[] = [
  { name: 'index', title: 'Map', iconName: 'map' },
  { name: 'post', title: 'Post', iconName: 'plus-square' },
  { name: 'camera', title: 'Camera', iconName: 'camera' },
  { name: 'chat', title: 'Chat', iconName: 'message-circle' },
  { name: 'profile', title: 'Profile', iconName: 'user' },
];
