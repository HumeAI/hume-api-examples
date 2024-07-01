const BASE_URL = 'https://api.hume.ai/v0/batch/jobs';

// 1. Set your API Key
const HUME_API_KEY = '<your-api-key>';

// 2. Specify which Language
const language: Language = 'en';

// 3. Specify Language Model configuration
const languageModelConfig: LanguageModelConfig = {};

// 4. Copy and paste the text you'd like processed here
const rawTextInput = '';

// 5. Run `npm run start` to get inference results (predictions) from Hume's Language Model for the rawTextInput.
processRawText(rawTextInput, language, languageModelConfig).catch(
  (error: Error) => console.error('An error occurred:', error)
);

/**
 * Function which starts a job, polls the status of the job until status is `COMPLETED`, and then fetches the
 * job predictions.
 */
async function processRawText(
  rawText: string,
  language: Language,
  languageModelConfig: LanguageModelConfig
): Promise<void> {
  const MAX_RETRIES = 5; // adjust the number of retries here
  const INITIAL_DELAY_MS = 1000; // starting with 1 second delay

  let delay = INITIAL_DELAY_MS;
  const jobId = await startJob(rawText, language, languageModelConfig);

  // poll with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const status = await getJobStatus(jobId);

    if (status === 'COMPLETED') {
      console.log('Status is COMPLETED!');
      const predictions = await getPredictions(jobId);
      console.log(JSON.stringify(predictions));
      return;
    }
    console.log(`Status is ${status}. Retrying in ${delay / 1000} seconds...`);
    await sleep(delay);
    delay *= 2; // exponential backoff
  }

  console.error('Max retries reached. Giving up.');
}

/**
 * See API Reference for more information on the start job endpoint: https://dev.hume.ai/reference/expression-measurement-api/batch/start-inference-job
 */
async function startJob(
  rawText: string,
  language: Language,
  languageModelConfig: LanguageModelConfig
): Promise<string> {
  const body = JSON.stringify({
    text: [rawText],
    models: { language: languageModelConfig },
    transcription: { language },
  });
  const options = { ...buildHumeRequestOptions('POST'), body };
  const response = await fetch(BASE_URL, options);
  if (!response.ok) {
    throw new Error(`Failed to start job: ${response.statusText}`);
  }
  const json = await response.json();

  return json.job_id as string;
}

/**
 * See API Reference for more information on the get job details endpoint: https://dev.hume.ai/reference/expression-measurement-api/batch/get-job-details
 */
async function getJobStatus(jobId: string): Promise<string> {
  const options = buildHumeRequestOptions('GET');
  const response = await fetch(`${BASE_URL}/${jobId}`, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.statusText}`);
  }
  const json = await response.json();

  return json.state.status;
}

/**
 * See API Reference for more information on the get job predictions endpoint: https://dev.hume.ai/reference/expression-measurement-api/batch/get-job-predictions
 */
async function getPredictions(jobId: string): Promise<any> {
  const options = buildHumeRequestOptions('GET');
  const response = await fetch(`${BASE_URL}/${jobId}/predictions`, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch job predictions: ${response.statusText}`);
  }
  const json = await response.json();

  return json;
}

/**
 * Helper function for building headers and options for Hume API requests.
 */
function buildHumeRequestOptions(method: 'GET' | 'POST'): {
  method: 'GET' | 'POST';
  headers: Headers;
} {
  const headers = new Headers();
  headers.append('X-Hume-Api-Key', HUME_API_KEY);
  headers.append('Content-Type', 'application/json');

  return { method, headers };
}

/**
 * Helper function to support exponential backoff implementation when polling for job status.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Language (ISO 639-1) Codes used to specify which language is to be processed. See our documentation
 * for supported languages here: https://dev.hume.ai/docs/expression-measurement-api/faq#which-languages-are-supported.
 */
type Language =
  | 'ar' // Arabic
  | 'bg' // Bulgarian
  | 'ca' // Catalan
  | 'cs' // Czech
  | 'da' // Danish (supports transcription)
  | 'de' // German (supports transcription)
  | 'el' // Greek
  | 'en' // English (supports transcription)
  | 'es' // Spanish (supports transcription)
  | 'et' // Estonian
  | 'fa' // Farsi
  | 'fi' // Finnish
  | 'fr' // French (supports transcription)
  | 'fr-CA' // French (Canada) (supports transcription)
  | 'gl' // Galician
  | 'gu' // Gujarati
  | 'he' // Hebrew
  | 'hi' // Hindi (supports transcription)
  | 'hr' // Croatian
  | 'hu' // Hungarian
  | 'hy' // Armenian
  | 'id' // Indonesian (supports transcription)
  | 'it' // Italian (supports transcription)
  | 'ja' // Japanese (supports transcription)
  | 'ka' // Georgian
  | 'ko' // Korean (supports transcription)
  | 'ku' // Kurdish
  | 'lt' // Lithuanian
  | 'lv' // Latvian
  | 'mk' // FYRO Macedonian
  | 'mn' // Mongolian
  | 'mr' // Marathi
  | 'ms' // Malay
  | 'my' // Burmese
  | 'nb' // Norwegian (Bokmål)
  | 'nl' // Dutch (supports transcription)
  | 'pl' // Polish (supports transcription)
  | 'pt' // Portuguese (supports transcription)
  | 'pt-BR' // Portuguese (Brazil) (supports transcription)
  | 'ro' // Romanian
  | 'ru' // Russian (supports transcription)
  | 'sk' // Slovak
  | 'sl' // Slovenian
  | 'sq' // Albanian
  | 'sr' // Serbian
  | 'sv' // Swedish (supports transcription)
  | 'th' // Thai
  | 'tr' // Turkish (supports transcription)
  | 'uk' // Ukrainian (supports transcription)
  | 'ur' // Urdu
  | 'vi' // Vietnamese
  | 'zh-CN' // Chinese (supports transcription)
  | 'zh-TW'; // Chinese (Taiwan) (supports transcription)

/**
 * The granularity at which to generate predictions. `utterance` corresponds to a natural pause or break in conversation, while `conversational_turn`
 * corresponds to a change in speaker. Granularity will default to `word` if not provided.
 *
 * For more information on configuring granularity, check out our documentation here:
 * https://dev.hume.ai/docs/expression-measurement-api/faq#how-granular-are-the-outputs-of-our-speech-prosody-and-language-models
 */
type LanguageGranularity =
  | 'word'
  | 'sentence'
  | 'utterance'
  | 'conversational_turn';

/**
 * Configuration object which informs how Hume's Language model will process the text, and whether to include predictions from
 * the Sentiment and Toxicity models. See the start job endpoint for more details on job configuration:
 * https://dev.hume.ai/reference/expression-measurement-api/batch/start-inference-job
 */
type LanguageModelConfig = {
  granularity?: LanguageGranularity;
  sentiment?: {};
  toxicity?: {};
};
