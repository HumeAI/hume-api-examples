import { Button } from "../../../components/inputs/Button";
import { Emotion } from "../../../lib/data/emotion";
import { FaceWidgets } from "../../../components/widgets/FaceWidgets";
import { TextArea } from "../../../components/inputs/TextArea";
import { useState } from "react";

export default function FaceCalibratePage() {
  const [minEmotions, setMinEmotions] = useState<Emotion[]>([]);
  const [maxEmotions, setMaxEmotions] = useState<Emotion[]>([]);

  function extMap(oldMins: Emotion[], newEmotions: Emotion[], compare: (a: number, b: number) => boolean): Emotion[] {
    if (oldMins.length == 0) return newEmotions;
    const newMinEmotions: Emotion[] = [];
    for (let i = 0; i < newEmotions.length; i++) {
      const newEmotion = newEmotions[i];
      for (let j = 0; j < newEmotions.length; j++) {
        const oldMin = oldMins[j];
        if (oldMin.name == newEmotion.name) {
          newMinEmotions.push(compare(newEmotion.score, oldMin.score) ? newEmotion : oldMin);
        }
      }
    }
    return newMinEmotions;
  }

  function onCalibrate(newEmotions: Emotion[]): void {
    if (newEmotions.length == 0) {
      return;
    }

    setMinEmotions((m) => extMap(m, newEmotions, (a, b) => a < b));
    setMaxEmotions((m) => extMap(m, newEmotions, (a, b) => a > b));
  }

  const sortedMins = minEmotions.sort((a, b) => (a.name > b.name ? 1 : -1));
  const minNames = sortedMins.map((e) => `${e.name}`).join("\n");
  const minScores = sortedMins.map((e) => `${e.score.toFixed(3)}`).join("\n");
  const sortedMaxs = maxEmotions.sort((a, b) => (a.name > b.name ? 1 : -1));
  const maxNames = sortedMaxs.map((e) => `${e.name}`).join("\n");
  const maxScores = sortedMaxs.map((e) => `${e.score.toFixed(3)}`).join("\n");

  return (
    <div className="px-6 pt-10 pb-20 sm:px-10 md:px-14">
      <div className="pb-6 text-2xl font-medium text-neutral-800">Face Calibration</div>
      <div className="flex">
        <FaceWidgets onCalibrate={onCalibrate} />

        <div className="ml-10 flex">
          <div>
            <div className="mb-2 flex items-center justify-center">
              <div className="mr-3 font-medium">Minimum</div>
              <Button className="py-1 text-xs" onClick={() => navigator.clipboard.writeText(minScores)} text="Copy" />
            </div>
            <div className="flex">
              <TextArea className="h-[460px] w-[220px] text-xs" text={minNames} readOnly={true} />
              <TextArea className="h-[460px] w-[100px] text-xs" text={minScores} readOnly={true} />
            </div>
          </div>
          <div className="ml-5">
            <div className="mb-2 flex items-center justify-center">
              <div className="mr-3 font-medium">Maximum</div>
              <Button className="py-1 text-xs" onClick={() => navigator.clipboard.writeText(maxScores)} text="Copy" />
            </div>
            <div className="flex">
              <TextArea className="h-[460px] w-[220px] text-xs" text={maxNames} readOnly={true} />
              <TextArea className="h-[460px] w-[100px] text-xs" text={maxScores} readOnly={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
