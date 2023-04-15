import { z } from 'zod';
import { JobIdResponse } from '~/schemas';

/**
 * @name processTextFile
 * @description Mutation used by react-query that takes a file URL and returns the results of the text processing from the Hume API
 */
export async function processTextFile(fileUrl: string) {
  const jobId = await sendFile(fileUrl);

  if (typeof jobId !== 'string') {
    throw new Error('Failed to get job id');
  }

  const resultsUrl = await pollForResultsUrl(jobId, 10);

  if (typeof resultsUrl !== 'string') {
    throw new Error('Failed to get results');
  }

  const json = await fetchResultsFile(resultsUrl);

  if (json === undefined) {
    throw new Error('Failed to get results');
  }

  return json;
}

/**
 * @name sendFile
 * @description sends the file to the Hume API via a POST request to our Next.js API Route and returns the job id
 */
async function sendFile(fileUrl: string) {
  const request = new Request('/api/send', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      fileUrl,
    }),
  });

  try {
    return await fetch(request)
      .then((res) => res.json())
      .then((json) => json.job_id);
  } catch (e) {
    return undefined;
  }
}

/**
 * @name pollForResultsUrl
 * @description polls the Hume API waiting for status to be 'COMPLETED' and then returns the results URL
 */
async function pollForResultsUrl(jobId: string, maxAttempts: number) {
  let attempts = 0;

  const request = new Request(`/api/results?job_id=${jobId}`, {
    method: 'GET',
  });

  async function retry(id: string) {
    let response: z.infer<typeof JobIdResponse> | undefined = undefined;

    try {
      response = await fetch(request)
        .then((res) => res.json())
        .then((json) => JobIdResponse.parse(json));

      if (response !== undefined && response.status === 'COMPLETED') {
        return response.completed.predictions_url;
      }
    } catch {
      response = undefined;
    }

    if (attempts < maxAttempts) {
      attempts++;
      return new Promise<string | undefined>((resolve) => {
        setTimeout(async () => {
          const v = await retry(id);
          void resolve(v);
        }, 3000);
      });
    }
  }

  return await retry(jobId);
}

async function fetchResultsFile(url: string) {
  try {
    return await fetch(url).then((res) => res.json());
  } catch {
    return undefined;
  }
}
