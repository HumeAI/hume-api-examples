import wretch from 'wretch';
import QueryAddon from 'wretch/addons/queryString';

export const humeBatchClient = wretch('https://api.hume.ai/v0/batch')
  .headers({
    // Hume API does not accept "br" encoding
    'Accept-Encoding': 'gzip, deflate',
  })
  .addon(QueryAddon);

export const internalApiClient = wretch('/api/').addon(QueryAddon);
