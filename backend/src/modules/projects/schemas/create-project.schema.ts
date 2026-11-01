import { z } from 'zod';
import { profileSchema } from '../../state/schemas';
import { musicSelectionSchema } from '../../music/schemas/music-selection.schema';
import { videoStyleSchema } from '../../video/schemas/video-style.schema';

export const createProjectSchema = z.strictObject({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
  profile: profileSchema,
  selectedTrackIds: musicSelectionSchema.optional(),
  autoMontage: z.boolean().optional(),
  videoStyle: videoStyleSchema.optional(),
});
