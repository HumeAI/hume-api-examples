// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { apiKey } from '~/lib/env';
import { humeBatchClient } from '~/lib/client';
import { JobIdResponse } from '~/lib/schemas';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<z.infer<typeof JobIdResponse> | ''>
) {
  if (!apiKey) {
    throw new Error('No API key provided');
  }

  if ('job_id' in req.query === false) {
    res.status(400).send('');
    return;
  }

  const jobId =
    typeof req.query['job_id'] === 'string' ? req.query['job_id'] : null;

  if (jobId === null) {
    res.status(400).send('');
    return;
  }

  const response = await humeBatchClient
    .query({ apiKey })
    .get(`/jobs/${jobId}`)
    .json(JobIdResponse.safeParse);

  if (response.success) {
    return res.send(response.data);
  }

  res.status(400).send('');
}
