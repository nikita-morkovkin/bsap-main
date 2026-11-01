import { ConflictException } from '@nestjs/common';
import type { State } from '../../state/types';
import { AutoMontageService } from '../auto-montage.service';
import { videoStyleSchema } from '../schemas';

type ProjectVideo = NonNullable<State['video']>;
type Project = Pick<State, 'projectId' | 'status' | 'outputFiles'> &
  Partial<Pick<State, 'mixNeedsRebuild'>> & { video: ProjectVideo };
type Job = NonNullable<ProjectVideo['job']>;

const job = (jobId: string, stage: Job['stage'], error?: string): Job => ({
  jobId,
  projectId: 'p',
  kind: 'build',
  stage,
  progress: 0,
  stageProgress: 0,
  startedAt: '',
  updatedAt: '',
  ...(error ? { error } : {}),
});

const JOB_ID = '00000000-0000-4000-8000-000000000001';

const setup = (
  status: State['status'],
  outputFiles: State['outputFiles'] = {},
  clips = 1,
) => {
  const project: Project = {
    projectId: 'p',
    status,
    outputFiles,
    video: {
      style: videoStyleSchema.parse({}),
      autoMontage: { status: 'pending' },
    },
  };
  const manager = {
    listProjects: () => Promise.resolve([project]),
    getState: () => Promise.resolve(project),
    updateState: (_id: string, update: (state: Project) => void) => {
      update(project);

      return Promise.resolve(project);
    },
  };
  const jobs = { start: jest.fn().mockResolvedValue({ jobId: JOB_ID }) };
  const library = {
    list: () =>
      Promise.resolve(
        Array.from({ length: clips }, () => ({
          enabled: true,
          status: 'ready',
        })),
      ),
  };
  const service = new AutoMontageService(
    manager as never,
    jobs as never,
    library as never,
  );

  return { service, project, jobs };
};

describe('AutoMontageService', () => {
  it('waits until the audio is mastered', async () => {
    const { service, project, jobs } = setup('SYNTHESIZING_AUDIO');

    await service.tick();

    expect(jobs.start).not.toHaveBeenCalled();
    expect(project.video.autoMontage?.status).toBe('pending');
  });

  it('starts the build once audio is ready, then marks done', async () => {
    const { service, project, jobs } = setup('COMPLETED', { wav: 'x.wav' });

    await service.tick();

    expect(jobs.start).toHaveBeenCalledWith('p', 'build');
    expect(project.video.autoMontage).toMatchObject({
      status: 'rendering',
      jobId: JOB_ID,
    });

    project.video.job = job(JOB_ID, 'done');
    await service.tick();

    expect(project.video.autoMontage?.status).toBe('done');
  });

  it('waits while the mix needs a rebuild', async () => {
    const { service, project, jobs } = setup('COMPLETED', { wav: 'x.wav' });

    project.mixNeedsRebuild = true;
    await service.tick();

    expect(jobs.start).not.toHaveBeenCalled();
  });

  it('retries later when another video job is active', async () => {
    const { service, project, jobs } = setup('COMPLETED', { wav: 'x.wav' });

    jobs.start.mockRejectedValueOnce(new ConflictException());
    await service.tick();

    expect(project.video.autoMontage?.status).toBe('pending');
  });

  it('records the job error on failure', async () => {
    const { service, project } = setup('COMPLETED', { wav: 'x.wav' });

    project.video.autoMontage = { status: 'rendering', jobId: JOB_ID };
    project.video.job = job(JOB_ID, 'failed', 'boom');
    await service.tick();

    expect(project.video.autoMontage).toMatchObject({
      status: 'failed',
      error: 'boom',
    });
  });

  it('accepts a manually started job that produced a final video', async () => {
    const { service, project } = setup('COMPLETED', { wav: 'x.wav' });

    project.video.autoMontage = { status: 'rendering', jobId: JOB_ID };
    project.video.job = job('00000000-0000-4000-8000-000000000002', 'done');
    project.video.output = 'video/final/final.mp4';
    await service.tick();

    expect(project.video.autoMontage?.status).toBe('done');
  });

  it('fails the upload step when no valid clips arrived', async () => {
    const { service, project } = setup('IDLE', {}, 0);

    project.video.autoMontage = { status: 'uploading' };
    await service.markUploaded('p', 0);

    expect(project.video.autoMontage?.status).toBe('failed');
  });

  it('moves to pending once clips are uploaded', async () => {
    const { service, project } = setup('IDLE', {}, 2);

    project.video.autoMontage = { status: 'uploading' };
    await service.markUploaded('p', 2);

    expect(project.video.autoMontage).toMatchObject({
      status: 'pending',
      uploaded: 2,
    });
  });
});

describe('AutoMontageService resilience', () => {
  it('does not reject when listing projects fails (a rejection would crash the API)', async () => {
    const service = new AutoMontageService(
      {
        listProjects: () => Promise.reject(new Error('ENOENT state.json')),
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.tick()).resolves.toBeUndefined();
  });
});
