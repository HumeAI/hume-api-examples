import { Hume, HumeClient } from 'hume';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  /**
   * Specify which language is used for the input text.
   * See our documentation on supported languages:
   *  - https://dev.hume.ai/docs/expression-measurement-api/faq#which-languages-are-supported
   */
  const language: Hume.expressionMeasurement.batch.Bcp47Tag = 'en'; // English (default)

  /**
   * Specify the raw text to be processed.
   */
  const text: string = 'Hello world!';

  /**
   * Specify language model configuration for the Expression Measurement API
   * See our documentation on our Language Model
   *  - https://dev.hume.ai/docs/resources/science#emotional-language
   *  - https://dev.hume.ai/reference/expression-measurement-api/batch/start-inference-job#request.body.models.language.granularity
   */
  const languageModelConfig: Hume.expressionMeasurement.batch.Language = {
    granularity: Hume.expressionMeasurement.batch.Granularity.Sentence,
    // sentiment: {}, // uncomment to include sentiment analysis in predictions
    // toxicity: {}, // uncomment to include toxicity analysis in predictions
    identifySpeakers: false, // set to true to include speaker diarization
  };

  // Instantiate hume client with API key
  const humeClient = new HumeClient({
    apiKey: String(process.env.HUME_API_KEY),
  });

  // Specify job configuration
  const jobConfig: Hume.expressionMeasurement.batch.InferenceBaseRequest = {
    text: [text],
    models: { language: languageModelConfig },
    transcription: { language },
  };

  // Submit Job
  const job =
    await humeClient.expressionMeasurement.batch.startInferenceJob(jobConfig);

  // Await Job to complete
  await job.awaitCompletion();

  // Check job status before fetching predictions
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

  // Fetch Job predictions by Job ID
  const results =
    await humeClient.expressionMeasurement.batch.getJobPredictions(job.jobId);

  // Log Job predictions to the console and close the program
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
})();
