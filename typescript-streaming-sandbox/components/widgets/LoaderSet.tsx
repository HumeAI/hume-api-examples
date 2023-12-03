import { Emotion, EmotionName } from "../../lib/data/emotion";

import { Loader } from "./Loader";

type LoaderProps = {
  className?: string;
  emotions: Emotion[];
  emotionNames: EmotionName[];
  numLevels: number;
};

export function LoaderSet({ className, emotions, emotionNames, numLevels }: LoaderProps) {
  className = className || "";

  return (
    <div className={`${className}`}>
      {emotionNames.map((emotionName, i) => (
        <Loader key={i} emotions={emotions} emotionName={emotionName} numLevels={numLevels} />
      ))}
    </div>
  );
}

LoaderSet.defaultProps = {
  numLevels: 5,
};
