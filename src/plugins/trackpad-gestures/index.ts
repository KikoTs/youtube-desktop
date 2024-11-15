import { createPlugin } from '@/utils';
import { t } from '@/i18n';

import { GestureDetector, EventData, Gesture } from './geasture-detector';

export default createPlugin({
  name: () => t('plugins.touchpad.name'),
  description: () => t('plugins.touchpad.description'),
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
  renderer({ window }: { window: Window }) {  // Changed from frontend to renderer
    const detector = new GestureDetector();

    const handleGestureEnded = (event: CustomEvent<EventData>) => {
      const { gestureType, sumHorizontal, handle } = event.detail;
      
      if (!handle || gestureType !== Gesture.SWIPE) return;

      const threshold = this.config?.swipeThreshold?.default || 50;  // Safe access to config
      
      if (Math.abs(sumHorizontal) > threshold) {
        if (sumHorizontal > 0) {
          // Swipe right - Go forward
          window.history.forward();
        } else {
          // Swipe left - Go back
          window.history.back();
        }
      }
    };

    detector.addEventListener('gesture-ended', handleGestureEnded);

    return () => {
      // Cleanup
      detector.removeEventListener('gesture-ended', handleGestureEnded);
    };
  },
});