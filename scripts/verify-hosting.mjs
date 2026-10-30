import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {Readable} from 'node:stream';
import {connectFtps} from './ftps.mjs';
// Writes one unpredictable temporary marker only; never uploads site files.
const {client,config}=await connectFtps();
const name=`mohfam-carwash-verify-${crypto.randomBytes(16).toString('hex')}.txt`;
const content=`MohFam Car Wash dedicated destination verification\n${crypto.randomBytes(32).toString('hex')}\n`;
let created=false;
try{
 const pwd=await client.pwd(),entries=await client.list();
 if(entries.some(e=>e.name===name))throw new Error('Marker collision: no remote changes made.');
 await client.uploadFrom(Readable.from(content),name);created=true;
 const response=await fetch(config.candidateOrigin+'/'+name,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
 if(!response.ok||(await response.text())!==content)throw new Error('HTTPS/FTPS mapping could not be verified. Website uploads remain disabled.');
 const result={origin:config.candidateOrigin,host:config.host,connectAddress:config.dedicatedIp,certificateValidated:true,accountLoginVerified:true,remoteWorkingDirectory:pwd,accountRootToHttpsVerified:true,serverAbsoluteFilesystemPathKnown:false,markerRemoved:false,websiteUploadsPerformed:false};
 result.aliasChecks=[];
 for(const base of ['https://www.mohfamcarwash.com','https://mohfamsecurity.com/mohfamcarwash.com']){
  try{const r=await fetch(base+'/'+name,{redirect:'manual',signal:AbortSignal.timeout(15000)});result.aliasChecks.push({base,status:r.status,sameMarker:(await r.text())===content});}catch{result.aliasChecks.push({base,error:'unreachable'});}
 }
 await client.remove(name);created=false;result.markerRemoved=true;
 result.markerAbsentFromFtpsListing=!(await client.list()).some(entry=>entry.name===name);
 if(!result.markerAbsentFromFtpsListing)throw new Error('Temporary marker still exists in the account listing.');
 const removed=await fetch(config.candidateOrigin+'/'+name,{redirect:'error',signal:AbortSignal.timeout(15000)});if(removed.status===200)throw new Error('Marker removal could not be independently confirmed.');result.markerRemovalHttpStatus=removed.status;
 await fs.mkdir('artifacts/hosting',{recursive:true});await fs.writeFile('artifacts/hosting/verification.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{if(created)try{await client.remove(name);}catch{console.error('Temporary verification marker cleanup requires attention. No website content was uploaded.');}client.close();}
