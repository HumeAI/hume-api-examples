import { Emotion } from "./emotion";
import { TimeRange } from "./timeRange";

export type AudioPrediction = {
  emotions: Emotion[];
  time: TimeRange;
};
