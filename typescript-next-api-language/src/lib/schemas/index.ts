import { z } from 'zod';

export const StartJobResponse = z.object({
  job_id: z.string(),
});

export const JobIdResponse = z.union([
  z.object({
    status: z.literal('COMPLETED'),
    completed: z.object({
      predictions_url: z.string(),
      errors_url: z.string(),
      artifacts_url: z.string(),
      num_predictions: z.number(),
      num_errors: z.number(),
    }),
  }),
  z.object({
    status: z.literal('FAILED'),
  }),
  z.object({
    status: z.literal('QUEUED'),
  }),
  z.object({
    status: z.literal('IN_PROGRESS'),
  }),
]);
