import is from 'electron-is';
import { webFrame } from 'electron';
import { createPlugin } from '@/utils';

import { sortSegments } from './segments';

import { t } from '@/i18n';

import type { GetPlayerResponse } from '@/types/get-player-response';
import type { Segment, SkipSegment } from './types';

export type SponsorBlockPluginConfig = {
  enabled: boolean;
  apiURL: string;
  categories: (
    | 'sponsor'
    | 'intro'
    | 'outro'
    | 'interaction'
    | 'selfpromo'
    | 'music_offtopic'
  )[];
};

let currentSegments: Segment[] = [];
const sponsorBlockCss = `
#sponsor-bar {
    display: flex;
    position: absolute;
    top: 0;
    height: 4px;
    width: 100%;
    z-index: 10;
    pointer-events: none;
}
#sponsor-bar div {
    height: 100%;
}

`
export default createPlugin({
  name: () => t('plugins.sponsorblock.name'),
  description: () => t('plugins.sponsorblock.description'),
  restartNeeded: true,
  config: {
    enabled: false,
    apiURL: 'https://sponsor.ajay.app',
    categories: [
      'sponsor',
      'intro',
      'outro',
      'interaction',
      'selfpromo',
      'music_offtopic',
    ],
  } as SponsorBlockPluginConfig,
  async backend({ getConfig, ipc }) {
    // webFrame.insertCSS(sponsorBlockCss)
    const fetchSegments = async (
      apiURL: string,
      categories: string[],
      videoId: string,
    ) => {
      const sponsorBlockURL = `${apiURL}/api/skipSegments?videoID=${videoId}&categories=${JSON.stringify(
        categories,
      )}`;
      try {
        const resp = await fetch(sponsorBlockURL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          redirect: 'follow',
        });
        if (resp.status !== 200) {
          return [];
        }

        const segments = (await resp.json()) as SkipSegment[];
        return sortSegments(segments.map((submission) => submission.segment));
      } catch (error) {
        if (is.dev()) {
          console.log('error on sponsorblock request:', error);
        }

        return [];
      }
    };

    const config = await getConfig();

    const { apiURL, categories } = config;

    ipc.on('ytd:video-src-changed', async (data: GetPlayerResponse) => {
      const segments = await fetchSegments(
        apiURL,
        categories,
        data?.videoDetails?.videoId,
      );
      ipc.send('sponsorblock-skip', segments);
    });
  },
  renderer: {
    timeUpdateListener: (e: Event) => {
        if (e.target instanceof HTMLVideoElement) {
            const target = e.target;

            for (const segment of currentSegments) {
                if (
                    target.currentTime >= segment[0] &&
                    target.currentTime < segment[1]
                ) {
                    target.currentTime = segment[1];
                    if (window.electronIs.dev()) {
                        console.log('SponsorBlock: skipping segment', segment);
                    }
                }
            }
        }
    },
    resetSegments: () => {
        currentSegments = [];
        this.updateProgressBar();
    },
    start({ ipc }) {
      
        ipc.on('sponsorblock-skip', (segments: Segment[]) => {
            currentSegments = segments;
            this.updateProgressBar();
        });
    },
    onPlayerApiReady() {
        const video = document.querySelector<HTMLVideoElement>('video');
        if (!video) return;

        video.addEventListener('timeupdate', this.timeUpdateListener);
        video.addEventListener('emptied', this.resetSegments);

        this.addProgressBar();
    },
    stop() {
        const video = document.querySelector<HTMLVideoElement>('video');
        if (!video) return;

        video.removeEventListener('timeupdate', this.timeUpdateListener);
        video.removeEventListener('emptied', this.resetSegments);

        this.removeProgressBar();
    },
    addProgressBar() {
      const progressContainer = document.querySelector('.ytp-progress-bar-container');
      if (!progressContainer) return;
  
      const sponsorBar = document.createElement('div');
      sponsorBar.id = 'sponsor-bar';
      sponsorBar.style.position = 'absolute';
      sponsorBar.style.top = '0';
      sponsorBar.style.height = '4px';
      sponsorBar.style.width = '100%';
      sponsorBar.style.pointerEvents = 'none';
      sponsorBar.style.display = 'flex';
      sponsorBar.style.zIndex = '10';
  
      progressContainer.appendChild(sponsorBar);
      this.updateProgressBar();
  },
  updateProgressBar() {
      const sponsorBar = document.getElementById('sponsor-bar');
      if (!sponsorBar || !currentSegments.length) return;
  
      sponsorBar.innerHTML = ''; // Clear previous segments
  
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;
  
      const duration = video.duration;
  
      currentSegments.forEach(([start, end], index) => {
          const segmentDiv = document.createElement('div');
          segmentDiv.style.flexGrow = '0';
          segmentDiv.style.flexShrink = '0';
          segmentDiv.style.position = 'absolute';
          segmentDiv.style.left = this.timeToPercentage(start, duration);
          segmentDiv.style.width = this.timeToPercentage(end - start, duration);
          segmentDiv.style.height = '100%';
  
          // Assign a color based on the category
          const category = currentSegments[index].category || 'sponsor';
          segmentDiv.style.backgroundColor = this.getCategoryColor(category);
  
          sponsorBar.appendChild(segmentDiv);
      });
  },
  timeToPercentage(time: number, duration: number): string {
      return `${(time / duration) * 100}%`;
  },
    getCategoryColor(category: string): string {
        const colors = {
            sponsor: 'rgba(0, 212, 0, 0.5)',
            intro: 'rgba(0, 255, 0, 0.5)',
            outro: 'rgba(0, 0, 255, 0.5)',
            interaction: 'rgba(255, 255, 0, 0.5)',
            selfpromo: 'rgba(255, 0, 255, 0.5)',
            music_offtopic: 'rgba(0, 255, 255, 0.5)',
        };
        return colors[category] || 'rgba(128, 128, 128, 0.5)';
    },
    removeProgressBar() {
        const sponsorBar = document.getElementById('sponsor-bar');
        if (sponsorBar) {
            sponsorBar.remove();
        }
    },
}
});
