import { createWriteStream, promises as fs } from 'fs';
import { dirname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

/** Streams an HTTP response body to outputPath; removes the partial file on failure. */
export async function writeAudioResponse(
  response: Response,
  outputPath: string,
  signal: AbortSignal,
): Promise<void> {
  if (!response.body) {
    throw new Error('Audio response has no body');
  }

  await fs.mkdir(dirname(outputPath), { recursive: true });

  try {
    await pipeline(
      Readable.from(readBody(response.body)),
      createWriteStream(outputPath),
      { signal },
    );
  } catch (error) {
    await fs.rm(outputPath, { force: true }).catch(() => undefined);

    throw error;
  }
}

async function* readBody(
  body: NonNullable<Response['body']>,
): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      yield value;
    }
  } finally {
    await reader.cancel().catch(() => undefined);

    reader.releaseLock();
  }
}
