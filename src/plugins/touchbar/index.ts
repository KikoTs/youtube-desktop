import { nativeImage, type NativeImage, TouchBar } from 'electron';

import { createPlugin } from '@/utils';
import getVideoControls from '@/providers/video-controls';
import registerCallback, { VideoInfoEvent } from '@/providers/video-info';
import { t } from '@/i18n';

import youtubeIcon from '@assets/youtube.png?asset&asarUnpack';

export default createPlugin({
  name: () => t('plugins.touchbar.name'),
  description: () => t('plugins.touchbar.description'),
  restartNeeded: true,
  config: {
    enabled: false,
  },
  backend({ window }) {
    const {
      TouchBarButton,
      TouchBarLabel,
      TouchBarSpacer,
      TouchBarSegmentedControl,
      TouchBarScrubber,
    } = TouchBar;

    // Video title label
    const videoTitle = new TouchBarLabel({
      label: '',
    });
    // This will store the video controls once available
    let controls: (() => void)[] = [];

    // This will store the video image once available
    const videoImage: {
      icon?: NativeImage;
    } = {};

    // Pause/play button
    const pausePlayButton = new TouchBarButton({});

    // The video control buttons (control functions are in the same order)
    const buttons = new TouchBarSegmentedControl({
      mode: 'buttons',
      segments: [
        new TouchBarButton({
          label: '⏮',
        }),
        pausePlayButton,
        new TouchBarButton({
          label: '⏭',
        }),
        new TouchBarButton({
          label: '👎',
        }),
        new TouchBarButton({
          label: '👍',
        }),
      ],
      change: (i) => controls[i](),
    });

    // This is the touchbar object, this combines everything with proper layout
    const touchBar = new TouchBar({
      items: [
        new TouchBarScrubber({
          items: [videoImage, videoTitle],
          continuous: false,
        }),
        new TouchBarSpacer({
          size: 'flexible',
        }),
        buttons,
      ],
    });

    const { playPause, next, previous, dislike, like } =
      getVideoControls(window);

    // If the page is ready, register the callback
    window.once('ready-to-show', () => {
      controls = [previous, playPause, next, dislike, like];

      // Register the callback
      registerCallback((videoInfo, event) => {
        if (event === VideoInfoEvent.TimeChanged) return;
        // Video information changed, so lets update the touchBar

        // Set the video title
        videoTitle.label = videoInfo.title;

        // Changes the pause button if paused
        pausePlayButton.label = videoInfo.isPaused ? '▶️' : '⏸';

        // Get image source
        videoImage.icon = (
          videoInfo.image
            ? videoInfo.image
            : nativeImage.createFromPath(youtubeIcon)
        ).resize({ height: 23 });

        window.setTouchBar(touchBar);
      });
    });
  },
});
