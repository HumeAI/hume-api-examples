// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiKey } from '~/lib/env';
import { humeBatchClient } from '~/lib/client';
import { StartJobResponse } from '~/lib/schemas';

type Data = unknown;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
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
    res.status(400).send({});
    return;
  }

  try {
    const response = await humeBatchClient
      .headers({ 'Content-Type': 'application/json', 'x-hume-api-key': apiKey })
      .get(`/jobs/${jobId}/predictions`)
      .json();

    return res.send(response);
  } catch (e) {
    console.log(e);
    res.status(500).send({});
  }
}
