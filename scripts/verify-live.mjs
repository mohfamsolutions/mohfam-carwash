import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pages,site} from '../data/site.mjs';
const checks=[];
for(const page of pages){if(page.key==='404')continue;
 const r=await fetch(site.origin+page.path,{redirect:'error'});assert.equal(r.status,200,page.path);const html=await r.text();
 assert(html.includes(`rel="canonical" href="${site.origin+page.path}"`));assert(html.includes('content="index,follow"'));assert(!html.includes('LOCAL PREVIEW'));assert(!r.headers.get('x-robots-tag')?.includes('noindex'));
 assert(r.headers.get('content-security-policy'));
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(schema['@graph'].length,4);
 checks.push(page.path+' metadata, schema, indexability and security headers');
}
for(const path of ['/assets/logo.svg','/assets/organization-logo.png','/assets/app-qr.png','/assets/inter.woff2','/assets/hero.jpg','/styles.css','/app.js',...pages.map(p=>`/assets/social/${p.key}.jpg`)])assert.equal((await fetch(site.origin+path)).status,200,path);
for(const url of ['http://mohfamcarwash.com/','https://www.mohfamcarwash.com/','http://www.mohfamcarwash.com/','https://mohfamcarwash.com/index.html','https://mohfamcarwash.com/about/index.html','https://mohfamsecurity.com/mohfamcarwash.com/','https://mohfamsecurity.com/mohfamcarwash.com/about/']){const r=await fetch(url,{redirect:'manual'});assert([301,308].includes(r.status),url+' redirect');assert(r.headers.get('location')?.startsWith(site.origin));checks.push(url+' canonical redirect');}
for(const route of ['/not-a-real-carwash-page/','/404.html','/404/']){const r=await fetch(site.origin+route);assert.equal(r.status,404,route);assert((await r.text()).includes('A small detour.'));checks.push(route+' genuine branded 404');}
const robots=await (await fetch(site.origin+'/robots.txt')).text();assert(robots.includes('Allow: /'));assert(robots.includes(site.origin+'/sitemap.xml'));assert(!(await (await fetch(site.origin+'/sitemap.xml')).text()).includes('carwash.example'));
const csrf=await fetch(site.origin+'/api/csrf');assert.equal(csrf.status,200);const token=await csrf.json();assert.match(token.token,/^[a-f0-9]{64}$/);assert(csrf.headers.get('set-cookie')?.toLowerCase().includes('secure'));
const bad=await fetch(site.origin+'/api/inquiry',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,403);checks.push('Production PHP CSRF and cross-origin rejection; no email sent');
await fs.mkdir('artifacts/hosting',{recursive:true});await fs.writeFile('artifacts/hosting/live-checks.json',JSON.stringify({origin:site.origin,checks},null,2));console.log(`Live verification passed: ${checks.length} route/redirect/API checks plus shared and social assets.`);
