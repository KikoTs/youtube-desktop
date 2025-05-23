import { app, dialog } from 'electron';
import { Client as DiscordClient } from '@xhayper/discord-rpc';
import { dev } from 'electron-is';

import { ActivityType, GatewayActivityButton } from 'discord-api-types/v10';

import registerCallback, {
  type VideoInfo,
  VideoInfoEvent,
} from '@/providers/video-info';
import { createBackend, LoggerPrefix } from '@/utils';
import { t } from '@/i18n';

import type { SetActivity } from '@xhayper/discord-rpc/dist/structures/ClientUser';
import type { DiscordPluginConfig } from './index';

// Application ID registered by @th-ch/youtube-music dev team
const clientId = '1177081335727267940';

export interface Info {
  rpc: DiscordClient;
  ready: boolean;
  autoReconnect: boolean;
  lastVideoInfo?: VideoInfo;
}

const info: Info = {
  rpc: new DiscordClient({
    clientId,
  }),
  ready: false,
  autoReconnect: true,
  lastVideoInfo: undefined,
};

/**
 * @type {(() => void)[]}
 */
const refreshCallbacks: (() => void)[] = [];

const truncateString = (str: string, length: number): string => {
  if (str.length > length)
    return `${str.substring(0, length - 3)}...`;
  return str;
}

const resetInfo = () => {
  info.ready = false;
  clearTimeout(clearActivity);
  if (dev()) {
    console.log(LoggerPrefix, t('plugins.discord.backend.disconnected'));
  }

  for (const cb of refreshCallbacks) {
    cb();
  }
};

const connectTimeout = () =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (!info.autoReconnect || info.rpc.isConnected) {
        return;
      }

      info.rpc.login().then(resolve).catch(reject);
    }, 5000),
  );
const connectRecursive = () => {
  if (!info.autoReconnect || info.rpc.isConnected) {
    return;
  }

  connectTimeout().catch(connectRecursive);
};

let window: Electron.BrowserWindow;
export const connect = (showError = false) => {
  if (info.rpc.isConnected) {
    if (dev()) {
      console.log(LoggerPrefix, t('plugins.discord.backend.already-connected'));
    }

    return;
  }

  info.ready = false;

  // Startup the rpc client
  info.rpc.login().catch((error: Error) => {
    resetInfo();
    if (dev()) {
      console.error(error);
    }

    if (info.autoReconnect) {
      connectRecursive();
    } else if (showError) {
      dialog.showMessageBox(window, {
        title: 'Connection failed',
        message: error.message || String(error),
        type: 'error',
      });
    }
  });
};

let clearActivity: NodeJS.Timeout | undefined;

export const clear = () => {
  if (info.rpc) {
    info.rpc.user?.clearActivity();
  }

  clearTimeout(clearActivity);
};

export const registerRefresh = (cb: () => void) => refreshCallbacks.push(cb);
export const isConnected = () => info.rpc?.isConnected;

export const backend = createBackend<
  {
    config?: DiscordPluginConfig;
    updateActivity: (videoInfo: VideoInfo, config: DiscordPluginConfig) => void;
  },
  DiscordPluginConfig
