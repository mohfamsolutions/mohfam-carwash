import {spawn,execFileSync} from 'node:child_process';
for(const script of ['scripts/test-carwash-inquiry.php','scripts/test-inquiry-transport.php'])process.stdout.write(execFileSync(process.env.PHP_BIN||'php',[script],{encoding:'utf8'}));
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4189';
const php=spawn(process.env.PHP_BIN||'php',['-S','127.0.0.1:4189','tests/php-router.php'],{stdio:['ignore','pipe','pipe']});
php.stdout.resume();php.stderr.resume();let startError;php.on('error',e=>startError=e);
try{
 let ready=false;for(let i=0;i<40;i++){if(startError)throw startError;try{const r=await fetch(origin+'/api/csrf');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,'PHP did not start');
 const response=await fetch(origin+'/api/csrf');assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0],{token}=await response.json();
 assert(response.headers.get('set-cookie').toLowerCase().includes('secure'));assert(response.headers.get('set-cookie').toLowerCase().includes('httponly'));
 const fields={name:'Synthetic Visitor',email:'visitor@example.org',phone:'',location:'Test city',category:'personal',message:'Synthetic local security test only.',website:'',consent:'yes',csrf:token};
 const post=(changes={},otherOrigin='https://mohfamcarwash.com')=>fetch(origin+'/api/inquiry',{method:'POST',headers:{Origin:otherOrigin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({...fields,...changes})});
 assert.equal((await post({},'https://foreign.example')).status,403);
 assert.equal((await post({},'')).status,403);
 const malformed=await fetch(origin+'/api/inquiry',{method:'POST',headers:{Origin:'https://mohfamcarwash.com','Content-Type':'application/json',Cookie:cookie},body:'invalid json'});assert.equal(malformed.status,400);
 assert.equal((await fetch(origin+'/api/inquiry')).status,405);
 const oversized=await post({message:'x'.repeat(18000)});assert.equal(oversized.status,413);
 const wrongType=await fetch(origin+'/api/inquiry',{method:'POST',headers:{Origin:'https://mohfamcarwash.com','Content-Type':'text/plain'},body:'{}'});assert.equal(wrongType.status,415);
 const noConfig=await post();assert.equal(noConfig.status,503);assert((await noConfig.json()).message.includes('temporarily unavailable'));
 console.log('PHP HTTP checks passed: routing, origin, body size/type, malformed input and fail-closed missing private configuration. No provider requests sent.');
}finally{php.kill();}
