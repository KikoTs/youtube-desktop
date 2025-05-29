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
let downloadButton: Element;

let doneFirstLoad = false;

// Detect if we're on YouTube Music or regular YouTube
const isYouTubeMusic = () => window.location.hostname === 'music.youtube.com';

// Create the appropriate download button based on platform
const createDownloadButton = () => {
  if (isYouTubeMusic()) {
    // YouTube Music style button
    return ElementFromHtml(downloadHTML);
  } else {
    // YouTube style button
    const button = document.createElement('button');
    button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading';
    button.style.marginRight = '8px';
    button.title = 'Download';
    button.onclick = () => window.download();
    
    button.innerHTML = `
      <div class="yt-spec-button-shape-next__icon" aria-hidden="true">
        <svg enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%">
          <path d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.7-.7.7 5 5 5-5z"></path>
        </svg>
      </div>
      <div class="yt-spec-button-shape-next__button-text-content">
        <span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">
          <span id="ytmcustom-download" class="yt-core-attributed-string--link-inherit-color">
            ${t('plugins.downloader.templates.button')}
          </span>
        </span>
      </div>
    `;
    
    return button;
  }
};

// Get the appropriate place to inject the download button
const getDownloadButtonContainer = () => {
  if (isYouTubeMusic()) {
    return getVideoMenu(); // YouTube Music menu
  } else {
    // Regular YouTube - try to find a good place to put the download button
    // First try the video action buttons area (like, dislike, share, etc.)
    return document.querySelector('#top-level-buttons-computed') ||
           document.querySelector('.top-level-buttons') ||
           document.querySelector('#actions .ytd-video-primary-info-renderer') ||
           document.querySelector('#info #menu') ||
           getAppropriateVideoMenu(); // Fallback to menu popup
  }
};

// Get the appropriate video menu based on platform (for menu popup injection)
const getAppropriateVideoMenu = () => {
  if (isYouTubeMusic()) {
    return getVideoMenu(); // YouTube Music menu
  } else {
    // Regular YouTube - look for the more options menu in various locations
    return document.querySelector('ytd-menu-popup-renderer tp-yt-paper-listbox') ||
           document.querySelector('#top-level-buttons-computed tp-yt-paper-listbox') ||
           document.querySelector('.top-level-buttons tp-yt-paper-listbox') ||
           document.querySelector('#menu tp-yt-paper-listbox') ||
           document.querySelector('ytd-video-primary-info-renderer #menu tp-yt-paper-listbox') ||
           document.querySelector('.ytd-video-primary-info-renderer #menu tp-yt-paper-listbox');
  }
};

// Get the container to observe for mutations
const getObserverContainer = () => {
  if (isYouTubeMusic()) {
    return document.querySelector('ytmusic-popup-container');
  } else {
    // Regular YouTube
    return document.querySelector('ytd-popup-container') || 
           document.querySelector('#movie_player') ||
           document.body;
  }
};

// Check if we're on a video page
const isOnVideoPage = () => {
  if (isYouTubeMusic()) {
    // YouTube Music - check for video (or music)
    let menuUrl = document.querySelector<HTMLAnchorElement>(
      'tp-yt-paper-listbox [tabindex="0"] #navigation-endpoint',
    )?.href;
    if (!menuUrl?.includes('watch?')) {
      menuUrl = undefined;
      // check for podcast
      for (const it of document.querySelectorAll(
        'tp-yt-paper-listbox [tabindex="-1"] #navigation-endpoint',
      )) {
        const href = it.getAttribute('href');
        if (href?.includes('podcast/')) {
          menuUrl = href;
          break;
        }
      }
    }
    return !!menuUrl;
  } else {
    // Regular YouTube - check if we're on a watch page
    return window.location.pathname === '/watch' || 
           window.location.href.includes('watch?v=');
  }
};

const menuObserver = new MutationObserver(() => {
  if (!menu) {
    menu = getDownloadButtonContainer();
    if (!menu) {
      return;
    }
  }

  // Create the download button if it doesn't exist
  if (!downloadButton) {
    downloadButton = createDownloadButton();
  }

  if (menu.contains(downloadButton)) {
    return;
  }

  if (!isOnVideoPage() && doneFirstLoad) {
    return;
  }

  // For YouTube Music, prepend to menu. For YouTube, append to action buttons area
  if (isYouTubeMusic()) {
    menu.prepend(downloadButton);
  } else {
    // For YouTube, we want to append it to the action buttons area
    menu.appendChild(downloadButton);
  }
  
  progress = document.querySelector('#ytmcustom-download');

  if (!doneFirstLoad) {
    setTimeout(() => (doneFirstLoad ||= true), 500);
  }
});

export const onRendererLoad = ({
  ipc,
}: RendererContext<DownloaderPluginConfig>) => {
  window.download = () => {
    let videoUrl: string | undefined;

    if (isYouTubeMusic()) {
      // YouTube Music logic
      const videoMenu = getVideoMenu();
      videoUrl = videoMenu
        // Selector of first button which is always "Start Radio"
        ?.querySelector<HTMLAnchorElement>(
          'ytmusic-menu-navigation-item-renderer[tabindex="0"] #navigation-endpoint',
        )
        ?.getAttribute('href') ?? undefined;

      if (!videoUrl && videoMenu) {
        for (const it of videoMenu.querySelectorAll(
          'ytmusic-menu-navigation-item-renderer[tabindex="-1"] #navigation-endpoint',
        )) {
          const href = it.getAttribute('href');
          if (href?.includes('podcast/')) {
            videoUrl = href;
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
      }
    } else {
      // Regular YouTube logic
      videoUrl = window.location.href;
      
      // Check if it's a playlist
      if (videoUrl.includes('?list=') || videoUrl.includes('&list=')) {
        ipc.invoke('download-playlist-request', videoUrl);
        return;
      }
    }

    // Fallback to video info if no URL found
    if (!videoUrl) {
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
  const container = getObserverContainer();
  if (container) {
    menuObserver.observe(container, {
      childList: true,
      subtree: true,
    });
  }
};
