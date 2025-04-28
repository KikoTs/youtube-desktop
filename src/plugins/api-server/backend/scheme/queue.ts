import { z } from '@hono/zod-openapi';

export const QueueParamsSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
});

export const AddVideoToQueueSchema = z.object({
  videoId: z.string(),
  insertPosition: z
    .enum(['INSERT_AT_END', 'INSERT_AFTER_CURRENT_VIDEO'])
    .optional()
    .default('INSERT_AT_END'),
});

export const MoveVideoInQueueSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
});

export const SetQueueIndexSchema = z.object({
  index: z.number().int().nonnegative(),
});

// For backward compatibility
export const AddSongToQueueSchema = AddVideoToQueueSchema;
export const MoveSongInQueueSchema = MoveVideoInQueueSchema;
