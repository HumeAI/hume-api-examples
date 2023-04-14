// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { apiKey } from '~/env';
import { JobIdResponse, StartJobResponse } from '~/schemas';

type Data = {
  predictions_url: string;
};

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

  const humeJobUrl = new URL(`https://api.hume.ai/v0/batch/jobs/${jobId}`);

  humeJobUrl.searchParams.append('apiKey', apiKey);

  const humeJobRequest = new Request(humeJobUrl, {
    method: 'GET',
    headers: new Headers({
      'Accept-Encoding': 'gzip,deflate',
    }),
  });

  const response = await fetch(humeJobRequest)
    .then((res) => res.json())
    .then((json) => {
      return JobIdResponse.safeParse(json);
    });

  if (response.success) {
    return res.send(response.data);
  }

  res.status(400).send('');
}
