import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pages,site} from '../data/site.mjs';
for(const p of pages){const html=await fs.readFile(p.key==='404'?'release/404.html':path.join('release',p.path,'index.html'),'utf8');assert(!/local preview/i.test(html),p.key+' still has preview copy');assert(html.includes(`content="${p.key==='404'?'noindex':'index'},follow"`));assert(html.includes(`rel="canonical" href="${site.origin+p.path}"`));}
for(const file of ['.htaccess','api/index.php','404.php'])await fs.access('release/'+file);
assert((await fs.readFile('release/robots.txt','utf8')).includes('Allow: /'));
assert(!(await fs.readFile('release/app.js','utf8')).includes('local preview'));
console.log('Production release verified: indexable pages, no preview wording, verified canonicals, robots and Apache/PHP support.');
