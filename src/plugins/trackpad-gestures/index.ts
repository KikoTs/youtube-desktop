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
  renderer({ window, config, ipc}: { window: Window; config: any; ipc: any }) {
    console.log('🚀 Initializing touchpad gesture plugin');
    console.log();
    
    const detector = new GestureDetector();
  
  detector.addEventListener('gesture-ended', (event) => {
    const { gestureType, direction } = event.detail
    console.log(`Gesture Ended - Type: ${Gesture[gestureType]}, Final Direction: ${direction}`)
    if(direction == 'right'){
      ipc.send('go-back')
    }
    if(direction == 'left'){
      ipc.send('go-forward')
    }
  })


  },
});