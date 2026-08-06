import { createContext, useContext } from 'react';

type ProfileContextType = {
  hasProfile: boolean;
  setHasProfile: (hasProfile: boolean) => void;
};

export const ProfileContext = createContext<ProfileContextType>({
  hasProfile: false,
  setHasProfile: () => {},
});

export const useProfileContext = () => useContext(ProfileContext);
