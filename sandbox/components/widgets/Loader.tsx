import { Emotion, EmotionName } from "../../lib/data/emotion";

import { scaleEmotionsToRanges } from "../../lib/utilities/scalingUtilities";

type LoaderProps = {
  className?: string;
  emotions: Emotion[];
  emotionName: EmotionName;
  numLevels: number;
};

export function Loader({ className, emotions, emotionName, numLevels }: LoaderProps) {
  className = className || "";

  if (emotions.length === 0) {
    return <></>;
  }

  function getLevel(scaledEmotions: Emotion[]): number {
    // Level ranges from 0 to numLevels *inclusive*
    const emotion = scaledEmotions.find((e) => e.name === emotionName);
    if (!emotion) {
      console.error(`Could not find emotion ${emotionName}`);
      return 0;
    }

    const score = emotion.score;
    for (let i = numLevels; i >= 0; i--) {
      const threshold = i / (numLevels + 1);
      if (score > threshold) {
        return i;
      }
    }

    return 0;
  }

  function getIndicators(level: number) {
    const indicators = new Array(numLevels).fill(false);
    for (let i = 0; i < numLevels; i++) {
      if (i < level) {
        indicators[i] = true;
      }
    }
    return indicators;
  }

  const scaledEmotions = scaleEmotionsToRanges(emotions);
  const level = getLevel(scaledEmotions);
  const indicators = getIndicators(level);
  const emotionDisplayName = emotionName.includes("Surprise") ? "Surprise" : emotionName;

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex">
        {indicators.map((indicator, i) => {
          const color = indicator ? "bg-neutral-800" : "bg-neutral-400";
          return (
            <div
              key={i}
              className={`mr-1 resize-none rounded border border-neutral-300 pl-5 pt-5 text-sm text-white shadow ${color}`}
            ></div>
          );
        })}
      </div>
      <div className="ml-2 font-medium lowercase">{emotionDisplayName}</div>
    </div>
  );
}

Loader.defaultProps = {
  numLevels: 5,
};
