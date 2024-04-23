/* eslint-disable react-refresh/only-export-components */
export const emotionMappings = {
  Admiration: 'smile',
  Adoration: 'smile',
  'Aesthetic Appreciation': 'smile',
  Amusement: 'smile',
  Awe: 'smile',
  Boredom: 'smile',
  Calmness: 'smile',
  Contemplation: 'smile',
  Confusion: 'smile',
  Contentment: 'smile',
  Craving: 'smile',
  Disappointment: 'smile',
  Entrancement: 'smile',
  Guilt: 'smile',
  Joy: 'smile',
  Love: 'smile',
  Nostalgia: 'smile',
  Relief: 'smile',
  Romance: 'smile',
  Sadness: 'smile',
  Satisfaction: 'smile',
  'Sexual Desire': 'smile',
  Shame: 'smile',
  Sympathy: 'smile',
  Tiredness: 'smile',
  Anger: 'frown',
  Anxiety: 'frown',
  Awkwardness: 'frown',
  Contempt: 'frown',
  Distress: 'frown',
  Ecstasy: 'frown',
  Embarrassment: 'frown',
  'Empathic Pain': 'frown',
  Envy: 'frown',
  Excitement: 'frown',
  Fear: 'frown',
  Horror: 'frown',
  Interest: 'frown',
  Pain: 'frown',
  Realization: 'frown',
  'Surprise (negative)': 'frown',
  'Surprise (positive)': 'frown',
  Triumph: 'frown',
  Concentration: 'neutral',
  Determination: 'neutral',
  Disgust: 'neutral',
  Doubt: 'neutral',
  Pride: 'neutral',
};

const Frown = () => {
  return (
    <svg
      width="44"
      height="33"
      viewBox="0 0 44 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 2H2.25107"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M42 2H42.2511"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 29.5825C12.8592 29.3677 13.8179 28.4212 14.5283 27.9428C16.2568 26.7786 17.9121 25.6322 19.8029 24.7441C21.4818 23.9555 23.6146 23.8073 25.4249 24.2352C26.6675 24.5289 27.7661 25.3694 28.7448 26.1495C29.8458 27.0272 31.0063 28.071 31.9516 29.114C32.3809 29.5878 33.0973 30.1939 33.3732 30.7457"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

const Neutral = () => {
  return (
    <svg
      width="44"
      height="26"
      viewBox="0 0 44 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 2H2.25107"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M42 2H42.2511"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M17.0632 24.2261H30.4928"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
  );
};

const Smile = () => {
  return (
    <svg
      width="58"
      height="34"
      viewBox="0 0 58 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.04341 13.0472C2.04341 9.93797 1.56265 6.9248 3.80093 4.42702C5.53681 2.48987 9.32433 1.54496 11.8074 2.40448C14.6938 3.40363 15.9835 6.66124 16.8568 9.28111"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M39.2021 9.53221C39.2021 8.93397 39.571 8.40705 39.8438 7.88628C40.4887 6.65501 40.9288 5.36283 41.964 4.3852C44.123 2.34615 45.8114 2 48.6872 2C51.46 2 52.5456 4.33279 53.6249 6.49143C54.3287 7.89887 55.5219 9.94307 55.5219 11.5408"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M20.1206 26.3541C20.6371 26.4689 21.5889 27.3078 22.0037 27.6095C23.1897 28.4721 24.457 29.3022 25.7558 29.9807C28.179 31.2466 30.4971 32.159 33.302 31.8638C34.6 31.7271 36.149 29.53 36.8031 28.5022C37.1913 27.8921 37.4447 26.8422 37.4447 26.103"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
  );
};

const faces: { [key: string]: JSX.Element } = {
  smile: <Smile />,
  frown: <Frown />,
  neutral: <Neutral />,
};

export const getFaceByEmotion = (emotion: string) => {
  const emotionKey = emotionMappings[emotion as keyof typeof emotionMappings];
  return faces[emotionKey];
};
