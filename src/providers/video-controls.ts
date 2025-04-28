// This is used for to control the songs
import { BrowserWindow, ipcMain } from 'electron';

// see protocol-handler.ts
type ArgsType<T> = T | string[] | undefined;

const parseNumberFromArgsType = (args: ArgsType<number>) => {
  if (typeof args === 'number') {
    return args;
  } else if (Array.isArray(args)) {
    return Number(args[0]);
  } else {
    return null;
  }
};

const parseBooleanFromArgsType = (args: ArgsType<boolean>) => {
  if (typeof args === 'boolean') {
    return args;
  } else if (Array.isArray(args)) {
    return args[0] === 'true';
  } else {
    return null;
  }
};

const parseStringFromArgsType = (args: ArgsType<string>) => {
  if (typeof args === 'string') {
    return args;
  } else if (Array.isArray(args)) {
    return args[0];
  } else {
    return null;
  }
};

export default (win: BrowserWindow) => {
  return {
    // Playback
    previous: () => win.webContents.send('ytd:previous-video'),
    next: () => win.webContents.send('ytd:next-video'),
    play: () => win.webContents.send('ytd:play'),
    pause: () => win.webContents.send('ytd:pause'),
    playPause: () => win.webContents.send('ytd:toggle-play'),
    like: () => win.webContents.send('ytd:update-like', 'LIKE'),
    dislike: () => win.webContents.send('ytd:update-like', 'DISLIKE'),
    seekTo: (seconds: ArgsType<number>) => {
      const secondsNumber = parseNumberFromArgsType(seconds);
      if (secondsNumber !== null) {
        win.webContents.send('ytd:seek-to', seconds);
      }
    },
    goBack: (seconds: ArgsType<number>) => {
      const secondsNumber = parseNumberFromArgsType(seconds);
      if (secondsNumber !== null) {
        win.webContents.send('ytd:seek-by', -secondsNumber);
      }
    },
    goForward: (seconds: ArgsType<number>) => {
      const secondsNumber = parseNumberFromArgsType(seconds);
      if (secondsNumber !== null) {
        win.webContents.send('ytd:seek-by', seconds);
      }
    },
    requestShuffleInformation: () => {
      win.webContents.send('ytd:get-shuffle');
    },
    shuffle: () => win.webContents.send('ytd:shuffle'),
    switchRepeat: (n: ArgsType<number> = 1) => {
      const repeat = parseNumberFromArgsType(n);
      if (repeat !== null) {
        win.webContents.send('ytd:switch-repeat', n);
      }
    },
    // General
    setVolume: (volume: ArgsType<number>) => {
      const volumeNumber = parseNumberFromArgsType(volume);
      if (volumeNumber !== null) {
        win.webContents.send('ytd:update-volume', volume);
      }
    },
    setFullscreen: (isFullscreen: ArgsType<boolean>) => {
      const isFullscreenValue = parseBooleanFromArgsType(isFullscreen);
      if (isFullscreenValue !== null) {
        win.setFullScreen(isFullscreenValue);
        win.webContents.send('ytd:click-fullscreen-button', isFullscreenValue);
      }
    },
    requestFullscreenInformation: () => {
      win.webContents.send('ytd:get-fullscreen');
    },
    requestQueueInformation: () => {
      win.webContents.send('ytd:get-queue');
    },
    muteUnmute: () => win.webContents.send('ytd:toggle-mute'),
    openSearchBox: () => {
      win.webContents.sendInputEvent({
        type: 'keyDown',
        keyCode: '/',
      });
    },
    // Queue
    addSongToQueue: (videoId: string, queueInsertPosition: string) => {
      const videoIdValue = parseStringFromArgsType(videoId);
      if (videoIdValue === null) return;

      win.webContents.send(
        'ytd:add-to-queue',
        videoIdValue,
        queueInsertPosition,
      );
    },
    moveSongInQueue: (
      fromIndex: ArgsType<number>,
      toIndex: ArgsType<number>,
    ) => {
      const fromIndexValue = parseNumberFromArgsType(fromIndex);
      const toIndexValue = parseNumberFromArgsType(toIndex);
      if (fromIndexValue === null || toIndexValue === null) return;

      win.webContents.send('ytd:move-in-queue', fromIndexValue, toIndexValue);
    },
    removeSongFromQueue: (index: ArgsType<number>) => {
      const indexValue = parseNumberFromArgsType(index);
      if (indexValue === null) return;

      win.webContents.send('ytd:remove-from-queue', indexValue);
    },
    setQueueIndex: (index: ArgsType<number>) => {
      const indexValue = parseNumberFromArgsType(index);
      if (indexValue === null) return;

      win.webContents.send('ytd:set-queue-index', indexValue);
    },
    clearQueue: () => win.webContents.send('ytd:clear-queue'),

    search: (query: string) =>
      new Promise((resolve) => {
        ipcMain.once('ytd:search-results', (_, result) => {
          resolve(result as string);
        });
        win.webContents.send('ytd:search', query);
      }),
  };
};
