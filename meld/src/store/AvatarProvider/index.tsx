import { Hume } from 'hume';
import { useVoice } from '@humeai/voice-react';
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

type AvatarContextType = {
  avatars: AvatarConfig[];
  activeAvatar: string | null;
};

type AvatarConfig = {
  name: string;
  prompt?: string;
  visual?: string;
  prosody: Hume.empathicVoice.EmotionScores | undefined;
};

const AvatarContext = createContext<AvatarContextType | null>(null);

export const useAvatars = () => useContext(AvatarContext) as AvatarContextType;

export const AvatarProvider: FC<PropsWithChildren> = ({ children }) => {
  const { lastVoiceMessage } = useVoice();
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<AvatarConfig[]>([
    {
      name: 'Challenger',
      visual: 'bg-green-500',
      prosody: undefined,
    },
    {
      name: 'Optimist',
      visual: 'bg-yellow-500',
      prosody: undefined,
    },
    {
      name: 'Synthesizer',
      visual: 'bg-purple-500',
      prosody: undefined,
    },
  ]);

  useEffect(() => {
    if (!lastVoiceMessage) return;

    const { content } = lastVoiceMessage.message;
    const regex = /^\[([^\]]+)\]:/;
    const match = content?.match(regex);

    if (match) {
      const avatarName = match[1];
      setActiveAvatar(avatarName);
    }

    updateProsody(activeAvatar || '');
  }, [lastVoiceMessage]);

  const updateProsody = (name: string) => {
    avatars.forEach((avatar: AvatarConfig) => {
      if (avatar.name !== name) return;

      const prosody = lastVoiceMessage?.models.prosody?.scores;

      avatar.prosody = Object.entries(
        prosody as Hume.empathicVoice.EmotionScores,
      )
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, value]) => {
          obj[key as keyof typeof obj] = value;
          return obj;
        }, {} as Hume.empathicVoice.EmotionScores);

      setAvatars([...avatars]);
    });
  };

  return (
    <AvatarContext.Provider value={{ avatars, activeAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};
