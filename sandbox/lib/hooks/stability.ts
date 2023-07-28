import { useEffect, useState } from "react";

import { Emotion } from "../data/emotion";
import { emotionDist } from "../utilities/embeddingUtilities";

export function useStableEmotions(emotions: Emotion[], embeddingDistThreshold: number) {
  const [stableEmotions, setStableEmotions] = useState<Emotion[]>([]);

  useEffect(() => {
    if (emotions.length === 0) return;

    if (stableEmotions.length === 0) {
      setStableEmotions(emotions);
    } else {
      const dist = emotionDist(emotions, stableEmotions);
      if (dist > embeddingDistThreshold) {
        setStableEmotions(emotions);
      }
    }
  }, [emotions]);

  return stableEmotions;
}
