import { z } from '@hono/zod-openapi';

// import { MediaType } from '@/providers/video-info';
export type ResponseVideoInfo = z.infer<typeof VideoInfoSchema>;
export const VideoInfoSchema = z.object({
  title: z.string(),
  author: z.string(),
  channel: z.string().nullable().optional(),
  views: z.number(),
  uploadDate: z.string().optional(),
  imageSrc: z.string().nullable().optional(),
  isPaused: z.boolean().optional(),
  videoDuration: z.number(),
  elapsedSeconds: z.number().optional(),
  url: z.string().optional(),
  videoId: z.string(),
  playlistId: z.string().optional(),
});
