import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import toast, { Toaster } from 'react-hot-toast';
import { TooltipProvider } from '~/components/Tooltip';
import '~/styles/globals.css';

const client = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (err) => {
        const reason = err instanceof Error ? err.message : 'An error occurred';
        toast.error(reason);
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Component {...pageProps} />
        <Toaster position="bottom-center" reverseOrder={false} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
