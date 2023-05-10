// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiKey } from '~/lib/env';
import { humeBatchClient } from '~/lib/client';
import { StartJobResponse } from '~/lib/schemas';

type Data = {
  job_id: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (!apiKey) {
    throw new Error('No API key provided');
  }

  if ('fileUrl' in req.body === false) {
    res.status(400).send({ job_id: '' });
    return;
  }

  const fileUrl = req.body.fileUrl;

  const body = {
    models: {
      language: {
        granularity: 'word',
        identify_speakers: false,
        sentiment: {},
        toxicity: {},
      },
    },
    urls: [fileUrl],
    notify: false,
  };

  try {
    const response = await humeBatchClient
      .headers({
        'Content-Type': 'application/json',
        'X-Hume-Api-Key': apiKey,
      })
      .url('/jobs')
      .post(body)
      .json(StartJobResponse.parse);

    return res.send({ job_id: response.job_id });
  } catch (e) {
    console.log(e);
    res.status(500).send({ job_id: '' });
  }
}
