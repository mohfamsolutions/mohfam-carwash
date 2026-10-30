import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {pages,site} from '../data/site.mjs';
const titles=new Set(),descriptions=new Set(),routes=new Set(pages.filter(p=>p.key!=='404').map(p=>p.path));let linkCount=0;
for(const p of pages){const html=await fs.readFile(p.key==='404'?'dist/404.html':path.join('dist',p.path,'index.html'),'utf8');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,p.key+' H1');
 const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/name="description" content="([^"]+)"/)[1];assert(!titles.has(title));assert(!descriptions.has(description));titles.add(title);descriptions.add(description);
 assert(html.includes(`rel="canonical" href="${site.origin+p.path}"`));assert(html.includes('content="noindex,nofollow"'));
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(schema['@graph'].length,4);assert(!/LocalBusiness|AggregateRating|"@type":"Service"/.test(JSON.stringify(schema)));
 for(const match of html.matchAll(/(?:src|href)="(\/[^"#]*)(#[^"]*)?"/g)){let url=match[1];if(url.startsWith('/assets/')||['/styles.css','/app.js'].includes(url))await fs.access('dist'+url);else assert(routes.has(url),p.key+': broken route '+url);if(match[2]){const target=await fs.readFile(path.join('dist',url,'index.html'),'utf8');assert(target.includes(`id="${match[2].slice(1)}"`),'missing anchor '+match[0]);}linkCount++;}
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,p.key+' duplicate ID');for(const m of html.matchAll(/aria-controls="([^"]+)"/g))assert(ids.includes(m[1]));
 const file=`dist/assets/social/${p.key}.jpg`,meta=await sharp(file).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);assert((await fs.stat(file)).size<300000);
 for(const property of ['og:image:width','og:image:height','og:image:type','og:image:alt','twitter:image:alt'])assert(html.includes(property));
}
const sitemap=await fs.readFile('dist/sitemap.xml','utf8');assert.equal((sitemap.match(/<url>/g)||[]).length,routes.size);assert(!sitemap.includes('/404/'));assert(sitemap.includes('xmlns:image'));assert.equal(await fs.readFile('dist/robots.txt','utf8'),'User-agent: *\nDisallow: /\n');
const qr=await fs.readFile('dist/assets/app-qr.png');assert.equal(crypto.createHash('sha256').update(qr).digest('hex'),'9ce2fe3736a5a2b074e25c2de98ce6f7185223502dbfe904db910f757aa66214');const {data,info}=await sharp(qr).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(jsQR(new Uint8ClampedArray(data),info.width,info.height).data,site.app);
const logo=await sharp('dist/assets/organization-logo.png').metadata();assert.equal(logo.width,512);assert.equal(logo.height,512);
console.log(`Verified ${pages.length} pages, ${linkCount} internal references, unique metadata/schema, sitemap, noindex, all 1200×630 social images <300KB, logo, exact QR and decoded destination.`);
