import { BrowserWindow, ipcMain, nativeImage, net } from 'electron';

import { Mutex } from 'async-mutex';

import config from '@/config';

import type { GetPlayerResponse } from '@/types/get-player-response';

export enum MediaType {
  /**
   * Audio uploaded by the original artist
   */
  Audio = 'AUDIO',
  /**
   * Official music video uploaded by the original artist
   */
  OriginalMusicVideo = 'ORIGINAL_MUSIC_VIDEO',
  /**
   * Normal YouTube video uploaded by a user
   */
  UserGeneratedContent = 'USER_GENERATED_CONTENT',
  /**
   * Podcast episode
   */
  PodcastEpisode = 'PODCAST_EPISODE',
  OtherVideo = 'OTHER_VIDEO',
}

export interface SongInfo {
  title: string;
  artist: string;
  views: number;
  uploadDate?: string;
  imageSrc?: string | null;
  image?: Electron.NativeImage | null;
  isPaused?: boolean;
  songDuration: number;
  elapsedSeconds?: number;
  url?: string;
  album?: string | null;
  videoId: string;
  playlistId?: string;
  mediaType: MediaType;
}

export interface VideoInfo {
  title: string;
  channel: string;
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
  mediaType: MediaType;
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
): Promise<SongInfo | null> => {
  if (!data) {
    return null;
  }

  // Fill songInfo with empty values
  const songInfo: SongInfo = {
    title: '',
    artist: '',
    views: 0,
    uploadDate: '',
    imageSrc: '',
    image: null,
    isPaused: undefined,
    songDuration: 0,
    elapsedSeconds: 0,
    url: '',
    album: undefined,
    videoId: '',
    playlistId: '',
    mediaType: MediaType.Audio,
  } satisfies SongInfo;

  const videoInfo: VideoInfo = {
    title: '',
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
    mediaType: MediaType.Audio,
  }

  const microformat = data.microformat?.playerMicroformatRenderer;

  if (microformat) {
    const videoId = microformat.embed.iframeUrl.split('/embed/')[1];
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    songInfo.uploadDate = microformat.uploadDate;
    songInfo.url = videoUrl
    songInfo.playlistId =
      new URL(videoUrl).searchParams.get('list') ?? '';
    // Used for options.resumeOnStart
    config.set('url', videoUrl);
  }

  const { videoDetails } = data;
  console.log(JSON.stringify(data));
  if (videoDetails) {
    songInfo.title = cleanupName(videoDetails.title);
    songInfo.artist = cleanupName(videoDetails.author);
    songInfo.views = Number(videoDetails.viewCount);
    songInfo.songDuration = Number(videoDetails.lengthSeconds);
    songInfo.elapsedSeconds = videoDetails.elapsedSeconds;
    songInfo.isPaused = videoDetails.isPaused;
    songInfo.videoId = videoDetails.videoId;
    songInfo.album = data?.videoDetails?.album; // Will be undefined if video exist

    switch (videoDetails?.musicVideoType) {
      case 'MUSIC_VIDEO_TYPE_ATV':
        songInfo.mediaType = MediaType.Audio;
        break;
      case 'MUSIC_VIDEO_TYPE_OMV':
        songInfo.mediaType = MediaType.OriginalMusicVideo;
        break;
      case 'MUSIC_VIDEO_TYPE_UGC':
        songInfo.mediaType = MediaType.UserGeneratedContent;
        break;
      case 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE':
        songInfo.mediaType = MediaType.PodcastEpisode;
        // HACK: Podcast's participant is not the artist
        if (!config.get('options.usePodcastParticipantAsArtist')) {
          songInfo.artist = cleanupName(
            data.microformat.playerMicroformatRenderer.pageOwnerDetails.name,
          );
        }
        break;
      default:
        songInfo.mediaType = MediaType.OtherVideo;
        // HACK: This is a workaround for "podcast" types where "musicVideoType" doesn't exist. Google :facepalm:
        if (
          !config.get('options.usePodcastParticipantAsArtist') &&
          (data.responseContext.serviceTrackingParams
            ?.at(0)
            ?.params?.find((it) => it.key === 'ipcc')?.value ?? '1') != '0'
        ) {
          songInfo.artist = cleanupName(
            data.microformat.playerMicroformatRenderer.pageOwnerDetails.name,
          );
        }
        break;
    }

    const thumbnails = videoDetails.thumbnail?.thumbnails;
    songInfo.imageSrc = thumbnails.at(-1)?.url.split('?')[0];
    if (songInfo.imageSrc) songInfo.image = await getImage(songInfo.imageSrc);

    win.webContents.send('ytd:update-song-info', songInfo);
  }

  return songInfo;
};

export enum SongInfoEvent {
  VideoSrcChanged = 'ytd:video-src-changed',
  PlayOrPaused = 'ytd:play-or-paused',
  TimeChanged = 'ytd:time-changed',
}

// This variable will be filled with the callbacks once they register
export type SongInfoCallback = (
  songInfo: SongInfo,
  event: SongInfoEvent,
) => void;
const callbacks: Set<SongInfoCallback> = new Set();

// This function will allow plugins to register callback that will be triggered when data changes
const registerCallback = (callback: SongInfoCallback) => {
  callbacks.add(callback);
};

const registerProvider = (win: BrowserWindow) => {
  const dataMutex = new Mutex();
  let songInfo: SongInfo | null = null;

  // This will be called when the song-info-front finds a new request with song data
  ipcMain.on('ytd:video-src-changed', async (_, data: GetPlayerResponse) => {
    const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(
      async () => {
        songInfo = await handleData(data, win);
        return songInfo;
      },
    );

    if (tempSongInfo) {
      for (const c of callbacks) {
        c(tempSongInfo, SongInfoEvent.VideoSrcChanged);
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
      const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(() => {
        if (!songInfo) {
          return null;
        }

        songInfo.isPaused = isPaused;
        songInfo.elapsedSeconds = elapsedSeconds;

        return songInfo;
      });

      if (tempSongInfo) {
        for (const c of callbacks) {
          c(tempSongInfo, SongInfoEvent.PlayOrPaused);
        }
      }
    },
  );

  ipcMain.on('ytd:time-changed', async (_, seconds: number) => {
    const tempSongInfo = await dataMutex.runExclusive<SongInfo | null>(() => {
      if (!songInfo) {
        return null;
      }

      songInfo.elapsedSeconds = seconds;

      return songInfo;
    });

    if (tempSongInfo) {
      for (const c of callbacks) {
        c(tempSongInfo, SongInfoEvent.TimeChanged);
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
export const setupSongInfo = registerProvider;
