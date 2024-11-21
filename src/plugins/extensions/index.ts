
import { shell, session } from 'electron';
import { createPlugin } from '@/utils';
import { installExtension } from './extensions-installer';
import { getLocalExtensions, getRemoteExtensions } from './extensions';
import path from 'path';
import type { BrowserWindow } from 'electron';

interface ExtensionsConfig {
  enabled: boolean;
}



export default createPlugin({
  name: () => 'Extensions',
  description: () => 'Load custom extensions from the Extensions folder',
  restartNeeded: true,
  config: {
    enabled: true,
  } as ExtensionsConfig,
  menu: async ({ setConfig }) => {
    const { extensionDirectory, directories } = getLocalExtensions();
    const { extensionsList } = getRemoteExtensions();

    return [
      {
        label: 'Open Extensions Folder',
        click: () => {
          shell.openPath(extensionDirectory);
        },
      },
      {
        label: 'Active Extensions',
        submenu: directories.map((dir) => ({
          label: dir,
          click: () => {
            console.log(`Open settings for extension: ${dir}`);
          },
        })),
      },
      {
        label: 'Install Extension',
        submenu: extensionsList.filter(ext => !directories.includes(ext.name)).map((ext) => ({
          label: ext.name,
          click: async () => {
            await installExtension(ext);
            await setConfig({ enabled: true });
          },
        })),
      },
    ];
  },
  backend: {
    mainWindow: null as BrowserWindow | null,
    async start() {
      const { extensionDirectory, directories } = getLocalExtensions();

      for (const dir of directories) {
        const extensionPath = path.join(extensionDirectory, dir);
        try {
          const extension = await session.defaultSession.loadExtension(extensionPath);
          extension.id;
          console.log(`Loaded extension: ${extensionPath}`);
        } catch (error) {
          console.error(`Failed to load extension at ${extensionPath}:`, error);
        }
      }
    },
    stop() {
      console.log('Stopping the plugin...');
    },
    async onConfigChange(newConfig) {
      console.log('Configuration changed:', newConfig);
    },
  },
});
