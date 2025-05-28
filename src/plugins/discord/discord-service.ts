import { Client as DiscordClient } from '@xhayper/discord-rpc';
import { dev } from 'electron-is';
import { ActivityType } from 'discord-api-types/v10';

import { t } from '@/i18n';
import { LoggerPrefix } from '@/utils';
import { clientId, PROGRESS_THROTTLE_MS, TimerKey } from './constants';
import { TimerManager } from './timer-manager';
import {
  buildDiscordButtons,
  padHangulFields,
  truncateString,
  isSeek,
} from './utils';

import type { DiscordPluginConfig } from './index';
import type { VideoInfo } from '@/providers/video-info';
import type { SetActivity } from '@xhayper/discord-rpc/dist/structures/ClientUser';

// Public API definition for the Discord Service
export class DiscordService {
  /**
   * Discord RPC client instance.
   */
  rpc = new DiscordClient({ clientId });
  /**
   * Indicates if the service is ready to send activity updates.
   */
  ready = false;
  /**
   * Indicates if the service should attempt to reconnect automatically.
   */
  autoReconnect = true;
  /**
   * Cached song information from the last activity update.
   */
  lastVideoInfo?: VideoInfo;
  /**
   * Timestamp of the last progress update sent to Discord.
   */
  lastProgressUpdate = 0;
  /**
   * Plugin configuration.
   */
  config?: DiscordPluginConfig;
  refreshCallbacks: (() => void)[] = [];
  timerManager = new TimerManager();

  mainWindow: Electron.BrowserWindow;

  /**
   * Initializes the Discord service with configuration and main window reference.
   * Sets up RPC event listeners.
   * @param mainWindow - Electron BrowserWindow instance.
   * @param config - Plugin configuration.
   */
  constructor(
    mainWindow: Electron.BrowserWindow,
    config?: DiscordPluginConfig,
  ) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.autoReconnect = config?.autoReconnect ?? true; // Default autoReconnect to true

    this.rpc.on('connected', () => {
      if (dev()) {
        console.log(LoggerPrefix, t('plugins.discord.backend.connected'));
      }
      this.refreshCallbacks.forEach((cb) => cb());
    });

    this.rpc.on('ready', () => {
      this.ready = true;
      if (this.lastVideoInfo && this.config) {
        this.updateActivity(this.lastVideoInfo);
      }
    });

