import { singleton } from './decorators';

import type { YoutubePlayer } from '@/types/youtube-player';
import type { GetState } from '@/types/datahost-get-state';
import type {
  AlbumDetails,
  PlayerOverlays,
  VideoDataChangeValue,
} from '@/types/player-api-events';

import type { VideoInfo } from './video-info';
import type { VideoDataChanged } from '@/types/video-data-changed';

let videoInfo: VideoInfo = {} as VideoInfo;
export const getVideoInfo = () => videoInfo;

window.ipcRenderer.on(
  'ytd:update-video-info',
  (_, extractedVideoInfo: VideoInfo) => {
    videoInfo = extractedVideoInfo;
  },
);

// Used because 'loadeddata' or 'loadedmetadata' weren't firing on video start for some users (https://github.com/th-ch/youtube-music/issues/473)
const srcChangedEvent = new CustomEvent('ytd:src-changed');

export const setupSeekedListener = singleton(() => {
  document.querySelector('video')?.addEventListener('seeked', (v) => {
    if (v.target instanceof HTMLVideoElement) {
      window.ipcRenderer.send('ytd:seeked', v.target.currentTime);
    }
  });
});

export const setupTimeChangedListener = singleton(() => {
  const progressObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target as Node & { value: string };
      const numberValue = Number(target.value);
      window.ipcRenderer.send('ytd:time-changed', numberValue);
      videoInfo.elapsedSeconds = numberValue;
    }
  });
  const progressBar = document.querySelector('#progress-bar');
  if (progressBar) {
    progressObserver.observe(progressBar, { attributeFilter: ['value'] });
  }
});

export const setupRepeatChangedListener = singleton(() => {
  const repeatObserver = new MutationObserver((mutations) => {
    // provided by YouTube Music
    window.ipcRenderer.send(
      'ytd:repeat-changed',
      (
        mutations[0].target as Node & {
          __dataHost: {
            getState: () => GetState;
          };
        }
      ).__dataHost.getState().queue.repeatMode,
    );
  });
  repeatObserver.observe(document.querySelector('#right-controls .repeat')!, {
    attributeFilter: ['title'],
  });

  // Emit the initial value as well; as it's persistent between launches.
  // provided by YouTube Music
  window.ipcRenderer.send(
    'ytd:repeat-changed',
    document
      .querySelector<
        HTMLElement & {
          getState: () => GetState;
        }
      >('ytmusic-player-bar')
      ?.getState().queue.repeatMode,
  );
});

export const setupVolumeChangedListener = singleton((api: YoutubePlayer) => {
  document.querySelector('video')?.addEventListener('volumechange', () => {
    window.ipcRenderer.send('ytd:volume-changed', api.getVolume());
  });
  // Emit the initial value as well; as it's persistent between launches.
  window.ipcRenderer.send('ytd:volume-changed', api.getVolume());
});

export const setupShuffleChangedListener = singleton(() => {
  const playerBar = document.querySelector('ytmusic-player-bar');

  if (!playerBar) {
    window.ipcRenderer.send('ytd:shuffle-changed-supported', false);
    return;
  }

  const observer = new MutationObserver(() => {
    window.ipcRenderer.send(
      'ytd:shuffle-changed',
      (playerBar?.attributes.getNamedItem('shuffle-on') ?? null) !== null,
    );
  });

  observer.observe(playerBar, {
    attributes: true,
    childList: false,
    subtree: false,
  });
});

export const setupFullScreenChangedListener = singleton(() => {
  const playerBar = document.querySelector('ytmusic-player-bar');

  if (!playerBar) {
    window.ipcRenderer.send('ytd:fullscreen-changed-supported', false);
    return;
  }

  const observer = new MutationObserver(() => {
    window.ipcRenderer.send(
      'ytd:fullscreen-changed',
      (playerBar?.attributes.getNamedItem('player-fullscreened') ?? null) !==
        null,
    );
  });

  observer.observe(playerBar, {
    attributes: true,
    childList: false,
    subtree: false,
  });
});

export const setupAutoPlayChangedListener = singleton(() => {
  const autoplaySlider = document.querySelector<HTMLInputElement>(
    '.autoplay > tp-yt-paper-toggle-button',
  );

  const observer = new MutationObserver(() => {
    window.ipcRenderer.send('ytd:autoplay-changed');
  });

  observer.observe(autoplaySlider!, {
    attributes: true,
    childList: false,
    subtree: false,
  });
});

