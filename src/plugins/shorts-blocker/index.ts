import { createPlugin } from '@/utils';
import { t } from '@/i18n';
import { BrowserWindow } from 'electron';

// CSS to hide YouTube Shorts
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
    backend: {
        mainWindow: null as BrowserWindow | null,
        async start({ window }) {
            this.mainWindow = window;
            if (this.mainWindow) {
                await this.mainWindow.webContents.insertCSS(blockerStyle);
            }
        },
        async stop() {
            if (this.mainWindow) {
                // Remove the CSS when plugin is stopped
                await this.mainWindow.webContents.insertCSS(blockerStyle);
            }
        },
    },
    renderer: {
        async onConfigChange(newConfig) {
            if (newConfig.enabled) {
                const style = document.createElement('style');
                style.id = 'shorts-blocker';
                style.textContent = blockerStyle;
                document.head.appendChild(style);
            } else {
                const style = document.getElementById('shorts-blocker');
                if (style) {
                    style.remove();
                }
            }
        }
    }
});