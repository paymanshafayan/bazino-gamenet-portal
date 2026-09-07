/** --ignore-scripts installs need the same executable-bit repair as the package install step. */
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
if(process.platform!=='win32')for(const name of ['@ffprobe-installer/ffprobe','@ffmpeg-installer/ffmpeg']){
 try{const bin=require(name).path;fs.chmodSync(bin,0o755);}catch(e){if(name==='@ffprobe-installer/ffprobe')throw e;}
}
