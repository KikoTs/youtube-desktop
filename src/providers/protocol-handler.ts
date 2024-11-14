import path from 'node:path';

import { app, BrowserWindow } from 'electron';

import getVideoControls from './video-controls';

export const APP_PROTOCOL = 'youtubemusic';

let protocolHandler:
  | ((cmd: string, args: string[] | undefined) => void)
  | undefined;

export function setupProtocolHandler(win: BrowserWindow) {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  const videoControls = getVideoControls(win);

  protocolHandler = ((
    cmd: keyof typeof videoControls,
    args: string[] | undefined = undefined,
  ) => {
    if (Object.keys(videoControls).includes(cmd)) {
      videoControls[cmd](args as never);
    }
  }) as (cmd: string) => void;
}

export function handleProtocol(cmd: string, args: string[] | undefined) {
  protocolHandler?.(cmd, args);
}

export function changeProtocolHandler(
  f: (cmd: string, args: string[] | undefined) => void,
) {
  protocolHandler = f;
}

export default {
  APP_PROTOCOL,
  setupProtocolHandler,
  handleProtocol,
  changeProtocolHandler,
};
