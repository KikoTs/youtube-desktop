import { shell, session, dialog, BrowserWindow, ipcMain, clipboard } from 'electron';
import { createPlugin } from '@/utils';
import { installExtension } from './extensions-installer';
import { getLocalExtensions, getRemoteExtensions } from './extensions';
import path from 'path';
import fs from 'fs';

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
        label: 'Install from Chrome Web Store URL',
        click: async () => {
          try {
            // Simple approach: Ask user to copy URL to clipboard first
            const result = await dialog.showMessageBox({
              type: 'info',
              title: 'Install Extension from Chrome Web Store',
              message: 'Install Chrome Extension',
              detail: 'Step 1: Copy the Chrome Web Store URL to your clipboard\nStep 2: Click OK to install\n\nExample URLs:\nhttps://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm\nhttps://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
              buttons: ['Cancel', 'Install from Clipboard'],
              defaultId: 1,
              cancelId: 0,
            });

            if (result.response === 1) {
              const clipboardText = clipboard.readText().trim();
              
              if (!clipboardText) {
                dialog.showErrorBox('No URL Found', 'No text found in clipboard. Please copy a Chrome Web Store URL first.');
                return;
              }

              if (!clipboardText.includes('chrome.google.com/webstore/detail/') && !clipboardText.includes('chromewebstore.google.com/detail/')) {
                dialog.showErrorBox(
                  'Invalid URL', 
                  'The clipboard does not contain a valid Chrome Web Store URL.\n\nSupported formats:\nhttps://chrome.google.com/webstore/detail/extension-name/abcdefghijklmnopqrstuvwxyz123456\nhttps://chromewebstore.google.com/detail/extension-name/abcdefghijklmnopqrstuvwxyz123456'
                );
                return;
              }

              // Extract extension name from URL
              const urlParts = clipboardText.split('/');
              const extensionName = urlParts[5] || 'Extension';
              
              // Show confirmation with the URL
              const confirmResult = await dialog.showMessageBox({
                type: 'question',
                title: 'Confirm Installation',
                message: `Install "${extensionName}"?`,
                detail: `URL: ${clipboardText}\n\nThis will download and install the extension.`,
                buttons: ['Cancel', 'Install'],
                defaultId: 1,
                cancelId: 0,
              });

              if (confirmResult.response === 1) {
                try {
                  await installExtension({ 
                    name: extensionName, 
                    url: clipboardText 
                  });
                  await setConfig({ enabled: true });
                  
                  dialog.showMessageBox({
                    type: 'info',
                    title: 'Installation Complete',
                    message: `Extension "${extensionName}" installed successfully!`,
                    detail: 'The extension will be loaded when you restart the application.',
                  });
                } catch (installError) {
                  dialog.showErrorBox('Installation Failed', `Failed to install extension: ${installError instanceof Error ? installError.message : String(installError)}`);
                }
              }
            }
          } catch (error) {
            console.error('Failed to install extension:', error);
            dialog.showErrorBox('Error', `An error occurred: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
      },
      {
        label: 'Active Extensions',
        submenu: directories.length > 0 ? directories.map((dir) => ({
          label: dir,
          submenu: [
            {
              label: '📁 Open Extension Folder',
              click: () => {
                const extensionPath = path.join(extensionDirectory, dir);
                shell.openPath(extensionPath);
              },
            },
            {
              label: '📋 Show Extension Details',
              click: async () => {
                const extensionPath = path.join(extensionDirectory, dir);
                const manifestPath = path.join(extensionPath, 'manifest.json');
                
                try {
                  if (fs.existsSync(manifestPath)) {
                    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestContent) as {
                      name?: string;
                      version?: string;
                      description?: string;
                      permissions?: string[];
                    };
                    
                    await dialog.showMessageBox({
                      type: 'info',
                      title: `Extension Details: ${dir}`,
                      message: `${manifest.name || dir}`,
                      detail: `Version: ${manifest.version || 'Unknown'}\n` +
                             `Description: ${manifest.description || 'No description'}\n` +
                             `Permissions: ${manifest.permissions ? manifest.permissions.join(', ') : 'None'}\n` +
                             `Path: ${extensionPath}`,
                    });
                  } else {
                    await dialog.showMessageBox({
                      type: 'warning',
                      title: 'Extension Details',
                      message: `Extension: ${dir}`,
                      detail: `No manifest.json found\nPath: ${extensionPath}`,
                    });
                  }
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to read extension details: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            },
            {
              label: '🔄 Reload Extension',
              click: async () => {
                try {
                  // This would require restarting the app to reload extensions
                  const result = await dialog.showMessageBox({
                    type: 'question',
                    title: 'Reload Extension',
                    message: `Reload "${dir}"?`,
                    detail: 'This will restart the application to reload all extensions.',
                    buttons: ['Cancel', 'Restart App'],
                    defaultId: 1,
                    cancelId: 0,
                  });
                  
                  if (result.response === 1) {
                    const { app } = require('electron');
                    app.relaunch();
                    app.exit();
                  }
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to reload extension: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            },
            {
              label: '🔍 Validate Extension',
              click: async () => {
                const extensionPath = path.join(extensionDirectory, dir);
                const manifestPath = path.join(extensionPath, 'manifest.json');
                
                try {
                  let isValid = true;
                  let issues: string[] = [];
                  
                  // Check if manifest exists
                  if (!fs.existsSync(manifestPath)) {
                    isValid = false;
                    issues.push('Missing manifest.json file');
                  } else {
                    try {
                      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                      const manifest = JSON.parse(manifestContent) as {
                        manifest_version?: number;
                        name?: string;
                        version?: string;
                      };
                      
                      if (!manifest.manifest_version) {
                        issues.push('Missing manifest_version');
                      }
                      if (!manifest.name) {
                        issues.push('Missing extension name');
                      }
                      if (!manifest.version) {
                        issues.push('Missing version');
                      }
                    } catch {
                      isValid = false;
                      issues.push('Invalid manifest.json format');
                    }
                  }
                  
                  await dialog.showMessageBox({
                    type: isValid && issues.length === 0 ? 'info' : 'warning',
                    title: 'Extension Validation',
                    message: `Extension "${dir}" ${isValid && issues.length === 0 ? 'is valid' : 'has issues'}`,
                    detail: issues.length > 0 ? `Issues found:\n• ${issues.join('\n• ')}` : 'Extension appears to be properly formatted.',
                  });
                } catch (error) {
                  dialog.showErrorBox('Validation Error', `Failed to validate extension: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            },
            {
              label: '📊 Extension Size',
              click: async () => {
                try {
                  const extensionPath = path.join(extensionDirectory, dir);
                  const { execSync } = require('child_process');
                  
                  let sizeInfo = 'Unknown';
                  try {
                    // Try to get directory size
                    const stats = fs.statSync(extensionPath);
                    if (stats.isDirectory()) {
                      // Get folder contents count
                      const files = fs.readdirSync(extensionPath, { recursive: true });
                      const fileCount = files.length;
                      sizeInfo = `${fileCount} files/folders`;
                    }
                  } catch {
                    sizeInfo = 'Unable to calculate size';
                  }
                  
                  await dialog.showMessageBox({
                    type: 'info',
                    title: 'Extension Size',
                    message: `Extension: ${dir}`,
                    detail: `Path: ${extensionPath}\nSize: ${sizeInfo}`,
                  });
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to get extension size: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            },
            { type: 'separator' },
            {
              label: '🗑️ Remove Extension',
              click: async () => {
                const result = await dialog.showMessageBox({
                  type: 'warning',
                  title: 'Remove Extension',
                  message: `Remove "${dir}"?`,
                  detail: 'This will permanently delete the extension files. This action cannot be undone.',
                  buttons: ['Cancel', 'Remove'],
                  defaultId: 0,
                  cancelId: 0,
                });
                
                if (result.response === 1) {
                  try {
                    const extensionPath = path.join(extensionDirectory, dir);
                    
                    // Remove the extension directory
                    fs.rmSync(extensionPath, { recursive: true, force: true });
                    
                    await dialog.showMessageBox({
                      type: 'info',
                      title: 'Extension Removed',
                      message: `Extension "${dir}" has been removed successfully.`,
                      detail: 'Restart the application to apply changes.',
                    });
                  } catch (error) {
                    dialog.showErrorBox('Removal Failed', `Failed to remove extension: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }
              },
            },
          ],
        })) : [{
          label: 'No extensions installed',
          enabled: false,
        }],
      },
      {
        label: 'Install Pre-configured Extensions',
        submenu: extensionsList.filter(ext => !directories.includes(ext.name)).length > 0 
          ? extensionsList.filter(ext => !directories.includes(ext.name)).map((ext) => ({
              label: ext.name,
              click: async () => {
                try {
                  await installExtension(ext);
                  await setConfig({ enabled: true });
                  
                  dialog.showMessageBox({
                    type: 'info',
                    title: 'Installation Complete',
                    message: `Extension "${ext.name}" installed successfully!`,
                    detail: 'The extension will be loaded when you restart the application.',
                  });
                } catch (error) {
                  dialog.showErrorBox('Installation Failed', `Failed to install ${ext.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            }))
          : [{
              label: 'No pre-configured extensions available',
              enabled: false,
            }],
      },
      {
        label: 'Extension Actions',
        submenu: await Promise.all(directories.map(async (dir) => {
          const extensionPath = path.join(extensionDirectory, dir);
          const manifestPath = path.join(extensionPath, 'manifest.json');
          
          let manifest: {
            name?: string;
            action?: { default_popup?: string; default_title?: string; default_icon?: any };
            browser_action?: { default_popup?: string; default_title?: string; default_icon?: any };
            page_action?: { default_popup?: string; default_title?: string; default_icon?: any };
            options_page?: string;
            options_ui?: { page?: string };
            permissions?: string[];
            version?: string;
          } = {};
          
          try {
            if (fs.existsSync(manifestPath)) {
              const manifestContent = fs.readFileSync(manifestPath, 'utf8');
              manifest = JSON.parse(manifestContent) as typeof manifest;
            }
          } catch (error) {
            console.error(`Failed to read manifest for ${dir}:`, error);
          }
          
          const extensionName = manifest.name || dir;
          const submenuItems: any[] = [];
          
          // Add extension popup action (like clicking the extension icon in Chrome)
          const action = manifest.action || manifest.browser_action || manifest.page_action;
          if (action?.default_popup) {
            submenuItems.push({
              label: `🔵 ${action.default_title || 'Open Popup'}`,
              click: async () => {
                try {
                  const popupPath = path.join(extensionPath, action.default_popup!);
                  if (fs.existsSync(popupPath)) {
                    // Create a small popup window like Chrome extensions
                    const popupWindow = new BrowserWindow({
                      width: 400,
                      height: 600,
                      resizable: true,
                      minimizable: false,
                      maximizable: false,
                      title: `${extensionName} - Popup`,
                      webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        webSecurity: false, // Allow loading local files
                      },
                    });
                    
                    await popupWindow.loadFile(popupPath);
                    popupWindow.show();
                  } else {
                    dialog.showErrorBox('Popup Not Found', `Popup file not found: ${action.default_popup}`);
                  }
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to open popup: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            });
          }
          
          // Add extension options/settings page
          const optionsPage = manifest.options_page || manifest.options_ui?.page;
          if (optionsPage) {
            submenuItems.push({
              label: '⚙️ Extension Options',
              click: async () => {
                try {
                  const optionsPath = path.join(extensionPath, optionsPage);
                  if (fs.existsSync(optionsPath)) {
                    // Create an options window
                    const optionsWindow = new BrowserWindow({
                      width: 800,
                      height: 600,
                      title: `${extensionName} - Options`,
                      webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        webSecurity: false,
                      },
                    });
                    
                    await optionsWindow.loadFile(optionsPath);
                    optionsWindow.show();
                  } else {
                    dialog.showErrorBox('Options Not Found', `Options page not found: ${optionsPage}`);
                  }
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to open options: ${error instanceof Error ? error.message : String(error)}`);
                }
              },
            });
          }
          
          // Add enable/disable toggle
          submenuItems.push({
            label: '🔄 Toggle Extension',
            click: async () => {
              const result = await dialog.showMessageBox({
                type: 'question',
                title: 'Toggle Extension',
                message: `Toggle "${extensionName}"?`,
                detail: 'This will restart the application to apply changes.',
                buttons: ['Cancel', 'Restart & Toggle'],
                defaultId: 1,
                cancelId: 0,
              });
              
              if (result.response === 1) {
                // For now, we restart the app. In a more advanced implementation,
                // we could maintain an enabled/disabled state
                const { app } = require('electron');
                app.relaunch();
                app.exit();
              }
            },
          });
          
          // Add extension info
          submenuItems.push({
            label: 'ℹ️ Extension Info',
            click: async () => {
              const permissions = manifest.permissions ? manifest.permissions.join(', ') : 'None';
              await dialog.showMessageBox({
                type: 'info',
                title: `${extensionName}`,
                message: `Extension Information`,
                detail: `Name: ${extensionName}\n` +
                       `Version: ${manifest.version || 'Unknown'}\n` +
                       `Permissions: ${permissions}\n` +
                       `Has Popup: ${action?.default_popup ? 'Yes' : 'No'}\n` +
                       `Has Options: ${optionsPage ? 'Yes' : 'No'}\n` +
                       `Path: ${extensionPath}`,
              });
            },
          });
          
          // Add separator and management options
          if (submenuItems.length > 0) {
            submenuItems.push({ type: 'separator' });
          }
          
          submenuItems.push({
            label: '📁 Open Extension Folder',
            click: () => {
              shell.openPath(extensionPath);
            },
          });
          
          submenuItems.push({
            label: '🗑️ Remove Extension',
            click: async () => {
              const result = await dialog.showMessageBox({
                type: 'warning',
                title: 'Remove Extension',
                message: `Remove "${extensionName}"?`,
                detail: 'This will permanently delete the extension files.',
                buttons: ['Cancel', 'Remove'],
                defaultId: 0,
                cancelId: 0,
              });
              
              if (result.response === 1) {
                try {
                  fs.rmSync(extensionPath, { recursive: true, force: true });
                  await dialog.showMessageBox({
                    type: 'info',
                    title: 'Extension Removed',
                    message: `"${extensionName}" has been removed.`,
                    detail: 'Restart the application to apply changes.',
                  });
                } catch (error) {
                  dialog.showErrorBox('Error', `Failed to remove extension: ${error instanceof Error ? error.message : String(error)}`);
                }
              }
            },
          });
          
          return {
            label: `${extensionName}${manifest.version ? ` (v${manifest.version})` : ''}`,
            submenu: submenuItems,
          };
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
