import path from 'node:path';
import fs from 'node:fs';

import { app, NativeImage } from 'electron';

import youtubeIcon from '@assets/youtube.png?asset&asarUnpack';

import { VideoInfo } from '@/providers/video-info';

import type { NotificationsPluginConfig } from './index';

const userData = app.getPath('userData');
const temporaryIcon = path.join(userData, 'tempIcon.png');
const temporaryBanner = path.join(userData, 'tempBanner.png');

export const ToastStyles = {
  logo: 1,
  banner_centered_top: 2,
  hero: 3,
  banner_top_custom: 4,
  banner_centered_bottom: 5,
  banner_bottom: 6,
  legacy: 7,
};

export const urgencyLevels = [
  { name: 'Low', value: 'low' } as const,
  { name: 'Normal', value: 'normal' } as const,
  { name: 'High', value: 'critical' } as const,
];

const nativeImageToLogo = (nativeImage: NativeImage) => {
  const temporaryImage = nativeImage.resize({ height: 256 });
  const margin = Math.max(temporaryImage.getSize().width - 256, 0);

  return temporaryImage.crop({
    x: Math.round(margin / 2),
    y: 0,
    width: 256,
    height: 256,
  });
};

export const notificationImage = (
  videoInfo: VideoInfo,
  config: NotificationsPluginConfig,
) => {
  if (!videoInfo.image) {
    return youtubeIcon;
  }

  if (!config.interactive) {
    return nativeImageToLogo(videoInfo.image);
  }

  switch (config.toastStyle) {
    case ToastStyles.logo:
    case ToastStyles.legacy: {
      return saveImage(nativeImageToLogo(videoInfo.image), temporaryIcon);
    }

    default: {
      return saveImage(videoInfo.image, temporaryBanner);
    }
  }
};

export const saveImage = (img: NativeImage, savePath: string) => {
  try {
    fs.writeFileSync(savePath, img.toPNG());
  } catch (error: unknown) {
    console.error('Error writing video icon to disk:');
    console.trace(error);
    return youtubeIcon;
  }

  return savePath;
};

export const snakeToCamel = (string_: string) =>
  string_.replaceAll(/([-_][a-z]|^[a-z])/g, (group) =>
    group.toUpperCase().replace('-', ' ').replace('_', ' '),
  );

export const secondsToMinutes = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;
  return `${minutes}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
};
