import style from './style.css?inline';
import { createPlugin } from '@/utils';
import { t } from '@/i18n';
import { GestureDetector, Gesture } from './geasture-detector';

export default createPlugin({
  name: () => t('plugins.trackpad-gestures.name'),
  description: () => t('plugins.trackpad-gestures.description'),
  restartNeeded: false,
  config: {
    enabled: false,
    swipeThreshold: {
      type: 'number',
      default: 50,
      minimum: 20,
      maximum: 200,
    },
  },
  stylesheets: [style],
  renderer({ window, config, ipc }: { window: Window; config: any; ipc: any }) {
    console.log('🚀 Initializing touchpad gesture plugin');

    const detector = new GestureDetector();
    const threshold = config.swipeThreshold ?? 50;
    const body = document.body;
    let tracking = false;

    detector.addEventListener('gesture-started', () => {
      tracking = true;
      body.classList.add('gesture-tracking');
      body.style.transform = 'translateX(0px)';
    });

    detector.addEventListener('gesture-in-progress', (event) => {
      if (!tracking) return;
      const { sumHorizontal } = event.detail;
      body.style.transform = `translateX(${sumHorizontal}px)`;
    });

    detector.addEventListener('gesture-ended', (event) => {
      if (!tracking) return;
      tracking = false;
      body.classList.remove('gesture-tracking');

      const { gestureType, direction, sumHorizontal } = event.detail;
      const absX = Math.abs(sumHorizontal);

      body.style.transition = 'transform 0.3s ease-in-out';

      const cleanup = () => {
        body.style.transition = '';
        body.style.transform = '';
        body.classList.remove('gesture-slide-cancel', 'gesture-slide-forward', 'gesture-slide-back');
        body.removeEventListener('transitionend', cleanup);
      };

      if (gestureType !== Gesture.SWIPE || absX < threshold) {
        body.style.transform = 'translateX(0px)';
        body.addEventListener('transitionend', cleanup);
        return;
      }

      const className = direction === 'right' ? 'gesture-slide-back'
        : direction === 'left' ? 'gesture-slide-forward'
          : '';

      if (!className) {
        body.style.transform = 'translateX(0px)';
        body.addEventListener('transitionend', cleanup);
        return;
      }

      body.addEventListener('transitionend', () => {
        cleanup();
        ipc.send(direction === 'right' ? 'go-back' : 'go-forward');
      });

      body.classList.add(className);
    });

  },
});