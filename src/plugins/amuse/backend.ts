import { t } from 'i18next';

import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import registerCallback, { type VideoInfo } from '@/providers/video-info';
import { createBackend } from '@/utils';

import type { AmuseVideoInfo } from './types';

const amusePort = 9863;

const formatVideoInfo = (info: VideoInfo) => {
  const formattedVideoInfo: AmuseVideoInfo = {
    player: {
      hasSong: !!(info.author && info.title),
      isPaused: info.isPaused ?? false,
      seekbarCurrentPosition: info.elapsedSeconds ?? 0,
    },
    track: {
      duration: info.videoDuration,
      title: info.title,
      author: info.author,
      cover: info.imageSrc ?? '',
      url: info.url ?? '',
      id: info.videoId,
      isAdvertisement: false,
    },
  };
  return formattedVideoInfo;
};

export default createBackend({
  currentVideoInfo: {} as VideoInfo,
  app: null as Hono | null,
  server: null as ReturnType<typeof serve> | null,
  start() {
    registerCallback((videoInfo) => {
      this.currentVideoInfo = videoInfo;
    });

    this.app = new Hono();
    this.app.use('*', cors());
    this.app.get('/', (ctx) =>
      ctx.body(t('plugins.amuse.response.query'), 200),
    );

    const queryAndApiHandler = (ctx: Context) => {
      return ctx.json(formatVideoInfo(this.currentVideoInfo), 200);
    };

    this.app.get('/query', queryAndApiHandler);
    this.app.get('/api', queryAndApiHandler);

    try {
      this.server = serve({
        fetch: this.app.fetch.bind(this.app),
        port: amusePort,
      });
    } catch (err) {
      console.error(err);
    }
  },

  stop() {
    if (this.server) {
      this.server?.close();
    }
  },
});
