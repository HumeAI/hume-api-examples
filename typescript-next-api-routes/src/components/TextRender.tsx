import { TooltipTrigger } from '@radix-ui/react-tooltip';
import { FC, useState } from 'react';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { Tooltip, TooltipContent, TooltipPortal } from './Tooltip';

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
    return null;
  }

  const predictions =
    parsedData.data[0].files[0].models.language[0].predictions;

  const emotionsList = predictions[0].emotions.map((e) => e.name);

  return (
    <div>
      <div className={'pb-2'}>
        <select
          onChange={(e) => setSelectedEmotion(e.target.value)}
          className={'border'}
        >
          {emotionsList.map((emotion) => (
            <option key={emotion} value={emotion}>
              {emotion}
            </option>
          ))}
        </select>
      </div>
      <div className={'flex flex-wrap gap-y-1.5 gap-x-1'}>
        {predictions.map((entry, index) => {
          const Emotion =
            entry.emotions.find((e) => e.name === selectedEmotion)?.score ?? 0;

          const classNames = [
            'rounded px-1 py-1 block cursor-default hover:ring-1 hover:ring-slate-900 rounded',
            match(Emotion)
              .when(
                (n) => n > 0.07,
                () => 'bg-green-700 text-green-200'
              )
              .when(
                (n) => n > 0.06,
                () => 'bg-green-600 text-green-200'
              )
              .when(
                (n) => n > 0.05,
                () => 'bg-green-500 text-green-800'
              )
              .when(
                (n) => n > 0.04,
                () => 'bg-green-400 text-green-800'
              )
              .when(
                (n) => n > 0.03,
                () => 'bg-green-300 text-green-600'
              )
              .when(
                (n) => n > 0.02,
                () => 'bg-green-200 text-green-600'
              )
              .when(
                (n) => n > 0.01,
                () => 'bg-green-100 text-green-600'
              )
              .otherwise(() => ''),
          ]
            .filter(Boolean)
            .join(' ');

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

          return (
            <Tooltip key={entry.word + index} delayDuration={0}>
              <TooltipTrigger asChild>
                <span className={classNames}>{entry.word}</span>
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
                      {selectedEmotion} ({Emotion.toFixed(3)})
                    </p>
                    <p>
                      <strong
                        className={'block text-xs font-medium text-slate-500'}
                      >
                        Top Score
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
