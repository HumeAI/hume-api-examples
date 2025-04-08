import { None, Optional } from "../../lib/utilities/typeUtilities";

import { AudioPrediction } from "../../lib/data/audioPrediction";
import { AudioWidgets } from "./AudioWidgets";

type BurstWidgetsProps = {
  onTimeline: Optional<(predictions: AudioPrediction[]) => void>;
};

export function BurstWidgets({ onTimeline }: BurstWidgetsProps) {
  return (
    <div>
      <AudioWidgets modelName="burst" recordingLengthMs={500} streamWindowLengthMs={2000} onTimeline={onTimeline} />
    </div>
  );
}

BurstWidgets.defaultProps = {
  onTimeline: None,
};
