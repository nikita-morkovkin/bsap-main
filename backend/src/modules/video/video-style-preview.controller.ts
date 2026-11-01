import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { FfmpegService } from '../audio/ffmpeg.service';
import { videoProbeSchema, videoStyleSchema } from './schemas';
import { gradeFilter } from './utils';
import type { VideoUpload } from './types/video-upload.type';
import { VideoPreviewUploadInterceptor } from './video-preview-upload.interceptor';

@Controller('api/video-style-preview')
export class VideoStylePreviewController {
  constructor(private readonly ffmpeg: FfmpegService) {}

  @Post('frame')
  @UseInterceptors(VideoPreviewUploadInterceptor)
  public async frame(
    @UploadedFile() file: VideoUpload | undefined,
    @Res() response: Response,
  ) {
    if (
      !file ||
      !['.mp4', '.mov', '.mkv', '.webm', '.m4v'].includes(
        extname(file.originalname).toLowerCase(),
      )
    ) {
      throw new BadRequestException('Choose a supported video clip');
    }
    let duration: number;
    try {
      const probe = videoProbeSchema.parse(
        await this.ffmpeg.probeMedia(file.path),
      );
      const stream = probe.streams.find((item) => item.codec_type === 'video');
      duration = Number(stream?.duration ?? probe.format.duration);
      if (
        !stream ||
        !stream.width ||
        !stream.height ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        throw new Error('Invalid video');
      }
    } catch {
      throw new BadRequestException('Could not read this video clip');
    }
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-preview-frame-'));
    const output = join(directory, 'original.jpg');
    let image: Buffer;
    try {
      await this.ffmpeg.renderMedia(output, [
        '-ss',
        String(Math.min(2, duration / 2)),
        '-i',
        file.path,
        '-map',
        '0:v:0',
        '-vf',
        'scale=640:360:force_original_aspect_ratio=increase,crop=640:360,setsar=1',
        '-frames:v',
        '1',
      ]);
      image = await fs.readFile(output);
    } catch {
      throw new BadRequestException(
        'Could not extract a frame from this video',
      );
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
    response.type('image/jpeg').send(image);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('frame', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
    }),
  )
  public async preview(
    @UploadedFile() frame: { buffer: Buffer } | undefined,
    @Body('style') rawStyle: string,
    @Res() response: Response,
  ) {
    if (
      !frame ||
      frame.buffer.length < 3 ||
      !frame.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ) {
      throw new BadRequestException('A JPEG preview frame is required');
    }
    let input: unknown;
    let image: Buffer;
    try {
      input = JSON.parse(rawStyle);
    } catch {
      throw new BadRequestException('Invalid preview style');
    }
    const result = videoStyleSchema.safeParse(input);
    if (!result.success) {
      throw new BadRequestException('Invalid preview style');
    }
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-style-preview-'));
    const source = join(directory, 'source.jpg');
    const output = join(directory, 'graded.jpg');
    try {
      await fs.writeFile(source, frame.buffer);
      await this.ffmpeg.renderMedia(output, [
        '-i',
        source,
        '-vf',
        gradeFilter({ ...result.data, width: 640, height: 360 }),
        '-frames:v',
        '1',
      ]);
      image = await fs.readFile(output);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
    response.type('image/jpeg').send(image);
  }
}
