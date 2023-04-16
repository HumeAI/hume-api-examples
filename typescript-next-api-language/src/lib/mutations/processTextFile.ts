import wretch from 'wretch';
import { z } from 'zod';
import { internalApiClient } from '~/lib/client';
import { JobIdResponse } from '~/lib/schemas';

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
  try {
    return await internalApiClient
      .url('/send')
      .post({ fileUrl })
      .json((json) => z.object({ job_id: z.string() }).parse(json))
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

  async function retry(id: string) {
    let response: z.infer<typeof JobIdResponse> | undefined = undefined;

    try {
      response = await internalApiClient
        .query({ job_id: jobId })
        .get('/results')
        .json(JobIdResponse.parse);

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
    return await wretch(url).get('').json();
  } catch {
    return undefined;
  }
}
