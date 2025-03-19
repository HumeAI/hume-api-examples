import { CharacterRange } from "./characterRange";
import { Emotion } from "./emotion";

export type LanguagePrediction = {
  emotions: Emotion[];
  position: CharacterRange;
  text: string;
};
