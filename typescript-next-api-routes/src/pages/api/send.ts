// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiKey } from '~/env';
import { StartJobResponse } from '~/schemas';

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

  const humeBatchUrl = new URL('https://api.hume.ai/v0/batch/jobs');

  humeBatchUrl.searchParams.append('apiKey', apiKey);

  const body = JSON.stringify({
    models: {
      language: {
        identify_speakers: false,
        sentiment: {},
        toxicity: {},
        language: 'en',
        granularity: 'word',
        use_existing_partition: true,
      },
    },
    urls: [fileUrl],
    notify: false,
  });

  const humeBatchRequest = new Request(humeBatchUrl, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip,deflate',
    }),
    body,
  });

  const response = await fetch(humeBatchRequest)
    .then((res) => res.json())
    .then((json) => {
      return StartJobResponse.parse(json);
    });

  return res.send({ job_id: response.job_id });
}