>({
  /**
   * We get multiple events
   * Next video: PAUSE(n), PAUSE(n+1), PLAY(n+1)
   * Skip time: PAUSE(N), PLAY(N)
   */
  updateActivity: (videoInfo, config) => {
    if (videoInfo.title.length === 0 && videoInfo.author.length === 0) {
      return;
    }

    info.lastVideoInfo = videoInfo;

    // Stop the clear activity timeout
    clearTimeout(clearActivity);

    // Stop early if discord connection is not ready
    // do this after clearTimeout to avoid unexpected clears
    if (!info.rpc || !info.ready) {
      return;
    }

    // Clear directly if timeout is 0
    if (
      videoInfo.isPaused &&
      config.activityTimeoutEnabled &&
      config.activityTimeoutTime === 0
    ) {
      info.rpc.user?.clearActivity().catch(console.error);
      return;
    }

    // Video information changed, so lets update the rich presence
    // @see https://discord.com/developers/docs/topics/gateway#activity-object
    // not all options are transfered through https://github.com/discordjs/RPC/blob/6f83d8d812c87cb7ae22064acd132600407d7d05/src/client.js#L518-530
    const hangulFillerUnicodeCharacter = '\u3164'; // This is an empty character
    if (videoInfo.title.length < 2) {
      videoInfo.title += hangulFillerUnicodeCharacter.repeat(
        2 - videoInfo.title.length,
      );
    }
    if (videoInfo.author.length < 2) {
      videoInfo.author += hangulFillerUnicodeCharacter.repeat(
        2 - videoInfo.title.length,
      );
    }

    // see https://github.com/th-ch/youtube-music/issues/1664
    let buttons: GatewayActivityButton[] | undefined = [];
    if (config.playOnYouTubeMusic) {
      buttons.push({
        label: 'Play on YouTube Music',
        url: videoInfo.url ?? 'https://www.youtube.com',
      });
    }
    if (!config.hideGitHubButton) {
      buttons.push({
        label: 'View App On GitHub',
        url: 'https://github.com/th-ch/youtube-music',
      });
    }
    if (buttons.length === 0) {
      buttons = undefined;
    }

    const activityInfo: SetActivity = {
      type: ActivityType.Listening,
      details: videoInfo.title,
      state: videoInfo.author,
      largeImageKey: videoInfo.imageSrc ?? '',
      largeImageText: videoInfo.author ?? '',
      buttons,
    };

    if (videoInfo.isPaused) {
      // Add a paused icon to show that the video is paused
      activityInfo.smallImageKey = 'paused';
      activityInfo.smallImageText = 'Paused';
      // Set start the timer so the activity gets cleared after a while if enabled
      if (config.activityTimeoutEnabled) {
        clearActivity = setTimeout(
          () => info.rpc.user?.clearActivity().catch(console.error),
          config.activityTimeoutTime ?? 10_000,
        );
      }
    } else if (!config.hideDurationLeft) {
      // Add the start and end time of the video
      const videoStartTime = Date.now() - (videoInfo.elapsedSeconds ?? 0) * 1000;
      activityInfo.startTimestamp = videoStartTime;
      activityInfo.endTimestamp = videoStartTime + videoInfo.videoDuration * 1000;
    }

    info.rpc.user?.setActivity(activityInfo).catch(console.error);
  },
  async start(ctx) {
    this.config = await ctx.getConfig();

    info.rpc.on('connected', () => {
      if (dev()) {
        console.log(LoggerPrefix, t('plugins.discord.backend.connected'));
      }

      for (const cb of refreshCallbacks) {
        cb();
      }
    });

    info.rpc.on('ready', () => {
      info.ready = true;
      if (info.lastVideoInfo && this.config) {
        this.updateActivity(info.lastVideoInfo, this.config);
      }
    });

    info.rpc.on('disconnected', () => {
      resetInfo();

      if (info.autoReconnect) {
        connectTimeout();
      }
    });

    info.autoReconnect = this.config.autoReconnect;

    window = ctx.window;

    // If the page is ready, register the callback
    ctx.window.once('ready-to-show', () => {
      let lastSent = Date.now();
      registerCallback((videoInfo, event) => {
        if (event !== VideoInfoEvent.TimeChanged) {
          info.lastVideoInfo = videoInfo;
          if (this.config) this.updateActivity(videoInfo, this.config);
        } else {
          const currentTime = Date.now();
          // if lastSent is more than 5 seconds ago, send the new time
          if (currentTime - lastSent > 5000) {
            lastSent = currentTime;
            if (videoInfo) {
              info.lastVideoInfo = videoInfo;
              if (this.config) this.updateActivity(videoInfo, this.config);
            }
          }
        }
      });
      connect();
    });
    ctx.ipc.on('ytd:player-api-loaded', () =>
      ctx.ipc.send('ytd:setup-time-changed-listener'),
    );
    app.on('window-all-closed', clear);
  },
  stop() {
    resetInfo();
  },
  onConfigChange(newConfig) {
    this.config = newConfig;
    info.autoReconnect = newConfig.autoReconnect;
    if (info.lastVideoInfo) {
      this.updateActivity(info.lastVideoInfo, newConfig);
    }
  },
});
