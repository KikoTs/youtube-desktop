import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import extract from 'extract-zip';

interface ExtensionInfo {
  name: string;
  url: string;
}

/**
 * Downloads and installs an extension from a given URL.
 * @param extension - The extension info (name and download URL).
 */
export async function installExtension(extension: ExtensionInfo): Promise<void> {
  const extensionDirectory = path.join(app.getPath('userData'), 'Extensions');
  if (!fs.existsSync(extensionDirectory)) {
    fs.mkdirSync(extensionDirectory);
  }

  const extensionPath = path.join(extensionDirectory, extension.name);
  if (fs.existsSync(extensionPath)) {
    console.log(`Extension ${extension.name} is already installed.`);
    return;
  }

  console.log(`Installing extension: ${extension.name} from ${extension.url}`);
  const tempZipPath = path.join(app.getPath('temp'), `${extension.name}.zip`);

  try {
    // Download the extension zip
    const response = await fetch(extension.url);
    if (!response.ok) {
      throw new Error(`Failed to download ${extension.name}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempZipPath, Buffer.from(buffer));

    // Extract the extension zip
    await extract(tempZipPath, { dir: extensionPath });
    console.log(`Extension ${extension.name} installed successfully.`);
  } catch (error) {
    console.error(`Failed to install extension ${extension.name}:`, error);
  } finally {
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath); // Clean up the temporary zip file
    }
  }
}
