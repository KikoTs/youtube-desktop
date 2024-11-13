export interface GetPlayerResponse {
  responseContext: ResponseContext;
  playabilityStatus: PlayabilityStatus;
  streamingData: StreamingData;
  heartbeatParams: HeartbeatParams;
  playbackTracking: PlaybackTracking;
  captions: Captions;
  videoDetails: GetPlayerResponseVideoDetails;
  playerConfig: PlayerConfig;
  storyboards: Storyboards;
  microformat: Microformat;
  trackingParams: string;
  attestation: Attestation;
  endscreen: Endscreen;
  adBreakHeartbeatParams: string;
}

export interface Attestation {
  playerAttestationRenderer: PlayerAttestationRenderer;
}

export interface PlayerAttestationRenderer {
  challenge: string;
  botguardData: BotguardData;
}

export interface BotguardData {
  program: string;
  interpreterSafeUrl: InterpreterSafeURL;
  serverEnvironment: number;
}

export interface InterpreterSafeURL {
  privateDoNotAccessOrElseTrustedResourceUrlWrappedValue: string;
}

export interface Captions {
  playerCaptionsTracklistRenderer: PlayerCaptionsTracklistRenderer;
}

export interface PlayerCaptionsTracklistRenderer {
  captionTracks: CaptionTrack[];
  audioTracks: AudioTrack[];
  translationLanguages: TranslationLanguage[];
  defaultAudioTrackIndex: number;
}

export interface AudioTrack {
  captionTrackIndices: number[];
}

export interface CaptionTrack {
  baseUrl: string;
  name: Name;
  vssId: string;
  languageCode: string;
  kind: string;
  isTranslatable: boolean;
}

export interface Name {
  runs: Run[];
}

export interface Run {
  text: string;
}

export interface TranslationLanguage {
  languageCode: string;
  languageName: Name;
}

export interface Endscreen {
  endscreenRenderer: EndscreenRenderer;
}

export interface EndscreenRenderer {
  elements: Element[];
  startMs: string;
  trackingParams: string;
}

export interface Element {
  endscreenElementRenderer: EndscreenElementRenderer;
}

export interface EndscreenElementRenderer {
  style: string;
  image: ImageClass;
  left: number;
  width: number;
  top: number;
  aspectRatio: number;
  startMs: string;
  endMs: string;
  title: Title;
  metadata: Name;
  endpoint: Endpoint;
  trackingParams: string;
  id: string;
  thumbnailOverlays: ThumbnailOverlay[];
}

