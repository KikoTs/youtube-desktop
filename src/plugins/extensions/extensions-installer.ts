import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import extract from 'extract-zip';

interface ExtensionInfo {
  name: string;
  url: string;
}

/**
 * Extracts extension ID from Chrome Web Store URL
 * @param url - Chrome Web Store URL
 * @returns Extension ID or null if not a valid store URL
 */
function extractChromeStoreId(url: string): string | null {
  // Handle both old and new Chrome Web Store URL formats
  const oldFormatMatch = url.match(/chrome\.google\.com\/webstore\/detail\/[^\/]+\/([a-z]{32})/i);
  const newFormatMatch = url.match(/chromewebstore\.google\.com\/detail\/[^\/]+\/([a-z]{32})/i);
  
  return oldFormatMatch ? oldFormatMatch[1] : (newFormatMatch ? newFormatMatch[1] : null);
}

/**
 * Checks if URL is a Chrome Web Store URL
 * @param url - URL to check
 * @returns true if it's a Chrome Web Store URL
 */
function isChromeStoreUrl(url: string): boolean {
  return url.includes('chrome.google.com/webstore/detail/') || url.includes('chromewebstore.google.com/detail/');
}

/**
 * Converts Chrome Web Store URL to downloadable CRX URL
 * @param storeUrl - Chrome Web Store URL
 * @returns CRX download URL
 */
function getCrxDownloadUrl(storeUrl: string): string | null {
  const extensionId = extractChromeStoreId(storeUrl);
  if (!extensionId) return null;
  
  // Use Chrome's update service to get the CRX file
  const chromeVersion = '120.0.0.0'; // Use a recent Chrome version
  return `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${chromeVersion}&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
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
  
  let downloadUrl = extension.url;
  let isFromChromeStore = false;
  
  // Check if it's a Chrome Web Store URL and convert it
  if (isChromeStoreUrl(extension.url)) {
    const crxUrl = getCrxDownloadUrl(extension.url);
    if (!crxUrl) {
      throw new Error(`Failed to extract extension ID from Chrome Web Store URL: ${extension.url}`);
    }
    downloadUrl = crxUrl;
    isFromChromeStore = true;
    console.log(`Converted Chrome Web Store URL to CRX download URL: ${downloadUrl}`);
  }

  const fileExtension = isFromChromeStore ? 'crx' : 'zip';
  const tempFilePath = path.join(app.getPath('temp'), `${extension.name}.${fileExtension}`);

  try {
    // Download the extension file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ${extension.name}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    if (isFromChromeStore) {
      // Handle CRX files - we need to extract them differently
      await extractCrxFile(tempFilePath, extensionPath);
    } else {
      // Handle ZIP files
      await extract(tempFilePath, { dir: extensionPath });
    }
    
    console.log(`Extension ${extension.name} installed successfully.`);
  } catch (error) {
    console.error(`Failed to install extension ${extension.name}:`, error);
    throw error;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath); // Clean up the temporary file
    }
  }
}

/**
 * Extracts a CRX file (Chrome extension format)
 * @param crxPath - Path to the CRX file
 * @param extractPath - Path to extract the extension to
 */
async function extractCrxFile(crxPath: string, extractPath: string): Promise<void> {
  const crxBuffer = fs.readFileSync(crxPath);
  
  // CRX files have a header that we need to skip
  // CRX3 format: "Cr24" + header length (4 bytes) + header + ZIP data
  const magic = crxBuffer.toString('ascii', 0, 4);
  
  if (magic !== 'Cr24') {
    throw new Error('Invalid CRX file format');
  }
  
  // Read header length (bytes 8-12, little endian)
  const headerLength = crxBuffer.readUInt32LE(8);
  
  // Skip the CRX header to get to the ZIP data
  const zipStart = 12 + headerLength;
  const zipBuffer = crxBuffer.slice(zipStart);
  
  // Write the ZIP data to a temporary file and extract it
  const tempZipPath = crxPath.replace('.crx', '.zip');
  fs.writeFileSync(tempZipPath, zipBuffer);
  
  try {
    await extract(tempZipPath, { dir: extractPath });
  } finally {
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
  }
}
