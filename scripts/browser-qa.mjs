import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from './server.mjs';
import {pages,site} from '../data/site.mjs';
const isLive=process.argv.includes('--live');
const port=4180,origin=isLive?site.origin:`http://127.0.0.1:${port}`;
const artifactDir=isLive?'artifacts/qa-live':'artifacts/qa';
await fs.mkdir(artifactDir,{recursive:true});
const server=isLive?null:createServer({port});if(server)await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const results=[],issues=[];
try{
 const context=await browser.newContext();const page=await context.newPage();
 page.on('pageerror',e=>issues.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/inquiry')&&!r.url().includes('/404/'))issues.push(`${r.status()} ${r.url()}`);});
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const p of pages){await page.goto(origin+p.path);await page.evaluate(()=>document.fonts.ready);await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(80);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${p.key} ${width}`);
   assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).length),0,`Images ${p.key} ${width}`);
   if([1440,390].includes(width)||(width===320&&p.key==='home'))await page.screenshot({path:`${artifactDir}/${p.key}-${width}.png`,fullPage:true});
   if([1440,320].includes(width)){const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await fs.writeFile(`${artifactDir}/axe-${p.key}-${width}.json`,JSON.stringify(a11y.violations,null,2));assert.equal(a11y.violations.length,0,`Accessibility ${p.key} ${width}: ${a11y.violations.map(v=>v.id+': '+v.nodes.map(n=>n.target).join(', ')).join('; ')}`);}
   results.push(`${p.key} ${width}px: rendered, no overflow or missing images`);
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(origin);
 await page.locator('.service-toggle').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.service-toggle').getAttribute('aria-expanded'),'true');
 const menuBox=await page.locator('.dropdown').boundingBox(),serviceBox=await page.locator('.services-nav').boundingBox();assert(Math.abs(menuBox.x-serviceBox.x)<=25);assert(menuBox.y>=serviceBox.y+serviceBox.height);
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('#services-menu')!==null),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.service-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('.service-toggle').evaluate(el=>el===document.activeElement),true);
 await page.locator('.service-toggle').blur();await page.evaluate(()=>window.scrollTo({top:650,behavior:'instant'}));await page.waitForTimeout(350);assert(await page.locator('#header').evaluate(el=>el.classList.contains('header-hidden')));await page.evaluate(()=>window.scrollTo({top:450,behavior:'instant'}));await page.waitForTimeout(350);assert.equal(await page.locator('#header').evaluate(el=>el.classList.contains('header-hidden')),false);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.locator('.service-toggle').click();await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));assert.equal(await page.locator('#header').evaluate(el=>el.classList.contains('header-hidden')),false);await page.keyboard.press('Escape');
 const faq=page.locator('.faq button');await faq.nth(0).click();await faq.nth(1).click();assert.equal(await faq.nth(0).getAttribute('aria-expanded'),'true');assert.equal(await faq.nth(1).getAttribute('aria-expanded'),'true');await faq.nth(0).click();assert.equal(await faq.nth(1).getAttribute('aria-expanded'),'true');
 results.push('Desktop keyboard dropdown, alignment, Escape/focus return, header directions/open state, independent FAQs passed');
 await page.setViewportSize({width:320,height:750});await page.goto(origin);await page.locator('.menu-toggle').click();await page.locator('.service-toggle').click();assert(await page.locator('#services-menu').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#services-menu').isVisible(),false);await page.keyboard.press('Escape');assert.equal(await page.locator('#navigation').isVisible(),false);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#header').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');await faq.nth(0).click();assert.equal(await page.locator('.faq-answer').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 results.push('320px mobile menu, nested Escape behavior and reduced motion passed');
 await page.goto(origin+'/contact/');await page.locator('input[name=name]').fill('Preview Visitor');await page.locator('input[name=email]').fill('visitor@example.org');await page.locator('input[name=location]').fill('Test city');await page.locator('select').selectOption('personal');await page.locator('textarea').fill('Synthetic inquiry for local testing only.');await page.locator('[name=consent]').check();await page.waitForTimeout(2700);
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-feedback').textContent.includes('NOT been sent'));assert.equal(await page.locator('input[name=name]').inputValue(),'Preview Visitor');assert.equal(await page.locator('textarea').inputValue(),'Synthetic inquiry for local testing only.');
 await page.locator('input[name=email]').evaluate(el=>el.type='text');await page.locator('input[name=email]').fill('invalid-email');await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-feedback').textContent.includes('valid email address'));assert.equal(await page.locator('input[name=name]').inputValue(),'Preview Visitor');assert.equal(await page.locator('textarea').inputValue(),'Synthetic inquiry for local testing only.');await page.locator('input[name=email]').fill('visitor@example.org');
 await page.route('**/api/inquiry',route=>route.abort());await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-feedback').textContent.includes('Connection problem'));assert.equal(await page.locator('input[name=email]').inputValue(),'visitor@example.org');await page.unroute('**/api/inquiry');
 results.push('Actual server validation, disabled-delivery and interrupted-connection errors preserve fields');
 assert.equal(issues.length,0,issues.join('\n'));
 await fs.writeFile(artifactDir+'/results.json',JSON.stringify({date:'2026-10-30',browser:browser.version(),results,browserErrors:issues},null,2));
 console.log(`Browser QA passed: ${results.length} checks; zero axe WCAG A/AA violations on every page at 1440/320px, zero script errors. Screenshots: artifacts/qa/.`);
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
