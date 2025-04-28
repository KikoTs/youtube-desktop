import { createRoute, z } from '@hono/zod-openapi';

import { ipcMain } from 'electron';

import getVideoControls from '@/providers/video-controls';

import {
  type ResponseVideoInfo,
  VideoInfoSchema,
  GoForwardScheme,
  AddVideoToQueueSchema,
  GoBackSchema,
  MoveVideoInQueueSchema,
  QueueParamsSchema,
  SearchSchema,
  SeekSchema,
  SetFullscreenSchema,
  SetQueueIndexSchema,
  SetVolumeSchema,
  SwitchRepeatSchema,
} from '../scheme';

import type { RepeatMode } from '@/types/datahost-get-state';
import type { VideoInfo } from '@/providers/video-info';
import type { BackendContext } from '@/types/contexts';
import type { APIServerConfig } from '../../config';
import type { HonoApp } from '../types';
import type { QueueResponse } from '@/types/youtube-desktop-internal';
import type { Context } from 'hono';

const API_VERSION = 'v1';

const routes = {
  previous: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/previous`,
    summary: 'play previous video',
    description: 'Plays the previous video in the queue',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  next: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/next`,
    summary: 'play next video',
    description: 'Plays the next video in the queue',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  play: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/play`,
    summary: 'Play',
    description: 'Change the state of the player to play',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  pause: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/pause`,
    summary: 'Pause',
    description: 'Change the state of the player to pause',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  togglePlay: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/toggle-play`,
    summary: 'Toggle play/pause',
    description:
      'Change the state of the player to play if paused, or pause if playing',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  like: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/like`,
    summary: 'like video',
    description: 'Set the current video as liked',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  dislike: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/dislike`,
    summary: 'dislike video',
    description: 'Set the current video as disliked',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  seekTo: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/seek-to`,
    summary: 'seek',
    description: 'Seek to a specific time in the current song',
    request: {
      body: {
        description: 'seconds to seek to',
        content: {
          'application/json': {
            schema: SeekSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  goBack: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/go-back`,
    summary: 'go back',
    description: 'Move the current video back by a number of seconds',
    request: {
      body: {
        description: 'seconds to go back',
        content: {
          'application/json': {
            schema: GoBackSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),

  goForward: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/go-forward`,
    summary: 'go forward',
    description: 'Move the current video forward by a number of seconds',
    request: {
      body: {
        description: 'seconds to go forward',
        content: {
          'application/json': {
            schema: GoForwardScheme,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  getShuffleState: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/shuffle`,
    summary: 'get shuffle state',
    description: 'Get the current shuffle state',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              state: z.boolean().nullable(),
            }),
          },
        },
      },
    },
  }),
  shuffle: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/shuffle`,
    summary: 'shuffle',
    description: 'Shuffle the queue',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  repeatMode: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/repeat-mode`,
    summary: 'get current repeat mode',
    description: 'Get the current repeat mode (NONE, ALL, ONE)',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              mode: z.enum(['ONE', 'NONE', 'ALL']).nullable(),
            }),
          },
        },
      },
    },
  }),
  switchRepeat: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/switch-repeat`,
    summary: 'switch repeat',
    description: 'Switch the repeat mode',
    request: {
      body: {
        description: 'number of times to click the repeat button',
        content: {
          'application/json': {
            schema: SwitchRepeatSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  setVolume: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/volume`,
    summary: 'set volume',
    description: 'Set the volume of the player',
    request: {
      body: {
        description: 'volume to set',
        content: {
          'application/json': {
            schema: SetVolumeSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  getVolumeState: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/volume`,
    summary: 'get volume state',
    description: 'Get the current volume state of the player',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              state: z.number(),
            }),
          },
        },
      },
    },
  }),
  setFullscreen: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/fullscreen`,
    summary: 'set fullscreen',
    description: 'Set the fullscreen state of the player',
    request: {
      body: {
        description: 'fullscreen state',
        content: {
          'application/json': {
            schema: SetFullscreenSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  toggleMute: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/toggle-mute`,
    summary: 'toggle mute',
    description: 'Toggle the mute state of the player',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),

  getFullscreenState: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/fullscreen`,
    summary: 'get fullscreen state',
    description: 'Get the current fullscreen state',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({
              state: z.boolean(),
            }),
          },
        },
      },
    },
  }),
  oldQueueInfo: createRoute({
    deprecated: true,
    method: 'get',
    path: `/api/${API_VERSION}/queue-info`,
    summary: 'get current queue info',
    description: 'Get the current queue info',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({}),
          },
        },
      },
      204: {
        description: 'No queue info',
      },
    },
  }),
  videoInfo: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/video-info`,
    summary: 'get video info',
    description: 'Get information about the current video',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: VideoInfoSchema,
          },
        },
      },
    },
  }),
  queueInfo: createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/queue`,
    summary: 'get current queue info',
    description: 'Get the current queue info',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({}),
          },
        },
      },
      204: {
        description: 'No queue info',
      },
    },
  }),
  addToQueue: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/add-to-queue`,
    summary: 'add to queue',
    description: 'Add a video to the queue',
    request: {
      body: {
        description: 'video id and position',
        content: {
          'application/json': {
            schema: AddVideoToQueueSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  moveInQueue: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/move-in-queue`,
    summary: 'move in queue',
    description: 'Move a video in the queue',
    request: {
      body: {
        description: 'from and to indexes',
        content: {
          'application/json': {
            schema: MoveVideoInQueueSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  removeFromQueue: createRoute({
    method: 'delete',
    path: `/api/${API_VERSION}/queue/:index`,
    summary: 'remove from queue',
    description: 'Remove a video from the queue',
    request: {
      params: QueueParamsSchema,
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  setQueueIndex: createRoute({
    method: 'patch',
    path: `/api/${API_VERSION}/queue`,
    summary: 'set queue index',
    description: 'Set the current index of the queue',
    request: {
      body: {
        description: 'index to move the song to',
        content: {
          'application/json': {
            schema: SetQueueIndexSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  clearQueue: createRoute({
    method: 'delete',
    path: `/api/${API_VERSION}/queue`,
    summary: 'clear queue',
    description: 'Clear the queue',
    responses: {
      204: {
        description: 'Success',
      },
    },
  }),
  search: createRoute({
    method: 'post',
    path: `/api/${API_VERSION}/search`,
    summary: 'search for a song',
    description: 'search for a song',
    request: {
      body: {
        description: 'search query',
        content: {
          'application/json': {
            schema: SearchSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: z.object({}),
          },
        },
      },
    },
  }),
};

export const register = (
  app: HonoApp,
  { window }: BackendContext<APIServerConfig>,
  videoInfoGetter: () => VideoInfo | undefined,
  repeatModeGetter: () => RepeatMode | undefined,
  volumeGetter: () => number | undefined,
) => {
  const controller = getVideoControls(window);

  app.openapi(routes.previous, (ctx) => {
    controller.previous();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.next, (ctx) => {
    controller.next();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.play, (ctx) => {
    controller.play();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.pause, (ctx) => {
    controller.pause();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.togglePlay, (ctx) => {
    controller.playPause();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.like, (ctx) => {
    controller.like();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.dislike, (ctx) => {
    controller.dislike();

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.seekTo, (ctx) => {
    const { seconds } = ctx.req.valid('json');
    controller.seekTo(seconds);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.goBack, (ctx) => {
    const { seconds } = ctx.req.valid('json');
    controller.goBack(seconds);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.goForward, (ctx) => {
    const { seconds } = ctx.req.valid('json');
    controller.goForward(seconds);

    ctx.status(204);
    return ctx.body(null);
  });

  app.openapi(routes.getShuffleState, async (ctx) => {
    const stateResponsePromise = new Promise<boolean>((resolve) => {
      ipcMain.once(
        'ytmd:get-shuffle-response',
        (_, isShuffled: boolean | undefined) => {
          return resolve(!!isShuffled);
        },
      );

      controller.requestShuffleInformation();
    });

    const isShuffled = await stateResponsePromise;

    ctx.status(200);
    return ctx.json({ state: isShuffled });
  });

  app.openapi(routes.shuffle, (ctx) => {
    controller.shuffle();

    ctx.status(204);
    return ctx.body(null);
  });

  app.openapi(routes.repeatMode, (ctx) => {
    ctx.status(200);
    return ctx.json({ mode: repeatModeGetter() ?? null });
  });
  app.openapi(routes.switchRepeat, (ctx) => {
    const { iteration } = ctx.req.valid('json');
    controller.switchRepeat(iteration);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.setVolume, (ctx) => {
    const { volume } = ctx.req.valid('json');
    controller.setVolume(volume);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.getVolumeState, (ctx) => {
    ctx.status(200);
    return ctx.json({ state: volumeGetter() ?? 0 });
  });
  app.openapi(routes.setFullscreen, (ctx) => {
    const { state } = ctx.req.valid('json');
    controller.setFullscreen(state);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.toggleMute, (ctx) => {
    controller.muteUnmute();

    ctx.status(204);
    return ctx.body(null);
  });

  app.openapi(routes.getFullscreenState, async (ctx) => {
    const stateResponsePromise = new Promise<boolean>((resolve) => {
      ipcMain.once(
        'ytd:set-fullscreen',
        (_, isFullscreen: boolean | undefined) => {
          return resolve(!!isFullscreen);
        },
      );

      controller.requestFullscreenInformation();
    });

    const fullscreen = await stateResponsePromise;

    ctx.status(200);
    return ctx.json({ state: fullscreen });
  });

  const videoInfo = (ctx: Context) => {
    const info = videoInfoGetter();

    if (!info) {
      ctx.status(204);
      return ctx.body(null);
    }

    const body = { ...info };
    delete body.image;

    ctx.status(200);
    return ctx.json(body satisfies ResponseVideoInfo);
  };
  app.openapi(routes.videoInfo, videoInfo);

  // Queue
  const queueInfo = async (ctx: Context) => {
    const queueResponsePromise = new Promise<QueueResponse>((resolve) => {
      ipcMain.once('ytd:get-queue-response', (_, queue: QueueResponse) => {
        return resolve(queue);
      });

      controller.requestQueueInformation();
    });

    const info = await queueResponsePromise;

    if (!info) {
      ctx.status(204);
      return ctx.body(null);
    }

    ctx.status(200);
    return ctx.json(info);
  };
  app.openapi(routes.oldQueueInfo, queueInfo);
  app.openapi(routes.queueInfo, queueInfo);

  app.openapi(routes.addToQueue, (ctx) => {
    const { videoId, insertPosition } = ctx.req.valid('json');
    controller.addSongToQueue(videoId, insertPosition);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.moveInQueue, (ctx) => {
    const { from, to } = ctx.req.valid('json');
    controller.moveSongInQueue(from, to);

    ctx.status(204);
    return ctx.body(null);
  });
  app.openapi(routes.removeFromQueue, (ctx) => {
    const index = Number(ctx.req.param('index'));
    controller.removeSongFromQueue(index);

    ctx.status(204);
    return ctx.body(null);
  });
};
