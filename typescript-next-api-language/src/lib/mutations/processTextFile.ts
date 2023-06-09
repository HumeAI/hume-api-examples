import wretch from 'wretch';
import { z } from 'zod';
import { humeBatchClient, internalApiClient } from '~/lib/client';
import { JobIdResponse } from '~/lib/schemas';

/**
 * @name processTextFile
 * @description Mutation used by react-query that takes a file URL and returns the results of the text processing from the Hume API
 */
export const processTextFile =
  (onStatusChange: (status: string) => void) => async (fileUrl: string) => {
    const jobId = await sendFile(fileUrl);

    onStatusChange('Uploading File');

    if (typeof jobId !== 'string') {
      throw new Error('Failed to get job id');
    }

    onStatusChange('Waiting for results');

    const resultsStatus = await pollForResultsUrl(jobId, 10);

    if (resultsStatus !== 'DONE') {
      throw new Error('Results timed out');
    }

    onStatusChange('Downloading results');

    const json = await fetchResultsFile(jobId);

    if (json === undefined) {
      console.log(json);
      throw new Error('Failed to get results');
    }

    onStatusChange('Ready');

    return json;
  };

/**
 * @name sendFile
 * @description sends the file to the Hume API via a POST request to our Next.js API Route and returns the job id
 */
async function sendFile(fileUrl: string) {
  const responseShape = z.object({ job_id: z.string() });

  try {
    return await internalApiClient
      .url('/send')
      .post({ fileUrl })
      .json(responseShape.parse)
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

      if (response !== undefined && response.state.status === 'COMPLETED') {
        return 'DONE';
      }
    } catch (e) {
      console.log(e);
      console.log(response);
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

async function fetchResultsFile(jobId: string) {
  try {
    return await internalApiClient
      .query({ job_id: jobId })
      .get('/predictions')
      .json();
  } catch (e) {
    console.log(e);
    return undefined;
  }
}
