import { Profile } from '../../state/types';
import { createProjectSchema } from '../schemas/create-project.schema';
import type { VideoStyleConfig } from '../../video/types/video-style.type';

export class CreateProjectDto {
  public static readonly schema = createProjectSchema;

  public title!: string;
  public description!: string;
  public profile!: Profile;
  public selectedTrackIds?: string[];
  public autoMontage?: boolean;
  public videoStyle?: VideoStyleConfig;
}
