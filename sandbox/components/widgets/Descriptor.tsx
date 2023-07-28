import { Emotion } from "../../lib/data/emotion";
import { None } from "../../lib/utilities/typeUtilities";
import { getEmotionDescriptor } from "../../lib/utilities/emotionUtilities";
import { useStableEmotions } from "../../lib/hooks/stability";

type DescriptorProps = {
  className?: string;
  emotions: Emotion[];
};

export function Descriptor({ className, emotions }: DescriptorProps) {
  const emotionDistThreshold = 0.1;
  const embeddingDistThreshold = 0.2;
  const stableEmotions = useStableEmotions(emotions, embeddingDistThreshold);

  className = className || "";

  function createDescription(emotions: Emotion[]): string {
    emotions.sort((a, b) => (a.score < b.score ? 1 : -1));
    if (emotions.length < 2) return "";

    const primaryEmotion = emotions[0];
    let secondaryEmotion = emotions[1];
    let secondaryDescriptor = "";
    for (let i = 1; i < emotions.length; i++) {
      const emotion = emotions[i];
      const descriptor = getEmotionDescriptor(emotion.name);
      if (descriptor !== None) {
        secondaryDescriptor = descriptor;
        secondaryEmotion = emotion;
        break;
      }
    }
    if (Math.abs(primaryEmotion.score - secondaryEmotion.score) > emotionDistThreshold) {
      return primaryEmotion.name;
    }
    return `${secondaryDescriptor} ${primaryEmotion.name}`;
  }

  return (
    <div className={`${className} flex`}>
      {emotions.length > 0 && (
        <div className="mb-3 flex rounded-full border border-neutral-200 text-sm shadow">
          <div className="flex justify-center rounded-l-full bg-white py-2 px-3 font-medium text-neutral-800"></div>
          <div className="w-48 bg-neutral-800 px-4 py-2 text-center lowercase text-white">
            <span>{createDescription(stableEmotions)}</span>
          </div>
          <div className="flex justify-center rounded-r-full bg-white py-2 px-3 font-medium text-neutral-800"></div>
        </div>
      )}
    </div>
  );
}
