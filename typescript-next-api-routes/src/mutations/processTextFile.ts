import { z } from 'zod';
import { JobIdResponse } from '~/schemas';

export const processTextFile = async (fileUrl: string) => {
  let jobId: string | undefined = undefined;

  try {
    jobId = await fetch(
      new Request('/api/send', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          fileUrl,
        }),
      })
    )
      .then((res) => res.json())
      .then((json) => json.job_id);
  } catch (e) {
    const reason =
      e instanceof Error
        ? e.message
        : 'Failed to send language analysis request';
    throw new Error(reason);
  }

  if (typeof jobId !== 'string') {
    throw new Error('Failed to get job id');
  }

  let maxAttempts = 10;
  let attempts = 0;

  async function retry(id: string) {
    console.log(`Attempt ${attempts}...`);
    let response: z.infer<typeof JobIdResponse> | undefined = undefined;

    try {
      response = await fetch(new Request(`/api/results?job_id=${jobId}`))
        .then((res) => res.json())
        .then((json) => JobIdResponse.parse(json));
    } catch (e) {}

    if (response?.status === 'COMPLETED') {
      return response.completed.predictions_url;
    }

    if (attempts < maxAttempts) {
      attempts++;
      return new Promise<string | undefined>((resolve) => {
        setTimeout(async () => {
          const v = await retry(id);
          void resolve(v);
        }, 3000);
      });
    } else {
      return undefined;
    }
  }

  const results = await retry(jobId);

  if (typeof results !== 'string') {
    throw new Error('Failed to get results');
  }

  try {
    return await fetch(results).then((res) => res.json());
  } catch {
    throw new Error('Failed to get results');
  }
};
