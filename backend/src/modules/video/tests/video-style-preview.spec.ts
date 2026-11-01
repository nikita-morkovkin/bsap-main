import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import type { Server } from 'http';
import request from 'supertest';
import { FfmpegService } from '../../audio/ffmpeg.service';
import { videoStyleSchema } from '../schemas';
import { VideoStylePreviewController } from '../video-style-preview.controller';
import { VideoPreviewUploadInterceptor } from '../video-preview-upload.interceptor';

describe('Creation video style preview', () => {
  let app: INestApplication<Server>;
  let source: string;
  let destination: string;
  const probeMedia = jest.fn(async (path: string) => {
    source = path;
    return {
      streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
      format: { duration: '10' },
    };
  });
  const renderMedia = jest.fn(async (output: string, args: string[]) => {
    destination = output;
    if (args[0] === '-i') {
      source = args[1];
      expect(await fs.readFile(source)).toEqual(
        Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      );
      await fs.writeFile(output, 'graded');
    } else {
      expect(await fs.readFile(source)).toEqual(Buffer.from('video'));
      await fs.writeFile(output, 'original');
    }
  });

  beforeEach(async () => {
    renderMedia.mockClear();
    probeMedia.mockClear();
    const module = await Test.createTestingModule({
      controllers: [VideoStylePreviewController],
      providers: [
        VideoPreviewUploadInterceptor,
        { provide: ConfigService, useValue: new ConfigService() },
        { provide: FfmpegService, useValue: { renderMedia, probeMedia } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => app.close());

  it('grades an uploaded frame with the selected style and removes temporary files', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/video-style-preview')
      .field(
        'style',
        JSON.stringify(videoStyleSchema.parse({ brightness: -0.4 })),
      )
      .attach('frame', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'frame.jpg')
      .expect(201)
      .expect('Content-Type', /image\/jpeg/);
    expect(result.body).toEqual(Buffer.from('graded'));
    expect(renderMedia.mock.calls[0][1]).toContainEqual(
      expect.stringContaining('brightness=-0.4'),
    );
    await expect(fs.stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(destination)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects invalid styles and non-JPEG inputs', async () => {
    await request(app.getHttpServer())
      .post('/api/video-style-preview')
      .field('style', JSON.stringify({ brightness: 9 }))
      .attach('frame', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'frame.jpg')
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/video-style-preview')
      .field('style', JSON.stringify({}))
      .attach('frame', Buffer.from('not an image'), 'frame.jpg')
      .expect(400);
    expect(renderMedia).not.toHaveBeenCalled();
  });

  it('extracts an original frame using FFmpeg and removes temporary files', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/video-style-preview/frame')
      .attach('file', Buffer.from('video'), 'clip.mp4')
      .expect(201)
      .expect('Content-Type', /image\/jpeg/);
    expect(result.body).toEqual(Buffer.from('original'));
    expect(renderMedia.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['-ss', '2', '-i', source, '-frames:v', '1']),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fs.stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(destination)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects invalid video and removes its upload', async () => {
    probeMedia.mockImplementationOnce(async (path: string) => {
      source = path;
      throw new Error('invalid video');
    });
    await request(app.getHttpServer())
      .post('/api/video-style-preview/frame')
      .attach('file', Buffer.from('video'), 'broken.mp4')
      .expect(400);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(fs.stat(source)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(renderMedia).not.toHaveBeenCalled();
  });
});
