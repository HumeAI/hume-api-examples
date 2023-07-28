import { Emotion, EmotionName } from "../data/emotion";

import { CANONICAL_EMOTION_NAMES } from "./emotionUtilities";
import { Embedding } from "../data/embedding";

export function emotionsToEmbedding(emotions: Emotion[]): Embedding {
  const scoreMap = emotionsToScoreMap(emotions);
  const embedding: Embedding = [];
  for (let i = 0; i < CANONICAL_EMOTION_NAMES.length; i++) {
    const emotionName = CANONICAL_EMOTION_NAMES[i];
    const score = scoreMap.get(emotionName);
    if (score === undefined) {
      console.error(`Could not find emotion ${emotionName} in embedding`);
      break;
    }
    embedding.push(score);
  }
  return embedding;
}

export function emotionDist(emotionsA: Emotion[], emotionsB: Emotion[]): number {
  return embeddingDist(emotionsToEmbedding(emotionsA), emotionsToEmbedding(emotionsB));
}

function emotionsToScoreMap(emotions: Emotion[]): Map<EmotionName, number> {
  const m = new Map<EmotionName, number>();
  for (let i = 0; i < emotions.length; i++) {
    const emotion = emotions[i];
    m.set(emotion.name, emotion.score);
  }
  return m;
}

function embeddingDist(embeddingA: Embedding, embeddingB: Embedding): number {
  // Not really the distance, actually sum of squared errors
  let s = 0;
  for (let i = 0; i < embeddingA.length; i++) {
    const a = embeddingA[i];
    const b = embeddingB[i];
    s += (b - a) * (b - a);
  }
  return s;
}
