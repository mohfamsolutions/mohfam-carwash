import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Readable} from 'node:stream';
import {connectFtps} from './ftps.mjs';
import {checkDeployment} from './deployment-guard.mjs';
const deployment=JSON.parse(await fs.readFile('deployment.json','utf8'));
checkDeployment(deployment);
if(deployment.domain!=='mohfamcarwash.com'||deployment.dedicatedHostingFolder!=='/')throw new Error('Destination does not match the verified dedicated Car Wash account.');
const html=await fs.readFile('release/index.html','utf8');
if(!html.includes('content="index,follow"')||html.includes('LOCAL PREVIEW'))throw new Error('Build the production release before deploying.');
await fs.access('release/api/index.php');await fs.access('release/.htaccess');
const {client,config}=await connectFtps();
const backupRoot=path.resolve('artifacts/backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex'));
let marker;
try{
 if(await client.pwd()!=='/')throw new Error('Unexpected dedicated account root.');
 const entries=await client.list();
 const name='mohfam-carwash-verify-'+crypto.randomBytes(16).toString('hex')+'.txt',content=crypto.randomBytes(32).toString('hex');
 marker=name;await client.uploadFrom(Readable.from(content),name);
 const r=await fetch(config.candidateOrigin+'/'+name,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok||(await r.text())!==content)throw new Error('Live HTTPS/FTPS marker mismatch: upload refused.');
 await client.remove(name);marker=undefined;
 await fs.mkdir(backupRoot,{recursive:true});
 await fs.writeFile(path.join(backupRoot,'inventory.json'),JSON.stringify(entries.map(f=>({name:f.name,size:f.size,type:f.type})),null,2));
 async function backup(remote,local){
  for(const entry of await client.list(remote)){
   if(!entry.name||entry.name==='.'||entry.name==='..'||/[\\/]/.test(entry.name))throw new Error('Unsafe remote inventory entry.');
   const target=path.resolve(local,entry.name);if(!target.startsWith(backupRoot+path.sep))throw new Error('Backup path escaped its destination.');
   const source=remote==='/'?'/'+entry.name:remote+'/'+entry.name;
   if(entry.isSymbolicLink)throw new Error('Remote symlink requires manual review before overwrite.');
   if(entry.isDirectory){await fs.mkdir(target,{recursive:true});await backup(source,target);}else if(entry.isFile)await client.downloadTo(target,source);
  }
 }
 await fs.mkdir(path.join(backupRoot,'remote'),{recursive:true});await backup('/',path.join(backupRoot,'remote'));
 await client.cd('/');
 await client.uploadFromDir('release','/');
 await fs.mkdir('artifacts/hosting',{recursive:true});
 await fs.writeFile('artifacts/hosting/deployment.json',JSON.stringify({origin:config.candidateOrigin,accountRoot:'/',backupDirectory:backupRoot,remoteDeletion:false,filesUploaded:true,date:new Date().toISOString()},null,2));
 console.log(`Published to ${config.candidateOrigin}. Backup: ${backupRoot}. No remote files deleted.`);
}finally{if(marker)try{await client.remove(marker);}catch{console.error('Verification marker cleanup needs review.');}client.close();}
