import { z } from 'zod';

export const StartJobResponse = z.object({
  job_id: z.string(),
});

export const JobStatus = z.enum([
  'COMPLETED',
  'IN_PROGRESS',
  'FAILED',
  'QUEUED',
]);

export const LanguageModelConfig = z.object({
  granularity: z.string(),
  identify_speakers: z.boolean(),
  sentiment: z.object({}).nullable(),
  toxicity: z.object({}).nullable(),
});

export const JobIdResponse = z.object({
  user_id: z.string(),
  job_id: z.string(),
  request: z.object({
    callback_url: z.string().or(z.null()),
    files: z.array(z.string()),
    urls: z.array(z.string()),
    models: z.object({
      language: LanguageModelConfig.optional().nullable(),
    }),
    notify: z.boolean(),
  }),
  state: z.object({
    status: JobStatus,
    created_timestamp_ms: z
      .string()
      .transform((d) => new Date(d))
      .optional(),
    ended_timestamp_ms: z
      .string()
      .transform((d) => new Date(d))
      .optional(),
    started_timestamp_ms: z
      .string()
      .transform((d) => new Date(d))
      .optional(),
    num_errors: z.string().optional(),
    num_predictions: z.string().optional(),
  }),
});
