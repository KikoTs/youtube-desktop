import { Notification } from 'electron';

import is from 'electron-is';

import { notificationImage } from './utils';
import interactive from './interactive';

import registerCallback, {
  type VideoInfo,
  VideoInfoEvent,
} from '@/providers/video-info';

import type { NotificationsPluginConfig } from './index';
import type { BackendContext } from '@/types/contexts';

let config: NotificationsPluginConfig;

const notify = (info: VideoInfo) => {
  // Send the notification
  const currentNotification = new Notification({
    title: info.title || 'Playing',
    body: info.author,
    icon: notificationImage(info, config),
    silent: true,
    urgency: config.urgency,
  });
  currentNotification.show();

  return currentNotification;
};

const setup = () => {
  let oldNotification: Notification;
  let currentUrl: string | undefined;

  registerCallback((videoInfo: VideoInfo, event) => {
    if (
      event !== VideoInfoEvent.TimeChanged &&
      !videoInfo.isPaused &&
      (videoInfo.url !== currentUrl || config.unpauseNotification)
    ) {
      // Close the old notification
      oldNotification?.close();
      currentUrl = videoInfo.url;
      // This fixes a weird bug that would cause the notification to be updated instead of showing
      setTimeout(() => {
        oldNotification = notify(videoInfo);
      }, 10);
    }
  });
};

export const onMainLoad = async (
  context: BackendContext<NotificationsPluginConfig>,
) => {
  config = await context.getConfig();

  // Register the callback for new video information
  if (is.windows() && config.interactive)
    interactive(context.window, () => config, context);
  else setup();
};

export const onConfigChange = (newConfig: NotificationsPluginConfig) => {
  config = newConfig;
};
