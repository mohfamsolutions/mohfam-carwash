import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import jsQR from 'jsqr';
await fs.mkdir('public/assets',{recursive:true});
const sources = {
 'hero.jpg':'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2200&q=85',
 'detail.jpg':'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=85',
 'wash.jpg':'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1400&q=85',
 'road.jpg':'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=85',
 'app-qr.png':'https://mohfamsecurity.com/wp-content/uploads/2026/09/mohfam-app-qr-code.png',
 'app-store.png':'https://mohfamsecurity.com/wp-content/uploads/2026/09/download-on-the-app-store-badge.png',
 'app-screen.jpg':'https://mohfamsecurity.com/wp-content/uploads/2026/09/mohfam-app-home-screen-473x1024.jpg'
};
await Promise.all(Object.entries(sources).map(async ([file,url])=>{
 try {await fs.access('public/assets/'+file);} catch {const response=await fetch(url);if(!response.ok)throw new Error(`${file}: ${response.status}`);await fs.writeFile('public/assets/'+file,Buffer.from(await response.arrayBuffer()));}
 console.log(file,(await sharp('public/assets/'+file).metadata()).format);
}));
// The already approved shared font and license are read from the sibling project, never modified.
const dir='../mohfam-poolcleaning/public/assets';
for(const name of await fs.readdir(dir)) if(/\.woff2$|(?:license|ofl)/i.test(name)) await fs.copyFile(path.join(dir,name),path.join('public/assets',name));
const qr=await fs.readFile('public/assets/app-qr.png');
const hash=crypto.createHash('sha256').update(qr).digest('hex');
if(hash!=='9ce2fe3736a5a2b074e25c2de98ce6f7185223502dbfe904db910f757aa66214') throw new Error('Approved QR bytes changed');
const {data,info}=await sharp(qr).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
if(decoded?.data!=='https://apps.apple.com/app/id6793692825')throw new Error('Unexpected QR destination');
await fs.writeFile('data/asset-sources.json',JSON.stringify({sources,qrSHA256:hash,qrDestination:decoded.data,photoUse:'Illustrative stock, not customer work',font:'Inter, SIL Open Font License; copied with license from local Pool Cleaning source'},null,2));
console.log('Exact Security QR verified by SHA-256 and decoded destination.');
