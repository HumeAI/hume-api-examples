declare module 'lucide-react' {
  import type { FC } from 'react';

  export interface IconProps
  {
    size?: number;
    color?: string;
  }

  export const Mic: FC<IconProps>;
  export const MicOff: FC<IconProps>;
}


