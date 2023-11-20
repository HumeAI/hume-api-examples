import { useEffect, useState } from "react";

import { AudioPrediction } from "../../lib/data/audioPrediction";
import { TimeRange } from "../../lib/data/timeRange";

type DiscreteTimelineProps = {
  className?: string;
  predictions: AudioPrediction[];
};

export function DiscreteTimeline({ className, predictions }: DiscreteTimelineProps) {
  const [predictionsHistory, setPredictionsHistory] = useState<AudioPrediction[][]>([]);
  const detectionProximityThreshold = 0.6;

  className = className || "";

  useEffect(() => {
    setPredictionsHistory((old) => [...old, predictions]);
  }, [predictions]);

  function flattenDetections(history: AudioPrediction[][]): AudioPrediction[] {
    const results: AudioPrediction[] = [];
    history.forEach((predictions) => {
      predictions.forEach((detection) => {
        if (results.length == 0) {
          results.push(detection);
        } else {
          const lastDetection = results[results.length - 1];
          updateWithTimeout(lastDetection, detection);
          if (shouldMerge(lastDetection, detection)) {
            results[results.length - 1] = mergeDetections(results[results.length - 1], detection);
          } else {
            results.push(detection);
          }
        }
      });
    });
    results.reverse();
    return results;
  }

  function mergeDetections(detectionA: AudioPrediction, detectionB: AudioPrediction): AudioPrediction {
    const rangeA = detectionA.time;
    const rangeB = detectionB.time;
    const shouldReplaceEmotions = rangeSize(rangeB) < rangeSize(rangeA);

    return {
      time: mergeRanges(detectionA.time, detectionB.time),
      emotions: shouldReplaceEmotions ? detectionB.emotions : detectionA.emotions,
    };
  }

  function mergeRanges(rangeA: TimeRange, rangeB: TimeRange): TimeRange {
    return {
      begin: rangeA.begin,
      end: rangeB.end,
    };
  }

  function updateWithTimeout(detectionA: AudioPrediction, detectionB: AudioPrediction): void {
    const timeoutTime = 60;
    const rangeA = detectionA.time;
    const rangeB = detectionB.time;
    if (rangeB.begin < rangeA.begin) {
      rangeB.begin += timeoutTime;
      rangeB.end += timeoutTime;
    }
  }

  function shouldMerge(detectionA: AudioPrediction, detectionB: AudioPrediction): boolean {
    const rangeA = detectionA.time;
    const rangeB = detectionB.time;
    return rangesOverlap(rangeA, rangeB) || rangesClose(rangeA, rangeB);
  }

  function rangeSize(range: TimeRange): number {
    return range.end - range.begin;
  }

  function rangesClose(rangeA: TimeRange, rangeB: TimeRange): boolean {
    return rangeB.begin < rangeA.end + detectionProximityThreshold;
  }

  function rangesOverlap(rangeA: TimeRange, rangeB: TimeRange): boolean {
    return rangeB.begin < rangeA.end;
  }

  return (
    <div className={`${className}`}>
      {flattenDetections(predictionsHistory).map((detection, i) => (
        <div key={i}>
          <Detection detection={detection} />
        </div>
      ))}
    </div>
  );
}

type DetectionProps = {
  className?: string;
  detection: AudioPrediction;
};

export function Detection({ className, detection }: DetectionProps) {
  const sorted = detection.emotions.sort((a, b) => (a.score < b.score ? 1 : -1));
  const topEmotion = sorted[0];

  let time = (detection.time.end - detection.time.begin).toFixed(1);
  if (detection.time.end < detection.time.begin) {
    const timeoutTime = 60;
    time = (detection.time.end + timeoutTime - detection.time.begin).toFixed(1);
  }

  className = className || "";

  return (
    <div className="mb-3 flex rounded-full border border-neutral-200 text-sm shadow">
      <div className="flex w-4 justify-center rounded-l-full bg-white py-2 pl-2 pr-2 font-medium text-neutral-800">
        <span></span>
      </div>
      <div className="w-48 bg-neutral-800 px-4 py-2 lowercase text-white">
        <span>{topEmotion.name}</span>
      </div>
      <div className="flex w-32 justify-center rounded-r-full bg-white py-2 pr-2 pl-2 font-medium text-neutral-800">
        <span>{time}s</span>
      </div>
    </div>
  );
}
