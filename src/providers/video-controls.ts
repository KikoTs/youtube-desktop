// This is used for to control the videos
import { BrowserWindow } from 'electron';

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
    search: () => {
      win.webContents.sendInputEvent({
        type: 'keyDown',
        keyCode: '/',
      });
    },
  };
};
