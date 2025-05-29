import { HANGUL_FILLER } from './constants';

import type { GatewayActivityButton } from 'discord-api-types/v10';
import type { VideoInfo } from '@/providers/video-info';
import type { DiscordPluginConfig } from './index';

/**
 * Truncates a string to a specified length, adding ellipsis if truncated.
 * @param str - The string to truncate.
 * @param length - The maximum allowed length.
 * @returns The truncated string.
 */
export const truncateString = (str: string, length: number): string => {
  if (str.length > length) {
    return `${str.substring(0, length - 3)}...`;
  }
  return str;
};

/**
 * Builds the array of buttons for the Discord Rich Presence activity.
 * @param config - The plugin configuration.
 * @param videInfo - The current song information.
 * @returns An array of buttons or undefined if no buttons are configured.
 */
export const buildDiscordButtons = (
  config: DiscordPluginConfig,
  videoInfo: VideoInfo,
): GatewayActivityButton[] | undefined => {
  const buttons: GatewayActivityButton[] = [];
  if (config.playOnYouTubeMusic && videoInfo.url) {
    buttons.push({
      label: 'Play on YouTube',
      url: videoInfo.url,
    });
  }
  if (!config.hideGitHubButton) {
    buttons.push({
      label: 'View App On GitHub',
      url: 'https://github.com/KikoTs/youtube-desktop',
    });
  }
  return buttons.length ? buttons : undefined;
};

/**
 * Pads Hangul fields (title, artist, album) in VideoInfo if they are less than 2 characters long.
 * Discord requires fields to be at least 2 characters.
 * @param videoInfo - The song information object (will be mutated).
 */
export const padHangulFields = (videoInfo: VideoInfo): void => {
  (['title', 'author', 'channel'] as const).forEach((key) => {
    const value = videoInfo[key];
    if (typeof value === 'string' && value.length > 0 && value.length < 2) {
      videoInfo[key] = value + HANGUL_FILLER.repeat(2 - value.length);
    }
  });
};

/**
 * Checks if the difference between two time values indicates a seek operation.
 * @param oldSeconds - The previous elapsed time in seconds.
 * @param newSeconds - The current elapsed time in seconds.
 * @returns True if the time difference suggests a seek, false otherwise.
 */
export const isSeek = (oldSeconds: number, newSeconds: number): boolean => {
  // Consider it a seek if the time difference is greater than 2 seconds
  // (allowing for minor discrepancies in reporting)
  return Math.abs(newSeconds - oldSeconds) > 2;
};
