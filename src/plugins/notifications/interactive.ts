import { app, BrowserWindow, Notification } from 'electron';

import playIcon from '@assets/media-icons-black/play.png?asset&asarUnpack';
import pauseIcon from '@assets/media-icons-black/pause.png?asset&asarUnpack';
import nextIcon from '@assets/media-icons-black/next.png?asset&asarUnpack';
import previousIcon from '@assets/media-icons-black/previous.png?asset&asarUnpack';

import { notificationImage, secondsToMinutes, ToastStyles } from './utils';

import getVideoControls from '@/providers/video-controls';
import registerCallback, {
  type VideoInfo,
  VideoInfoEvent,
} from '@/providers/video-info';
import { changeProtocolHandler } from '@/providers/protocol-handler';
import { setTrayOnClick, setTrayOnDoubleClick } from '@/tray';
import { mediaIcons } from '@/types/media-icons';

import type { NotificationsPluginConfig } from './index';
import type { BackendContext } from '@/types/contexts';

let songControls: ReturnType<typeof getVideoControls>;
let savedNotification: Notification | undefined;

type Accessor<T> = () => T;

export default (
  win: BrowserWindow,
  config: Accessor<NotificationsPluginConfig>,
  { ipc: { on, send } }: BackendContext<NotificationsPluginConfig>,
) => {
  const sendNotification = (videoInfo: VideoInfo) => {
    const iconSrc = notificationImage(videoInfo, config());

    savedNotification?.close();

    let icon: string;
    if (typeof iconSrc === 'object') {
      icon = iconSrc.toDataURL();
    } else {
      icon = iconSrc;
    }

    savedNotification = new Notification({
      title: videoInfo.title || 'Playing',
      body: videoInfo.author,
      icon: iconSrc,
      silent: true,
      // https://learn.microsoft.com/en-us/uwp/schemas/tiles/toastschema/schema-root
      // https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/toast-schema
      // https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
      // https://learn.microsoft.com/en-us/uwp/api/windows.ui.notifications.toasttemplatetype
      toastXml: getXml(videoInfo, icon),
    });

    // To fix the notification not closing
    setTimeout(() => savedNotification?.close(), 5000);

    savedNotification.on('close', () => {
      savedNotification = undefined;
    });

    savedNotification.show();
  };

  const getXml = (videoInfo: VideoInfo, iconSrc: string) => {
    switch (config().toastStyle) {
      default:
      case ToastStyles.logo:
      case ToastStyles.legacy: {
        return xmlLogo(videoInfo, iconSrc);
      }

      case ToastStyles.banner_top_custom: {
        return xmlBannerTopCustom(videoInfo, iconSrc);
      }

      case ToastStyles.hero: {
        return xmlHero(videoInfo, iconSrc);
      }

      case ToastStyles.banner_bottom: {
        return xmlBannerBottom(videoInfo, iconSrc);
      }

      case ToastStyles.banner_centered_bottom: {
        return xmlBannerCenteredBottom(videoInfo, iconSrc);
      }

      case ToastStyles.banner_centered_top: {
        return xmlBannerCenteredTop(videoInfo, iconSrc);
      }
    }
  };

  const selectIcon = (kind: keyof typeof mediaIcons): string => {
    switch (kind) {
      case 'play':
        return playIcon;
      case 'pause':
        return pauseIcon;
      case 'next':
        return nextIcon;
      case 'previous':
        return previousIcon;
      default:
        return '';
    }
  };

  const display = (kind: keyof typeof mediaIcons) => {
    if (config().toastStyle === ToastStyles.legacy) {
      return `content="${mediaIcons[kind]}"`;
    }

    return `\
            content="${
              config().toastStyle
                ? ''
                : kind.charAt(0).toUpperCase() + kind.slice(1)
            }"\
            imageUri="file:///${selectIcon(kind)}"
        `;
  };

  const getButton = (kind: keyof typeof mediaIcons) =>
    `<action ${display(
      kind,
    )} activationType="protocol" arguments="youtubemusic://${kind}"/>`;

  const getButtons = (isPaused: boolean) => `\
    <actions>
        ${getButton('previous')}
        ${isPaused ? getButton('play') : getButton('pause')}
        ${getButton('next')}
    </actions>\
`;

  const toast = (content: string, isPaused: boolean) => `\
<toast>
    <audio silent="true" />
    <visual>
        <binding template="ToastGeneric">
            ${content}
        </binding>
    </visual>

    ${getButtons(isPaused)}
</toast>`;

  const xmlImage = (
    { title, author, isPaused }: VideoInfo,
    imgSrc: string,
    placement: string,
  ) =>
    toast(
      `\
            <image id="1" src="${imgSrc}" name="Image" ${placement}/>
            <text id="1">${title}</text>
            <text id="2">${author}</text>\
`,
      isPaused ?? false,
    );

  const xmlLogo = (videoInfo: VideoInfo, imgSrc: string) =>
    xmlImage(videoInfo, imgSrc, 'placement="appLogoOverride"');

  const xmlHero = (videoInfo: VideoInfo, imgSrc: string) =>
    xmlImage(videoInfo, imgSrc, 'placement="hero"');

  const xmlBannerBottom = (videoInfo: VideoInfo, imgSrc: string) =>
    xmlImage(videoInfo, imgSrc, '');

  const xmlBannerTopCustom = (videoInfo: VideoInfo, imgSrc: string) =>
    toast(
      `\
            <image id="1" src="${imgSrc}" name="Image" />
            <text>ㅤ</text>
            <group>
                <subgroup>
                    <text hint-style="body">${videoInfo.title}</text>
                    <text hint-style="captionSubtle">${videoInfo.author}</text>
                </subgroup>
                ${xmlMoreData(videoInfo)}
            </group>\
`,
      videoInfo.isPaused ?? false,
    );

  const xmlMoreData = ({elapsedSeconds, videoDuration }: VideoInfo) => `\
<subgroup hint-textStacking="bottom">
    <text hint-style="captionSubtle" hint-wrap="true" hint-align="right">${secondsToMinutes(
      elapsedSeconds ?? 0,
    )} / ${secondsToMinutes(videoDuration)}</text>
</subgroup>\
`;

  const xmlBannerCenteredBottom = (
    { title, author, isPaused }: VideoInfo,
    imgSrc: string,
  ) =>
    toast(
      `\
            <text>ㅤ</text>
            <group>
                <subgroup hint-weight="1" hint-textStacking="center">
                    <text hint-align="center" hint-style="${titleFontPicker(
                      title,
                    )}">${title}</text>
                    <text hint-align="center" hint-style="SubtitleSubtle">${author}</text>
                </subgroup>
            </group>
            <image id="1" src="${imgSrc}" name="Image"  hint-removeMargin="true" />\
`,
      isPaused ?? false,
    );

  const xmlBannerCenteredTop = (
    { title, author, isPaused }: VideoInfo,
    imgSrc: string,
  ) =>
    toast(
      `\
            <image id="1" src="${imgSrc}" name="Image" />
            <text>ㅤ</text>
            <group>
                <subgroup hint-weight="1" hint-textStacking="center">
                    <text hint-align="center" hint-style="${titleFontPicker(
                      title,
                    )}">${title}</text>
                    <text hint-align="center" hint-style="SubtitleSubtle">${author}</text>
                </subgroup>
            </group>\
`,
      isPaused ?? false,
    );

  const titleFontPicker = (title: string) => {
    if (title.length <= 13) {
      return 'Header';
    }

    if (title.length <= 22) {
      return 'Subheader';
    }

    if (title.length <= 26) {
      return 'Title';
    }

    return 'Subtitle';
  };

  songControls = getVideoControls(win);

  let currentSeconds = 0;
  on('ytd:player-api-loaded', () => send('ytd:setup-time-changed-listener'));

  let savedVideoInfo: VideoInfo;
  let lastUrl: string | undefined;

  // Register videoInfoCallback
  registerCallback((videoInfo, event) => {
    if (event === VideoInfoEvent.TimeChanged) {
      currentSeconds = videoInfo.elapsedSeconds ?? 0;
    }
    if (!videoInfo.author && !videoInfo.title) {
      return;
    }

    savedVideoInfo = { ...videoInfo };
    if (
      !videoInfo.isPaused &&
      (videoInfo.url !== lastUrl || config().unpauseNotification)
    ) {
      lastUrl = videoInfo.url;
      sendNotification(videoInfo);
    }
  });

  if (config().trayControls) {
    setTrayOnClick(() => {
      if (savedNotification) {
        savedNotification.close();
        savedNotification = undefined;
      } else if (savedVideoInfo) {
        sendNotification({
          ...savedVideoInfo,
          elapsedSeconds: currentSeconds,
        });
      }
    });

    setTrayOnDoubleClick(() => {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
    });
  }

  app.once('before-quit', () => {
    savedNotification?.close();
  });

  changeProtocolHandler((cmd, args) => {
    if (Object.keys(songControls).includes(cmd)) {
      songControls[cmd as keyof typeof songControls](args as never);
      if (
        config().refreshOnPlayPause &&
        (cmd === 'pause' || (cmd === 'play' && !config().unpauseNotification))
      ) {
        setImmediate(() =>
          sendNotification({
            ...savedVideoInfo,
            isPaused: cmd === 'pause',
            elapsedSeconds: currentSeconds,
          }),
        );
      }
    }
  });
};
