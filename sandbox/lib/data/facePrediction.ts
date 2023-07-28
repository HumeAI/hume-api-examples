import { BoundingBox } from "./boundingBox";
import { Emotion } from "./emotion";

export type FacePrediction = {
  face_id: string;
  bbox: BoundingBox;
  emotions: Emotion[];
};