export default (api: YoutubePlayer) => {
  window.ipcRenderer.on('ytd:setup-time-changed-listener', () => {
    setupTimeChangedListener();
  });

  window.ipcRenderer.on('ytd:setup-repeat-changed-listener', () => {
    setupRepeatChangedListener();
  });

  window.ipcRenderer.on('ytd:setup-volume-changed-listener', () => {
    setupVolumeChangedListener(api);
  });

  window.ipcRenderer.on('ytd:setup-shuffle-changed-listener', () => {
    setupShuffleChangedListener();
  });

  window.ipcRenderer.on('ytd:setup-fullscreen-changed-listener', () => {
    setupFullScreenChangedListener();
  });

  window.ipcRenderer.on('ytd:setup-autoplay-changed-listener', () => {
    setupAutoPlayChangedListener();
  });

  window.ipcRenderer.on('ytd:setup-seeked-listener', () => {
    setupSeekedListener();
  });

  const playPausedHandler = (e: Event, status: string) => {
    if (
      e.target instanceof HTMLVideoElement &&
      Math.round(e.target.currentTime) > 0
    ) {
      window.ipcRenderer.send('ytd:play-or-paused', {
        isPaused: status === 'pause',
        elapsedSeconds: Math.floor(e.target.currentTime),
      });
    }
  };

  const playPausedHandlers = {
    playing: (e: Event) => playPausedHandler(e, 'playing'),
    pause: (e: Event) => playPausedHandler(e, 'pause'),
  };

  const videoEventDispatcher = async (
    name: string,
    videoData: VideoDataChangeValue,
    // eslint-disable-next-line @typescript-eslint/require-await
  ) =>
    document.dispatchEvent(
      new CustomEvent<VideoDataChanged>('videodatachange', {
        detail: { name, videoData },
      }),
    );

  const waitingEvent = new Set<string>();
  // Name = "dataloaded" and abit later "dataupdated"
  api.addEventListener('videodatachange', (name, videoData) => {
    videoEventDispatcher(name, videoData);

    if (name === 'dataupdated' && waitingEvent.has(videoData.videoId)) {
      waitingEvent.delete(videoData.videoId);
      sendVideoInfo(videoData);
    } else if (name === 'dataloaded') {
      const video = document.querySelector<HTMLVideoElement>('video');
      video?.dispatchEvent(srcChangedEvent);

      for (const status of ['playing', 'pause'] as const) {
        // for fix issue that pause event not fired
        video?.addEventListener(status, playPausedHandlers[status]);
      }

      waitingEvent.add(videoData.videoId);
    }
  });

  const video = document.querySelector('video');

  if (video) {
    for (const status of ['playing', 'pause'] as const) {
      video.addEventListener(status, playPausedHandlers[status]);
    }

    if (!isNaN(video.duration)) {
      const {
        title,
        author,
        video_id: videoId,
        list: playlistId,
      } = api.getVideoData();

      const watchNextResponse = api.getWatchNextResponse();

      sendVideoInfo({
        title,
        author,
        videoId,
        playlistId,

        isUpcoming: false,
        lengthSeconds: video.duration,
        loading: true,

        ytmdWatchNextResponse: watchNextResponse,
      } satisfies VideoDataChangeValue);
    }
  }

  function sendVideoInfo(videoData: VideoDataChangeValue) {
    const data = api.getPlayerResponse();

    let playerOverlay: PlayerOverlays | undefined;

    if (!videoData.ytmdWatchNextResponse) {
      playerOverlay = (
        Object.entries(videoData).find(
          ([, value]) => value && Object.hasOwn(value, 'playerOverlays'),
        ) as [string, AlbumDetails | undefined]
      )?.[1]?.playerOverlays;
    } else {
      playerOverlay = videoData.ytmdWatchNextResponse?.playerOverlays;
    }
    data.videoDetails.album =
      playerOverlay?.playerOverlayRenderer?.browserMediaSession?.browserMediaSessionRenderer?.album?.runs?.at(
        0,
      )?.text;
    data.videoDetails.elapsedSeconds = 0;
    data.videoDetails.isPaused = false;

    window.ipcRenderer.send('ytd:video-src-changed', data);
  }
};
