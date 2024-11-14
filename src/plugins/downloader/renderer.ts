import downloadHTML from './templates/download.html?raw';

import defaultConfig from '@/config/defaults';
import { getVideoMenu } from '@/providers/dom-elements';
import { getVideoInfo } from '@/providers/video-info-front';

import { LoggerPrefix } from '@/utils';

import { t } from '@/i18n';

import { defaultTrustedTypePolicy } from '@/utils/trusted-types';

import { ElementFromHtml } from '../utils/renderer';

import type { RendererContext } from '@/types/contexts';

import type { DownloaderPluginConfig } from './index';

let menu: Element | null = null;
let progress: Element | null = null;
const downloadButton = ElementFromHtml(downloadHTML);

let doneFirstLoad = false;

const menuObserver = new MutationObserver(() => {
  if (!menu) {
    menu = getVideoMenu();
    if (!menu) {
      return;
    }
  }

  if (menu.contains(downloadButton)) {
    return;
  }

  // check for video (or music)
  let menuUrl = document.querySelector<HTMLAnchorElement>(
    'tp-yt-paper-listbox [tabindex="0"] #navigation-endpoint',
  )?.href;
  if (!menuUrl?.includes('watch?')) {
    menuUrl = undefined;
    // check for podcast
    for (const it of document.querySelectorAll(
      'tp-yt-paper-listbox [tabindex="-1"] #navigation-endpoint',
    )) {
      if (it.getAttribute('href')?.includes('podcast/')) {
        menuUrl = it.getAttribute('href')!;
        break;
      }
    }
  }

  if (!menuUrl && doneFirstLoad) {
    return;
  }

  menu.prepend(downloadButton);
  progress = document.querySelector('#ytmcustom-download');

  if (!doneFirstLoad) {
    setTimeout(() => (doneFirstLoad ||= true), 500);
  }
});

export const onRendererLoad = ({
  ipc,
}: RendererContext<DownloaderPluginConfig>) => {
  window.download = () => {
    const videoMenu = getVideoMenu();
    let videoUrl = videoMenu
      // Selector of first button which is always "Start Radio"
      ?.querySelector(
        'ytmusic-menu-navigation-item-renderer[tabindex="0"] #navigation-endpoint',
      )
      ?.getAttribute('href');

    if (!videoUrl && videoMenu) {
      for (const it of videoMenu.querySelectorAll(
        'ytmusic-menu-navigation-item-renderer[tabindex="-1"] #navigation-endpoint',
      )) {
        if (it.getAttribute('href')?.includes('podcast/')) {
          videoUrl = it.getAttribute('href');
          break;
        }
      }
    }

    if (videoUrl) {
      if (videoUrl.startsWith('watch?')) {
        videoUrl = defaultConfig.url + '/' + videoUrl;
      }

      if (videoUrl.startsWith('podcast/')) {
        videoUrl =
          defaultConfig.url + '/watch?' + videoUrl.replace('podcast/', 'v=');
      }

      if (videoUrl.includes('?playlist=')) {
        ipc.invoke('download-playlist-request', videoUrl);
        return;
      }
    } else {
      videoUrl = getVideoInfo().url || window.location.href;
    }

    ipc.invoke('download-song', videoUrl);
  };

  ipc.on('downloader-feedback', (feedback: string) => {
    if (progress) {
      const targetHtml = feedback || t('plugins.downloader.templates.button');
      (progress.innerHTML as string | TrustedHTML) = defaultTrustedTypePolicy
        ? defaultTrustedTypePolicy.createHTML(targetHtml)
        : targetHtml;
    } else {
      console.warn(
        LoggerPrefix,
        t('plugins.downloader.renderer.can-not-update-progress'),
      );
    }
  });
};

export const onPlayerApiReady = () => {
  menuObserver.observe(document.querySelector('ytmusic-popup-container')!, {
    childList: true,
    subtree: true,
  });
};
