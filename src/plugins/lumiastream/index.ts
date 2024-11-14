import { net } from 'electron';

import { createPlugin } from '@/utils';
import registerCallback from '@/providers/video-info';
import { t } from '@/i18n';

type LumiaData = {
  origin: string;
  eventType: string;
  url?: string;
  videoId?: string;
  playlistId?: string;
  cover?: string | null;
  cover_url?: string | null;
  title?: string;
  artists?: string[];
  status?: string;
  progress?: number;
  duration?: number;
  album_url?: string | null;
  album?: string | null;
  views?: number;
  isPaused?: boolean;
};

export default createPlugin({
  name: () => t('plugins.lumiastream.name'),
  description: () => t('plugins.lumiastream.description'),
  restartNeeded: true,
  config: {
    enabled: false,
  },
  backend({ ipc }) {
    const secToMilisec = (t?: number) =>
      t ? Math.round(Number(t) * 1e3) : undefined;
    const previousStatePaused = null;

    const data: LumiaData = {
      origin: 'youtubemusic',
      eventType: 'switchSong',
    };

    const post = (data: LumiaData) => {
      const port = 39231;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Origin': '*',
      } as const;
      const url = `http://127.0.0.1:${port}/api/media`;

      net
        .fetch(url, {
          method: 'POST',
          body: JSON.stringify({ token: 'lsmedia_ytmsI7812', data }),
          headers,
        })
        .catch((error: { code: number; errno: number }) => {
          console.log(
            `Error: '${
              error.code || error.errno
            }' - when trying to access lumiastream webserver at port ${port}`,
          );
        });
    };

    ipc.on('ytd:player-api-loaded', () =>
      ipc.send('ytd:setup-time-changed-listener'),
    );

    registerCallback((videoInfo) => {
      if (!videoInfo.title && !videoInfo.author) {
        return;
      }

      if (previousStatePaused === null) {
        data.eventType = 'switchSong';
      } else if (previousStatePaused !== videoInfo.isPaused) {
        data.eventType = 'playPause';
      }

      data.duration = secToMilisec(videoInfo.videoDuration);
      data.progress = secToMilisec(videoInfo.elapsedSeconds);
      data.url = videoInfo.url;
      data.videoId = videoInfo.videoId;
      data.playlistId = videoInfo.playlistId;
      data.cover = videoInfo.imageSrc;
      data.cover_url = videoInfo.imageSrc;
      data.album_url = videoInfo.imageSrc;
      data.title = videoInfo.title;
      data.artists = [videoInfo.author];
      data.status = videoInfo.isPaused ? 'stopped' : 'playing';
      data.isPaused = videoInfo.isPaused;
      data.album = "" // idk what to put here
      data.views = videoInfo.views;
      post(data);
    });
  },
});
