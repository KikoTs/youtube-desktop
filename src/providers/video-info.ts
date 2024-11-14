import { BrowserWindow, ipcMain, nativeImage, net } from 'electron';

import { Mutex } from 'async-mutex';

import config from '@/config';

import type { GetPlayerResponse } from '@/types/get-player-response';


export interface VideoInfo {
  title: string;
  channel?: string;
  author: string;
  views: number;
  uploadDate?: string;
  imageSrc?: string | null;
  image?: Electron.NativeImage | null;
  isPaused?: boolean;
  videoDuration: number;
  elapsedSeconds?: number;
  url?: string;
  videoId: string;
  playlistId?: string;
}

// Grab the native image using the src
export const getImage = async (src: string): Promise<Electron.NativeImage> => {
  const result = await net.fetch(src);
  const output = nativeImage.createFromBuffer(
    Buffer.from(await result.arrayBuffer()),
  );
  if (output.isEmpty() && !src.endsWith('.jpg') && src.includes('.jpg')) {
    // Fix hidden webp files (https://github.com/th-ch/youtube-music/issues/315)
    return getImage(src.slice(0, src.lastIndexOf('.jpg') + 4));
  }

  return output;
};

const handleData = async (
  data: GetPlayerResponse,
  win: Electron.BrowserWindow,
): Promise<VideoInfo | null> => {
  if (!data) {
    return null;
  }

  const videoInfo: VideoInfo = {
    title: '',
    author: '',
    channel: '',
    views: 0,
    uploadDate: '',
    imageSrc: '',
    image: null,
    isPaused: undefined,
    videoDuration: 0,
    elapsedSeconds: 0,
    url: '',
    videoId: '',
    playlistId: '',
  }  satisfies VideoInfo;

  const microformat = data.microformat?.playerMicroformatRenderer;

  if (microformat) {
    const videoId = microformat.embed.iframeUrl.split('/embed/')[1];
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    videoInfo.uploadDate = microformat.uploadDate;
    videoInfo.url = videoUrl
    videoInfo.playlistId =
      new URL(videoUrl).searchParams.get('list') ?? '';
    // Used for options.resumeOnStart
    config.set('url', videoUrl);
  }

  const { videoDetails } = data;
  if (videoDetails) {
    videoInfo.title = cleanupName(videoDetails.title); // fixed
    videoInfo.channel = cleanupName(videoDetails.channelId); // fixed
    videoInfo.author = cleanupName(videoDetails.author); // fixed
    videoInfo.views = Number(videoDetails.viewCount); // fixed
    videoInfo.videoDuration = Number(videoDetails.lengthSeconds); // fixed
    videoInfo.elapsedSeconds = videoDetails.elapsedSeconds; // fixed
    videoInfo.isPaused = videoDetails.isPaused; // fixed
    videoInfo.videoId = videoDetails.videoId; // fixed

    const thumbnails = videoDetails.thumbnail?.thumbnails;
    videoInfo.imageSrc = thumbnails.at(-1)?.url.split('?')[0];
    if (videoInfo.imageSrc) videoInfo.image = await getImage(videoInfo.imageSrc);

    win.webContents.send('ytd:update-video-info', videoInfo);
  }

  return videoInfo;
};

export enum VideoInfoEvent {
  VideoSrcChanged = 'ytd:video-src-changed',
  PlayOrPaused = 'ytd:play-or-paused',
  TimeChanged = 'ytd:time-changed',
}

// This variable will be filled with the callbacks once they register
export type VideoInfoCallback = (
  videoInfo: VideoInfo,
  event: VideoInfoEvent,
) => void;
const callbacks: Set<VideoInfoCallback> = new Set();

// This function will allow plugins to register callback that will be triggered when data changes
const registerCallback = (callback: VideoInfoCallback) => {
  callbacks.add(callback);
};

const registerProvider = (win: BrowserWindow) => {
  const dataMutex = new Mutex();
  let videoInfo: VideoInfo | null = null;

  // This will be called when the vidoe-info-front finds a new request with video data
  ipcMain.on('ytd:video-src-changed', async (_, data: GetPlayerResponse) => {
    const tempVideoInfo = await dataMutex.runExclusive<VideoInfo | null>(
      async () => {
        videoInfo = await handleData(data, win);
        return videoInfo;
      },
    );

    if (tempVideoInfo) {
      for (const c of callbacks) {
        c(tempVideoInfo, VideoInfoEvent.VideoSrcChanged);
      }
    }
  });
  ipcMain.on(
    'ytd:play-or-paused',
    async (
      _,
      {
        isPaused,
        elapsedSeconds,
      }: { isPaused: boolean; elapsedSeconds: number },
    ) => {
      console.log('ytd:play-or-paused', isPaused, elapsedSeconds);
      const tempVideoInfo = await dataMutex.runExclusive<VideoInfo | null>(() => {
        if (!videoInfo) {
          return null;
        }

        videoInfo.isPaused = isPaused;
        videoInfo.elapsedSeconds = elapsedSeconds;

        return videoInfo;
      });

      if (tempVideoInfo) {
        for (const c of callbacks) {
          c(tempVideoInfo, VideoInfoEvent.PlayOrPaused);
        }
      }
    },
  );

  ipcMain.on('ytd:time-changed', async (_, seconds: number) => {
    const tempVideoInfo = await dataMutex.runExclusive<VideoInfo | null>(() => {
      if (!videoInfo) {
        return null;
      }

      videoInfo.elapsedSeconds = seconds;

      return videoInfo;
    });

    if (tempVideoInfo) {
      for (const c of callbacks) {
        c(tempVideoInfo, VideoInfoEvent.TimeChanged);
      }
    }
  });
};

const suffixesToRemove = [
  // Artist names
  /\s*(- topic)$/i,
  /\s*vevo$/i,

  // Video titles
  /\s*[(|[]official(.*?)[)|\]]/i, // (Official Music Video), [Official Visualizer], etc...
  /\s*[(|[]((lyrics?|visualizer|audio)\s*(video)?)[)|\]]/i,
  /\s*[(|[](performance video)[)|\]]/i,
  /\s*[(|[](clip official)[)|\]]/i,
  /\s*[(|[](video version)[)|\]]/i,
  /\s*[(|[](HD|HQ)\s*?(?:audio)?[)|\]]$/i,
  /\s*[(|[](live)[)|\]]$/i,
  /\s*[(|[]4K\s*?(?:upgrade)?[)|\]]$/i,
];

export function cleanupName(name: string): string {
  if (!name) {
    return name;
  }

  for (const suffix of suffixesToRemove) {
    name = name.replace(suffix, '');
  }

  return name;
}

export default registerCallback;
export const setupVideoInfo = registerProvider;
