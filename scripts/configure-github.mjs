import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {loadFtpsPassword} from './ftps.mjs';
const execute=promisify(execFile);
const repo='mohfamsolutions/mohfam-carwash',environment='carwash-production';
await execute('gh',['api','--method','PUT',`repos/${repo}/environments/${environment}`],{windowsHide:true});
let secret=await loadFtpsPassword();
await new Promise((resolve,reject)=>{
 const child=spawn('gh',['secret','set','CARWASH_FTPS_PASSWORD','--repo',repo,'--env',environment],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 child.stdout.resume();child.stderr.resume();child.on('error',()=>reject(new Error('GitHub environment secret setup failed.')));child.on('close',code=>code===0?resolve():reject(new Error('GitHub environment secret setup failed.')));
 child.stdin.end(secret);
});
secret=undefined;
console.log('Dedicated carwash-production environment and encrypted FTPS secret configured. Secret was sent via stdin, never a command argument.');
