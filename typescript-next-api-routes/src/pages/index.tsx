import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useZorm } from 'react-zorm';
import { processTextFile } from '~/mutations/processTextFile';
import { ObjectInspector } from 'react-inspector';

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

  return (
    <main
      className={`${inter.className} flex h-screen flex-col items-start p-4 gap-4 overflow-hidden`}
    >
      <div className={'grow-0 w-full'}>
        <form ref={form.ref} className={'w-full'}>
          <div className={'flex gap-2 w-full'}>
            <input
              name={form.fields.fileUrl()}
              type="text"
              className={'border shadow-sm rounded py-1 px-2 grow'}
              placeholder={'Enter a URL to a text file'}
            />
            <input
              type="submit"
              className={
                'border shadow-sm bg-slate-500 text-white rounded px-2 py-1'
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
      <div className={'grow w-full overflow-auto'}>
        {isLoading && <div>Loading...</div>}
        {data && typeof data === 'object' && <ObjectInspector data={data} />}
      </div>
    </main>
  );
}
