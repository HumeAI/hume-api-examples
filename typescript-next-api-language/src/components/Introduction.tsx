import Link from 'next/link';
import { FC } from 'react';
import humeLogo from '~/assets/hume-logo.svg';

export const Introduction: FC = () => {
  return (
    <div
      className={
        'p-4 md:border-r md:h-full md:w-[40em] bg-slate-50 border-b md:border-b-0 text-slate-600'
      }
    >
      <div className={'pt-2 pb-5'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={humeLogo.src} alt={'Hume AI Logo'} />
      </div>
      <div>
        <h1 className={'text-xl font-semibold text-slate-800 pt-1 pb-2'}>
          Emotional Language Example
        </h1>
        <h2 className={'text-base font-semibold text-slate-800 pt-1 pb-2'}>
          About
        </h2>
        <p className={'pb-2'}>
          This is an example of how to add Hume AI{"'"}s{' '}
          <Link
            href={'https://help.hume.ai/models/emotional-language'}
            className={'underline'}
          >
            Emotional Language model
          </Link>{' '}
          to your full stack web application.
        </p>
        <p className={'pb-2'}>
          This project uses API routes to call the Hume API without revealing
          your API key to the client-side code.
        </p>
        <p className={'pb-2'}>
          It{"'"}s important to note that while this hides the API key from the
          client side code, you would likely want to include authentication
          middleware so that your API key isn{"'"}t widely useable by anyone who
          knows the URL.
        </p>
        <h2 className={'text-base font-semibold text-slate-800 pt-1 pb-2'}>
          Instructions
        </h2>
        <p className={'pb-2'}>
          Enter a URL to a text file in the input field below and click submit.
          If fetching results is successful, you can view the results in the
          panel to the right.
        </p>
        <p className={'pb-2'}>
          Switch between the different emotions to see how the text is analyzed.
        </p>
      </div>
    </div>
  );
};
