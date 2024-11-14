import { OpenAPIHono as Hono } from '@hono/zod-openapi';
import { serve } from '@hono/node-server';

import type { BackendContext } from '@/types/contexts';
import type { VideoInfo } from '@/providers/video-info';
import type { APIServerConfig } from '../config';

export type HonoApp = Hono;
export type BackendType = {
  app?: HonoApp;
  server?: ReturnType<typeof serve>;
  oldConfig?: APIServerConfig;
  videoInfo?: VideoInfo;

  init: (ctx: BackendContext<APIServerConfig>) => Promise<void>;
  run: (hostname: string, port: number) => void;
  end: () => void;
};
