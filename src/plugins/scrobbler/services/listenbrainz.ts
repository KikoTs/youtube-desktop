import { net } from 'electron';

import { ScrobblerBase } from './base';

import type { SetConfType } from '../main';
import type { VideoInfo } from '@/providers/video-info';
import type { ScrobblerPluginConfig } from '../index';

interface ListenbrainzRequestBody {
  listen_type?: string;
  payload: {
    track_metadata?: {
      artist_name?: string;
      track_name?: string;
      release_name?: string;
      additional_info?: {
        media_player?: string;
        submission_client?: string;
        origin_url?: string;
        duration?: number;
      };
    };
    listened_at?: number;
  }[];
}

export class ListenbrainzScrobbler extends ScrobblerBase {
  override isSessionCreated(): boolean {
    return true;
  }

  override createSession(
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): Promise<ScrobblerPluginConfig> {
    return Promise.resolve(config);
  }

  override setNowPlaying(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): void {
    if (
      !config.scrobblers.listenbrainz.apiRoot ||
      !config.scrobblers.listenbrainz.token
    ) {
      return;
    }

    const body = createRequestBody('playing_now', videoInfo);
    submitListen(body, config);
  }

  override addScrobble(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): void {
    if (
      !config.scrobblers.listenbrainz.apiRoot ||
      !config.scrobblers.listenbrainz.token
    ) {
      return;
    }

    const body = createRequestBody('single', videoInfo);
    body.payload[0].listened_at = Math.trunc(Date.now() / 1000);

    submitListen(body, config);
  }
}

function createRequestBody(
  listenType: string,
  videoInfo: VideoInfo,
): ListenbrainzRequestBody {
  const trackMetadata = {
    artist_name: videoInfo.author,
    track_name: videoInfo.title,
    release_name: undefined,
    additional_info: {
      media_player: 'YouTube Desktop App',
      submission_client: 'YouTube Desktop App - Scrobbler Plugin',
      origin_url: videoInfo.url,
      duration: videoInfo.videoDuration,
    },
  };

  return {
    listen_type: listenType,
    payload: [
      {
        track_metadata: trackMetadata,
      },
    ],
  };
}

function submitListen(
  body: ListenbrainzRequestBody,
  config: ScrobblerPluginConfig,
) {
  net
    .fetch(config.scrobblers.listenbrainz.apiRoot + 'submit-listens', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Authorization': 'Token ' + config.scrobblers.listenbrainz.token,
        'Content-Type': 'application/json',
      },
    })
    .catch(console.error);
}
