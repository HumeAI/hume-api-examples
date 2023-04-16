import { TooltipTrigger } from '@radix-ui/react-tooltip';
import chroma from 'chroma-js';
import { FC, useState } from 'react';
import { z } from 'zod';
import { Tooltip, TooltipContent, TooltipPortal } from './Tooltip';

const scale = chroma.scale('PuBuGn').domain([0, 1]);

const getTextColor = (c: chroma.Color) =>
  c.get('lab.l') < 60 ? chroma('white') : chroma('black');

const ResultsSchema = z.array(
  z.object({
    files: z.array(
      z.object({
        models: z.object({
          language: z.array(
            z.object({
              predictions: z.array(
                z.object({
                  word: z.string(),
                  emotions: z.array(
                    z.object({
                      name: z.string(),
                      score: z.number(),
                    })
                  ),
                  toxicity: z.array(
                    z.object({
                      name: z.string(),
                      score: z.number(),
                    })
                  ),
                })
              ),
            })
          ),
        }),
      })
    ),
  })
);

export const TextRender: FC<{ data: unknown }> = ({ data }) => {
  const [selectedEmotion, setSelectedEmotion] = useState('Joy');

  const parsedData = ResultsSchema.safeParse(data);

  if (!parsedData.success) {
    return (
      <div>
        <div className={'pb-2 px-px'}>Unable to render text</div>
      </div>
    );
  }

  const predictions =
    parsedData.data[0].files[0].models.language[0].predictions;

  const emotionsList = predictions[0].emotions.map((e) => e.name);

  return (
    <div>
      <div className={'pb-2 px-px'}>
        <select
          onChange={(e) => setSelectedEmotion(e.target.value)}
          className={'border'}
        >
          {emotionsList.map((emotion) => (
            <option
              key={emotion}
              value={emotion}
              selected={selectedEmotion === emotion}
            >
              {emotion}
            </option>
          ))}
        </select>
      </div>
      <div className={'flex flex-wrap gap-y-1.5 gap-x-1 px-px'}>
        {predictions.map((entry, index) => {
          const emotionScore =
            entry.emotions.find((e) => e.name === selectedEmotion)?.score ?? 0;

          const topEmotion = entry.emotions.reduce(
            (prev, current) => {
              if (current.score > prev.score) {
                return current;
              }
              return prev;
            },
            {
              score: -Infinity,
              name: '',
            }
          );

          const bgColor = scale(emotionScore);
          const textColor = getTextColor(bgColor);

          return (
            <Tooltip key={entry.word + index} delayDuration={0}>
              <TooltipTrigger asChild>
                <span
                  className={
                    'rounded px-1 py-1 block cursor-default hover:ring-1 hover:ring-slate-900'
                  }
                  style={{
                    backgroundColor: bgColor.hex(),
                    color: textColor.hex(),
                  }}
                >
                  {entry.word}
                </span>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side={'bottom'}>
                  <div className={'max-w-sm divide-y [&_p]:py-1'}>
                    <p>
                      <strong
                        className={'block text-xs font-medium text-slate-500'}
                      >
                        Selected Emotion
                      </strong>
                      {selectedEmotion} ({emotionScore.toFixed(3)})
                    </p>
                    <p>
                      <strong
                        className={'block text-xs font-medium text-slate-500'}
                      >
                        Top Scoring Emotion
                      </strong>{' '}
                      {topEmotion.name} ({topEmotion.score.toFixed(3)})
                    </p>
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
