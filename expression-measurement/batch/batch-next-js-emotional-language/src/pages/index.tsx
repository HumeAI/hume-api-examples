import { useMutation } from '@tanstack/react-query';
import { Inter } from 'next/font/google';
import { ObjectInspector } from 'react-inspector';
import { useZorm } from 'react-zorm';
import { z } from 'zod';
import { Introduction } from '~/components/Introduction';
import { TextRender } from '~/components/TextRender';
import { processTextFile } from '~/lib/mutations/processTextFile';

const inter = Inter({ subsets: ['latin'] });

const FormSchema = z.object({
  fileUrl: z
    .string()
    .url('URL should be in the format "https://example.com/file.txt"')
    .regex(/\.txt$/, "URL must point to a '.txt' file"),
});

export default function Home() {
  const { data, isLoading, mutate } = useMutation({
    mutationFn: processTextFile,
  });

  const form = useZorm('textAnalysis', FormSchema, {
    onValidSubmit: (e) => {
      e.preventDefault();
      mutate(e.data.fileUrl);
    },
  });

  const Form = (
    <div
      className={
        'flex h-screen w-full flex-col items-start p-4 gap-4 md:overflow-hidden grow'
      }
    >
      <div className={'grow-0 w-full'}>
        <form ref={form.ref} className={'w-full'}>
          <div className={'flex gap-2 w-full'}>
            <input
              name={form.fields.fileUrl()}
              type="text"
              className={
                'border border-slate-500 shadow-sm rounded py-1 px-2 grow placeholder:text-slate-400'
              }
              placeholder={'Enter a URL to a text file'}
            />
            <input
              type="submit"
              className={
                'border border-slate-500 shadow-sm bg-slate-600 text-slate-50 rounded px-2 py-1'
              }
            />
          </div>
          <div>
            {form.errors.fileUrl((e) => (
              <span className={'text-red-500'}>{e.message}</span>
            ))}
          </div>
        </form>
      </div>
      <div className={'grow md:overflow-hidden w-full'}>
        {isLoading && (
          <div className={'w-full h-full grid place-items-center'}>
            <div>Loading...</div>
          </div>
        )}
        {data && typeof data === 'object' && (
          <div
            className={
              'w-full md:flex flex-row gap-4 md:overflow-hidden h-full'
            }
          >
            <div className={'md:overflow-auto md:w-1/2 h-full'}>
              <h2
                className={
                  'text-lg font-semibold text-slate-800 pb-2 border-b mb-2'
                }
              >
                JSON
              </h2>
              <ObjectInspector data={data} expandLevel={2} />
            </div>
            <div className={'md:overflow-auto md:w-1/2 h-full'}>
              <h2
                className={
                  'text-lg font-semibold text-slate-800 pb-2 border-b mb-2'
                }
              >
                Text
              </h2>
              <TextRender data={data} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`${inter.className} flex flex-col md:flex-row h-screen w-screen`}
    >
      <Introduction />
      {Form}
    </div>
  );
}
