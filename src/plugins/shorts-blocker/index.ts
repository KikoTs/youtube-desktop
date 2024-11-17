import { createPlugin } from '@/utils';
import { t } from '@/i18n';

const blockerStyle = `
  ytd-mini-guide-entry-renderer[aria-label="Shorts"],
  ytd-guide-entry-renderer[aria-label="Shorts"],
  ytd-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-reel-video-renderer,
  ytd-rich-grid-row[is-shorts],
  ytd-rich-section-renderer[is-shorts] {
    display: none !important;
  }
`;

export default createPlugin({
    name: () => t('plugins.shorts-blocker.name'),
    description: () => t('plugins.shorts-blocker.description'),
    restartNeeded: false,
    config: {
        enabled: true,
    },
    // backend: {
    //     async start({ window }) {
    //         if (window && window.webContents) {
    //             try {
    //                 await window.webContents.insertCSS(blockerStyle);
    //             } catch (error) {
    //                 console.error('Failed to insert CSS:', error);
    //             }
    //         }
    //     },
    //     async stop({ window }) {
    //         if (window && window.webContents) {
    //             try {
    //                 await window.webContents.removeInsertedCSS(blockerStyle);
    //             } catch (error) {
    //                 console.error('Failed to remove CSS:', error);
    //             }
    //         }
    //     }
    // }
});