    this.rpc.on('disconnected', () => {
      this.resetInfo();
      if (this.autoReconnect) {
        this.connectRecursive();
      }
    });
  }

  /**
   * Builds the SetActivity payload for Discord Rich Presence.
   * @param videoInfo - Current song information.
   * @param config - Plugin configuration.
   * @returns The SetActivity object.
   */
  private buildActivityInfo(
    videoInfo: VideoInfo,
    config: DiscordPluginConfig,
  ): SetActivity {
    padHangulFields(videoInfo);

    const activityInfo: SetActivity = {
      type: ActivityType.Listening,
      details: truncateString(videoInfo.title, 128), // Song title
      state: truncateString(videoInfo.author, 128), // Artist name
      largeImageKey: videoInfo.imageSrc ?? undefined,
      largeImageText: "",
      buttons: buildDiscordButtons(config, videoInfo),
    };

    // Handle paused state display
    if (videoInfo.isPaused) {
      activityInfo.largeImageText = '⏸︎';
    } else if (
      !config.hideDurationLeft &&
      videoInfo.videoDuration > 0 &&
      typeof videoInfo.elapsedSeconds === 'number'
    ) {
      const songStartTime = Date.now() - videoInfo.elapsedSeconds * 1000;
      activityInfo.startTimestamp = Math.floor(songStartTime / 1000);
      activityInfo.endTimestamp = Math.floor(
        (songStartTime + videoInfo.videoDuration * 1000) / 1000,
      );
    }

    return activityInfo;
  }

  /**
   * Sets a timer to clear Discord activity if the music is paused for too long,
   * based on the plugin configuration.
   */
  private setActivityTimeout() {
    this.timerManager.clear(TimerKey.ClearActivity); // Clear any existing timeout

    if (
      this.lastVideoInfo?.isPaused === true && // Music must be paused
      this.config?.activityTimeoutEnabled && // Timeout must be enabled in config
      this.config?.activityTimeoutTime && // Timeout duration must be set
      this.config.activityTimeoutTime > 0 // Timeout duration must be positive
    ) {
      this.timerManager.set(
        TimerKey.ClearActivity,
        () => {
          this.clearActivity();
        },
        this.config.activityTimeoutTime,
      );
    }
  }

  /**
   * Resets the internal state (except config and mainWindow), clears timers, and logs disconnection.
   */
  private resetInfo() {
    this.ready = false;
    this.lastVideoInfo = undefined;
    this.lastProgressUpdate = 0;
    this.timerManager.clearAll();
    if (dev()) {
      console.log(LoggerPrefix, t('plugins.discord.backend.disconnected'));
    }
  }

  /**
   * Attempts to connect to Discord RPC after a delay, used for retries.
   * @returns Promise that resolves on successful login or rejects on failure/cancellation.
   */
  private connectWithRetry(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.timerManager.set(
        TimerKey.DiscordConnectRetry,
        () => {
          // Stop retrying if auto-reconnect is disabled or already connected
          if (!this.autoReconnect || this.rpc.isConnected) {
            this.timerManager.clear(TimerKey.DiscordConnectRetry);
            if (this.rpc.isConnected) resolve();
            else
              reject(
                new Error('Auto-reconnect disabled or already connected.'),
              );
            return;
          }

          // Attempt to login
          this.rpc
            .login()
            .then(() => {
              this.timerManager.clear(TimerKey.DiscordConnectRetry); // Success, stop retrying
              resolve();
            })
            .catch(() => {
              this.connectRecursive();
            });
        },
        5000, // 5-second delay before retrying
      );
    });
  }

  /**
   * Recursively attempts to connect to Discord RPC if auto-reconnect is enabled and not connected.
   */
  private connectRecursive = () => {
    if (!this.autoReconnect || this.rpc.isConnected) {
      this.timerManager.clear(TimerKey.DiscordConnectRetry);
      return;
    }
    this.connectWithRetry();
  };

  /**
   * Connects to Discord RPC. Shows an error dialog on failure if specified and not auto-reconnecting.
   * @param showErrorDialog - Whether to show an error dialog on initial connection failure.
   */
  connect(showErrorDialog = false): void {
    if (this.rpc.isConnected) {
      if (dev()) {
        console.log(
          LoggerPrefix,
          t('plugins.discord.backend.already-connected'),
        );
      }
      return;
    }
    if (!this.config) {
      return;
    }

    this.ready = false;
    this.timerManager.clear(TimerKey.DiscordConnectRetry);

    this.rpc.login().catch(() => {
      this.resetInfo();

      if (this.autoReconnect) {
        this.connectRecursive();
      } else if (showErrorDialog && this.mainWindow) {
        // connection failed
      }
    });
  }

  /**
   * Disconnects from Discord RPC, prevents auto-reconnection, and clears timers.
   */
  disconnect(): void {
    this.autoReconnect = false;
    this.timerManager.clear(TimerKey.DiscordConnectRetry);
    this.timerManager.clear(TimerKey.ClearActivity);
    if (this.rpc.isConnected) {
      try {
        this.rpc.destroy();
      } catch {
        // ignored
      }
    }
    this.resetInfo(); // Reset internal state
  }

  /**
   * Updates the Discord Rich Presence based on the current song information.
   * Handles throttling logic to avoid excessive updates.
   * Detects changes in song, pause state, or seeks for immediate updates.
   * @param videoInfo - The current song information.
   */
  updateActivity(videoInfo: VideoInfo): void {
    if (!this.config) return;

    if (!videoInfo.title && !videoInfo.author) {
      if (this.lastVideoInfo?.videoId) {
        this.clearActivity();
        this.lastVideoInfo = undefined;
      }
      return;
    }

    // Cache the latest song info
    this.lastVideoInfo = videoInfo;
    this.timerManager.clear(TimerKey.ClearActivity);

    if (!this.rpc || !this.ready) {
      // skip update if not ready
      return;
    }

    const now = Date.now();
    const elapsedSeconds = videoInfo.elapsedSeconds ?? 0;

    const songChanged = videoInfo.videoId !== this.lastVideoInfo?.videoId;
    const pauseChanged = videoInfo.isPaused !== this.lastVideoInfo?.isPaused;
    const seeked =
      !songChanged &&
      isSeek(this.lastVideoInfo?.elapsedSeconds ?? 0, elapsedSeconds);

    if (songChanged || pauseChanged || seeked) {
      this.timerManager.clear(TimerKey.UpdateTimeout);

      const activityInfo = this.buildActivityInfo(videoInfo, this.config);
      this.rpc.user
        ?.setActivity(activityInfo)
        .catch((err) =>
          console.error(LoggerPrefix, 'Failed to set activity:', err),
        );

      this.lastVideoInfo.videoId = videoInfo.videoId;
      this.lastVideoInfo.isPaused = videoInfo.isPaused ?? false;
      this.lastVideoInfo.elapsedSeconds = elapsedSeconds;
      this.lastProgressUpdate = now;

      this.setActivityTimeout();
    } else if (now - this.lastProgressUpdate > PROGRESS_THROTTLE_MS) {
      this.timerManager.clear(TimerKey.UpdateTimeout);

      const activityInfo = this.buildActivityInfo(videoInfo, this.config);
      this.rpc.user
        ?.setActivity(activityInfo)
        .catch((err) =>
          console.error(LoggerPrefix, 'Failed to set throttled activity:', err),
        );

      this.lastVideoInfo.elapsedSeconds = elapsedSeconds;
      this.lastProgressUpdate = now;
      this.setActivityTimeout();
    } else {
      const remainingThrottle =
        PROGRESS_THROTTLE_MS - (now - this.lastProgressUpdate);
      const videoInfoSnapshot = { ...videoInfo };

      this.timerManager.set(
        TimerKey.UpdateTimeout,
        () => {
          if (
            this.lastVideoInfo?.videoId === videoInfoSnapshot.videoId &&
            this.lastVideoInfo?.isPaused === videoInfoSnapshot.isPaused &&
            this.config
          ) {
            const activityInfo = this.buildActivityInfo(
              videoInfoSnapshot,
              this.config,
            );
            this.rpc.user?.setActivity(activityInfo);
            this.lastProgressUpdate = Date.now();
            this.lastVideoInfo.elapsedSeconds =
              videoInfoSnapshot.elapsedSeconds ?? 0;
            this.setActivityTimeout();
          }
        },
        remainingThrottle,
      );
    }
  }

  /**
   * Clears the Discord Rich Presence activity.
   */
  clearActivity(): void {
    if (this.rpc.isConnected && this.ready) {
      this.rpc.user?.clearActivity();
    }
    this.lastProgressUpdate = 0;
    this.lastVideoInfo = undefined;
    this.timerManager.clear(TimerKey.ClearActivity);
    this.timerManager.clear(TimerKey.UpdateTimeout);
  }

  /**
   * Updates the configuration used by the service and re-evaluates activity/timeouts.
   * @param newConfig - The new plugin configuration.
   */
  onConfigChange(newConfig: DiscordPluginConfig): void {
    this.config = newConfig;
    this.autoReconnect = newConfig.autoReconnect ?? true;

    if (this.lastVideoInfo && this.ready && this.rpc.isConnected) {
      this.updateActivity(this.lastVideoInfo);
    }

    this.setActivityTimeout();
  }

  /**
   * Registers a callback function to be called when the RPC connection status changes (connected/disconnected).
   * @param cb - The callback function.
   */
  registerRefreshCallback(cb: () => void): void {
    this.refreshCallbacks.push(cb);
  }

  /**
   * Checks if the Discord RPC client is currently connected and ready.
   * @returns True if connected and ready, false otherwise.
   */
  isConnected(): boolean {
    // Consider both connection and readiness state
    return this.rpc.isConnected && this.ready;
  }

  /**
   * Cleans up resources: disconnects RPC, clears all timers, and clears callbacks.
   * Should be called when the plugin stops or the application quits.
   */
  cleanup(): void {
    this.disconnect();
    this.refreshCallbacks = [];
  }
}