export interface Endpoint {
  clickTrackingParams: string;
  commandMetadata: CommandMetadata;
  watchEndpoint: WatchEndpoint;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandMetadata {}

export interface WatchEndpoint {
  videoId: string;
}

export interface ImageClass {
  thumbnails: ThumbnailElement[];
}

export interface ThumbnailElement {
  url: string;
  width: number;
  height: number;
}

export interface ThumbnailOverlay {
  thumbnailOverlayTimeStatusRenderer: ThumbnailOverlayTimeStatusRenderer;
}

export interface ThumbnailOverlayTimeStatusRenderer {
  text: Title;
  style: string;
}

export interface Title {
  runs: Run[];
  accessibility: Accessibility;
}

export interface Accessibility {
  accessibilityData: AccessibilityData;
}

export interface AccessibilityData {
  label: string;
}

export interface HeartbeatParams {
  heartbeatToken: string;
  intervalMilliseconds: string;
  maxRetries: string;
  drmSessionId: string;
  softFailOnError: boolean;
  heartbeatServerData: string;
}

export interface Microformat {
  playerMicroformatRenderer: MicroformatDataRenderer;
}

export interface MicroformatDataRenderer {
  title: VideoTitle; // okay 
  description: VideoDescription; // okay
  thumbnail: ImageClass; // okay
  embed: VideoEmbed; // okay
  availableCountries: string[]; // okay
  viewCount: string; // okay
  publishDate: string; // okay
  category: string; // okay
  uploadDate: string; // okay
  isShortsEligible: boolean; // okay
  hasYpcMetadata: boolean; // okay
  isUnlisted: boolean; // okay
  isFamilySafe: boolean; // okay
  externalChannelId: string; // okay
  ownerProfileUrl: string; // okay
  lengthSeconds: number; // okay
  liveBroadcastDetails?: LiveBroadcastDetails; // okay
}
export interface VideoEmbed {
  iframeUrl: string;
  width: number;
  height: number;
}
export interface VideoTitle {
  simpleText: string;
}
export interface VideoDescription {
  simpleText: string;
}
export interface LiveBroadcastDetails {
  isLiveNow: boolean;
  startTimestamp: string;
  endTimestamp?: string;
}
export interface LinkAlternate {
  hrefUrl: string;
  title?: string;
  alternateType?: string;
}

export interface PageOwnerDetails {
  name: string;
  externalChannelId: string;
  youtubeProfileUrl: string;
}

export interface MicroformatDataRendererVideoDetails {
  externalVideoId: string;
  durationSeconds: string;
  durationIso8601: string;
}

export interface PlayabilityStatus {
  status: string;
  playableInEmbed: boolean;
  audioOnlyPlayability: AudioOnlyPlayability;
  miniplayer: Miniplayer;
  contextParams: string;
  transportControlsConfig?: TransportControlsConfig;
}

type ReplaceDefaultType = {
  replaceDefault: boolean;
};

export interface TransportControlsConfig {
  seekForwardStatus: ReplaceDefaultType;
  seekBackwardStatus: ReplaceDefaultType;
  playbackRateStatus: ReplaceDefaultType;
}

export interface AudioOnlyPlayability {
  audioOnlyPlayabilityRenderer: AudioOnlyPlayabilityRenderer;
}

export interface AudioOnlyPlayabilityRenderer {
  trackingParams: string;
  audioOnlyAvailability: string;
}

export interface Miniplayer {
  miniplayerRenderer: MiniplayerRenderer;
}

export interface MiniplayerRenderer {
  playbackMode: string;
}

export interface PlaybackTracking {
  videostatsPlaybackUrl: PtrackingURLClass;
  videostatsDelayplayUrl: AtrURLClass;
  videostatsWatchtimeUrl: PtrackingURLClass;
  ptrackingUrl: PtrackingURLClass;
  qoeUrl: PtrackingURLClass;
  atrUrl: AtrURLClass;
  videostatsScheduledFlushWalltimeSeconds: number[];
  videostatsDefaultFlushIntervalSeconds: number;
  googleRemarketingUrl: AtrURLClass;
}

export interface AtrURLClass {
  baseUrl: string;
  elapsedMediaTimeSeconds: number;
  headers: Header[];
}

export interface Header {
  headerType: HeaderType;
}

export enum HeaderType {
  PlusPageID = 'PLUS_PAGE_ID',
  UserAuth = 'USER_AUTH',
  VisitorID = 'VISITOR_ID',
}

export interface PtrackingURLClass {
  baseUrl: string;
  headers: Header[];
}

export interface PlayerConfig {
  audioConfig: AudioConfig;
  streamSelectionConfig: StreamSelectionConfig;
  mediaCommonConfig: MediaCommonConfig;
  webPlayerConfig: WebPlayerConfig;
}

export interface AudioConfig {
  loudnessDb: number;
  perceptualLoudnessDb: number;
  enablePerFormatLoudness: boolean;
}

export interface MediaCommonConfig {
  dynamicReadaheadConfig: DynamicReadaheadConfig;
}

export interface DynamicReadaheadConfig {
  maxReadAheadMediaTimeMs: number;
  minReadAheadMediaTimeMs: number;
  readAheadGrowthRateMs: number;
}

export interface StreamSelectionConfig {
  maxBitrate: string;
}

export interface WebPlayerConfig {
  useCobaltTvosDash: boolean;
  webPlayerActionsPorting: WebPlayerActionsPorting;
  gatewayExperimentGroup: string;
}

export interface WebPlayerActionsPorting {
  subscribeCommand: SubscribeCommand;
  unsubscribeCommand: UnsubscribeCommand;
  addToWatchLaterCommand: AddToWatchLaterCommand;
  removeFromWatchLaterCommand: RemoveFromWatchLaterCommand;
}

export interface AddToWatchLaterCommand {
  clickTrackingParams: string;
  playlistEditEndpoint: AddToWatchLaterCommandPlaylistEditEndpoint;
}

export interface AddToWatchLaterCommandPlaylistEditEndpoint {
  playlistId: string;
  actions: PurpleAction[];
}

export interface PurpleAction {
  addedVideoId: string;
  action: string;
}

export interface RemoveFromWatchLaterCommand {
  clickTrackingParams: string;
  playlistEditEndpoint: RemoveFromWatchLaterCommandPlaylistEditEndpoint;
}

export interface RemoveFromWatchLaterCommandPlaylistEditEndpoint {
  playlistId: string;
  actions: FluffyAction[];
}

export interface FluffyAction {
  action: string;
  removedVideoId: string;
}

export interface SubscribeCommand {
  clickTrackingParams: string;
  subscribeEndpoint: SubscribeEndpoint;
}

export interface SubscribeEndpoint {
  channelIds: string[];
  params: string;
}

export interface UnsubscribeCommand {
  clickTrackingParams: string;
  unsubscribeEndpoint: SubscribeEndpoint;
}

export interface ResponseContext {
  serviceTrackingParams: ServiceTrackingParam[];
  maxAgeSeconds: number;
}

export interface ServiceTrackingParam {
  service: string;
  params: Param[];
}

export interface Param {
  key: string;
  value: string;
}

export interface Storyboards {
  playerStoryboardSpecRenderer: PlayerStoryboardSpecRenderer;
}

export interface PlayerStoryboardSpecRenderer {
  spec: string;
  recommendedLevel: number;
}

export interface StreamingData {
  expiresInSeconds: string;
  formats: Format[];
  adaptiveFormats: AdaptiveFormat[];
}

export interface AdaptiveFormat {
  itag: number;
  mimeType: string;
  bitrate: number;
  width?: number;
  height?: number;
  initRange: Range;
  indexRange: Range;
  lastModified: string;
  contentLength: string;
  quality: string;
  fps?: number;
  qualityLabel?: string;
  projectionType: ProjectionType;
  averageBitrate: number;
  approxDurationMs: string;
  signatureCipher: string;
  colorInfo?: ColorInfo;
  highReplication?: boolean;
  audioQuality?: string;
  audioSampleRate?: string;
  audioChannels?: number;
  loudnessDb?: number;
}

export interface ColorInfo {
  primaries: string;
  transferCharacteristics: string;
}

export interface Range {
  start: string;
  end: string;
}

export enum ProjectionType {
  Rectangular = 'RECTANGULAR',
}

export interface Format {
  itag: number;
  mimeType: string;
  bitrate: number;
  width: number;
  height: number;
  lastModified: string;
  quality: string;
  fps: number;
  qualityLabel: string;
  projectionType: ProjectionType;
  audioQuality: string;
  approxDurationMs: string;
  audioSampleRate: string;
  audioChannels: number;
  signatureCipher: string;
}

export interface GetPlayerResponseVideoDetails {
  videoId: string;
  title: string;
  lengthSeconds: string;
  channelId: string;
  isOwnerViewing: boolean;
  isCrawlable: boolean;
  thumbnail: ImageClass;
  allowRatings: boolean;
  viewCount: string;
  author: string;
  isPrivate: boolean;
  isUnpluggedCorpus: boolean;
  musicVideoType: string;
  isLiveContent: boolean;
  elapsedSeconds: number;
  isPaused: boolean;

  // youtube-music only
  album?: string | null;
}
