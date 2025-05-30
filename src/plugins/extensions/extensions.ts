import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const extensionsList: { name: string, url: string }[] = [
    // Direct download URLs (ZIP files):
    // { name: 'SponsorBlock', url: 'https://github.com/ajayyy/SponsorBlock/releases/download/5.9.6/ChromeExtension.zip' },
    // { name: 'uBlockOrigin', url: 'https://github.com/gorhill/uBlock/releases/download/1.61.0/uBlock0_1.61.0.chromium.zip' },
    // { name: 'DeArrow', url: 'https://github.com/ajayyy/DeArrow/releases/download/1.9.3/ChromeExtension.zip' },
    // { name: 'Shorts Blocker', url: 'https://github.com/paullyy8/shorts-blocker/archive/refs/heads/main.zip' },
    
    // Chrome Web Store URLs (also supported - both old and new formats):
    // { name: 'uBlock Origin', url: 'https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm' },
    // { name: 'uBlock Origin (new)', url: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm' },
    // { name: 'SponsorBlock', url: 'https://chrome.google.com/webstore/detail/sponsorblock-for-youtube/mnjggcdmjocbbbhaepdhchncahnbgone' },
    // { name: 'Return YouTube Dislike', url: 'https://chromewebstore.google.com/detail/return-youtube-dislike/gebbhagfogifgggkldgodflihgfeippi' },
  ];

export function getLocalExtensions(){
    const extensionDirectory = path.join(app.getPath('userData'), 'Extensions');
    if (!fs.existsSync(extensionDirectory)) {
      fs.mkdirSync(extensionDirectory);
    }

    const directories = fs
      .readdirSync(extensionDirectory, { withFileTypes: true })
      .filter((dir) => dir.isDirectory())
      .map((dir) => dir.name);

    return {
        extensionDirectory,
        directories,
    };
}

export function getRemoteExtensions(){

    return {
        extensionsList,
    };

}