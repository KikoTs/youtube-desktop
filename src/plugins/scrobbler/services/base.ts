import type { ScrobblerPluginConfig } from '../index';
import type { SetConfType } from '../main';
import type { VideoInfo } from '@/providers/video-info';

export abstract class ScrobblerBase {
  public abstract isSessionCreated(config: ScrobblerPluginConfig): boolean;

  public abstract createSession(
    config: ScrobblerPluginConfig,
    setConfig: SetConfType,
  ): Promise<ScrobblerPluginConfig>;

  public abstract setNowPlaying(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    setConfig: SetConfType,
  ): void;

  public abstract addScrobble(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    setConfig: SetConfType,
  ): void;
}
