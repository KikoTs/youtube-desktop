import { Menu, nativeImage, screen, Tray } from 'electron';
import is from 'electron-is';

import defaultTrayIconAsset from '@assets/youtube-tray.png?asset&asarUnpack';
import pausedTrayIconAsset from '@assets/youtube-tray-paused.png?asset&asarUnpack';

import config from './config';

import { restart } from './providers/app-controls';
import registerCallback, { VideoInfoEvent } from './providers/video-info';
import getVideoControls from './providers/video-controls';

import { t } from '@/i18n';

import type { MenuTemplate } from './menu';

// Prevent tray being garbage collected
let tray: Electron.Tray | undefined;

type TrayEvent = (
  event: Electron.KeyboardEvent,
  bounds: Electron.Rectangle,
) => void;

export const setTrayOnClick = (fn: TrayEvent) => {
  if (!tray) {
    return;
  }

  tray.removeAllListeners('click');
  tray.on('click', fn);
};

// Won't do anything on macOS since its disabled
export const setTrayOnDoubleClick = (fn: TrayEvent) => {
  if (!tray) {
    return;
  }

  tray.removeAllListeners('double-click');
  tray.on('double-click', fn);
};

export const setUpTray = (app: Electron.App, win: Electron.BrowserWindow) => {
  if (!config.get('options.tray')) {
    tray = undefined;
    return;
  }

  const { playPause, next, previous } = getVideoControls(win);

  const pixelRatio = is.windows()
    ? screen.getPrimaryDisplay().scaleFactor || 1
    : 1;
  const defaultTrayIcon = nativeImage
    .createFromPath(defaultTrayIconAsset)
    .resize({
      width: 16 * pixelRatio,
      height: 16 * pixelRatio,
    });
  const pausedTrayIcon = nativeImage
    .createFromPath(pausedTrayIconAsset)
    .resize({
      width: 16 * pixelRatio,
      height: 16 * pixelRatio,
    });

  tray = new Tray(defaultTrayIcon);

  tray.setToolTip(t('main.tray.tooltip.default'));

  // MacOS only
  tray.setIgnoreDoubleClickEvents(true);

  tray.on('click', () => {
    if (config.get('options.trayClickPlayPause')) {
      playPause();
    } else if (win.isVisible()) {
      win.hide();
      app.dock?.hide();
    } else {
      win.show();
      app.dock?.show();
    }
  });

  const template: MenuTemplate = [
    {
      label: t('main.tray.play-pause'),
      click() {
        playPause();
      },
    },
    {
      label: t('main.tray.next'),
      click() {
        next();
      },
    },
    {
      label: t('main.tray.previous'),
      click() {
        previous();
      },
    },
    {
      label: t('main.tray.show'),
      click() {
        win.show();
        app.dock?.show();
      },
    },
    { type: 'separator' },
    {
      label: t('main.tray.restart'),
      click: restart,
    },
    { type: 'separator' },
    {
      label: t('main.tray.quit'),
      role: 'quit',
    },
  ];

  const trayMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(trayMenu);

  registerCallback((videoInfo, event) => {
    if (event === VideoInfoEvent.TimeChanged) return;

    if (tray) {
      if (typeof videoInfo.isPaused === 'undefined') {
        tray.setImage(defaultTrayIcon);
        return;
      }

      tray.setToolTip(
        t('main.tray.tooltip.with-song-info', {
          artist: videoInfo.author,
          title: videoInfo.title,
        }),
      );

      tray.setImage(videoInfo.isPaused ? pausedTrayIcon : defaultTrayIcon);
    }
  });
};
