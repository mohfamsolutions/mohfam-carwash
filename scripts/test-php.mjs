import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4189';
const php=spawn(process.env.PHP_BIN||'php',['-S','127.0.0.1:4189','tests/php-router.php'],{stdio:['ignore','pipe','pipe']});
php.stdout.resume();php.stderr.resume();let startError;php.on('error',e=>startError=e);
try{
 let ready=false;for(let i=0;i<40;i++){if(startError)throw startError;try{const r=await fetch(origin+'/api/csrf');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,'PHP did not start');
 const response=await fetch(origin+'/api/csrf');assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0],{token}=await response.json();
 assert(response.headers.get('set-cookie').toLowerCase().includes('secure'));assert(response.headers.get('set-cookie').toLowerCase().includes('httponly'));
 const fields={name:'Synthetic Visitor',email:'visitor@example.org',phone:'',location:'Test city',category:'personal',message:'Synthetic local security test only.',website:'',consent:true,csrf:token};
 const post=(changes={},otherOrigin='https://mohfamcarwash.com')=>fetch(origin+'/api/inquiry',{method:'POST',headers:{Origin:otherOrigin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({...fields,...changes})});
 assert.equal((await post({},'https://foreign.example')).status,403);
 assert.equal((await post({csrf:'invalid'})).status,403);
 assert.equal((await post({email:'bad\r\nBcc: test@example.org'})).status,422);
 assert.equal((await post()).status,422,'minimum fill time');
 await new Promise(r=>setTimeout(r,2700));
 assert.equal((await post({website:'spam'})).status,422);
 const disabled=await post();assert.equal(disabled.status,503);assert((await disabled.json()).message.includes('NOT been sent'));
 assert.equal((await post()).status,429);
 console.log('Actual PHP endpoint passed origin, CSRF, header injection, minimum fill time, honeypot, disabled-delivery and rate-limit checks. No email sent.');
}finally{php.kill();}
