import { AudioPrediction } from "../../../lib/data/audioPrediction";
import { BurstWidgets } from "../../../components/widgets/BurstWidgets";

export default function BurstTimelinePage() {
  function onTimeline(newPredictions: AudioPrediction[]): void {}

  return (
    <div className="px-6 pt-10 pb-20 sm:px-10 md:px-14">
      <div className="pb-3 text-2xl font-medium text-neutral-800">Vocal Burst Timeline</div>
      <div className="flex">
        <BurstWidgets onTimeline={onTimeline} />
      </div>
    </div>
  );
}
