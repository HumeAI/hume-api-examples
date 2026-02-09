import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Hume, HumeClient } from 'hume';
import dotenv from 'dotenv';

dotenv.config();

describe('typescript-raw-text-processor', () => {
  it('should return non-empty predictions from batch expression measurement API', async () => {
    const apiKey = process.env.HUME_API_KEY;
    assert.ok(apiKey, 'HUME_API_KEY must be set in .env');

    const language: Hume.expressionMeasurement.batch.Bcp47Tag = 'en';
    const text = 'Hello world!';
    const languageModelConfig: Hume.expressionMeasurement.batch.Language = {
      granularity: Hume.expressionMeasurement.batch.Granularity.Sentence,
      identifySpeakers: false,
    };

    const humeClient = new HumeClient({
      apiKey: String(apiKey),
    });

    const jobConfig: Hume.expressionMeasurement.batch.InferenceBaseRequest = {
      text: [text],
      models: { language: languageModelConfig },
      transcription: { language },
    };

    const job =
      await humeClient.expressionMeasurement.batch.startInferenceJob(jobConfig);
    await job.awaitCompletion();

    const jobDetails = await humeClient.expressionMeasurement.batch.getJobDetails(
      job.jobId,
    );
    const status = jobDetails.state.status;

    if (status === 'FAILED') {
      const message =
        'message' in jobDetails.state
          ? jobDetails.state.message
          : 'Unknown error';
      throw new Error(`Batch job failed: ${message}`);
    }

    const results =
      await humeClient.expressionMeasurement.batch.getJobPredictions(job.jobId);

    assert.ok(Array.isArray(results), 'results should be an array');
    assert.ok(results.length > 0, 'results array should not be empty');

    const firstResult = results[0] as {
      results?: { predictions?: unknown[] };
    };
    assert.ok(firstResult?.results, 'first result should have results');
    const predictions = firstResult.results?.predictions;
    assert.ok(Array.isArray(predictions), 'predictions should be an array');
    assert.ok(
      predictions.length > 0,
      'predictions array should not be empty',
    );

    console.log(JSON.stringify(results, null, 2));
  });
});
