import fs from 'fs';
import path from 'path';
import { app, shell, session } from 'electron';

import { createPlugin } from '@/utils';

import { t } from '@/i18n';

import type { BrowserWindow } from 'electron';

interface ExtensionsConfig {
  /**
   * Whether to enable the extensions.
   * @default true
   */
  enabled: boolean;
}



export default createPlugin({
    name: () => t('plugins.extensions.name'),
    description: () => t('plugins.extensions.description'),
    restartNeeded: true,
    config: {
      enabled: true,
    } as ExtensionsConfig,
    menu: async ({ getConfig, setConfig }) => {
      const config = await getConfig();
  
      const extensionDirectory = path.join(app.getPath('userData'), 'Extensions');
      if (!fs.existsSync(extensionDirectory)) {
        fs.mkdirSync(extensionDirectory);
      }
  
      // Read all directories (extensions)
      const directories = fs
        .readdirSync(extensionDirectory, { withFileTypes: true })
        .filter((dir) => dir.isDirectory())
        .map((dir) => dir.name);
  
      return [
        {
          label: t('plugins.extensions.menu.openFolder'),
          click: () => {
            shell.openPath(extensionDirectory);
          },
        },
        {
          label: t('plugins.extensions.menu.activeExtensions'),
          submenu: directories.map((dir) => ({
            label: dir,
            click: () => {
              // Implement opening extension settings
              console.log(`Open settings for extension: ${dir}`);
              shell.openPath(path.join(extensionDirectory, dir));
            },
          })),
        },
      ];
    },
    backend: {
      mainWindow: null as BrowserWindow | null,
      async start({ getConfig, window }) {
        // const config = await getConfig();
        // this.mainWindow = window;
  
        const extensionDirectory = path.join(app.getPath('userData'), 'Extensions');
        if (!fs.existsSync(extensionDirectory)) {
          fs.mkdirSync(extensionDirectory);
        }
  
        // Load extensions from each folder in the Extensions directory
        const directories = fs.readdirSync(extensionDirectory, { withFileTypes: true });
        for (const dir of directories) {
          if (dir.isDirectory()) {
            const extensionPath = path.join(extensionDirectory, dir.name);
            try {
              const extension = await session.defaultSession.loadExtension(extensionPath);
              extension.id; // use the extension id to interact with it
              console.log(`Loaded extension: ${extensionPath}`);
            } catch (error) {
              console.error(`Failed to load extension at ${extensionPath}:`, error);
            }
          }
        }
      },
      stop({ window }) {
        console.log('Stopping the plugin...');
      },
      async onConfigChange(newConfig) {
        console.log('Configuration changed:', newConfig);
      },
    },
  });