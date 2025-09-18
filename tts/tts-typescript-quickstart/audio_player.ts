import { spawn } from 'child_process';

export const startAudioPlayer = () => {
  const ffplay = spawn('ffplay', ['-nodisp', '-autoexit', '-'], {
    stdio: ['pipe', 'ignore', 'ignore']
  });

  return {
    stdin: ffplay.stdin,
    stop: async () => {
      ffplay.stdin.end();
      await new Promise(resolve => ffplay.on('close', resolve));
    }
  };
};
