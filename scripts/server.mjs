import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {site} from '../data/site.mjs';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const categories=new Set(['personal','household','business','other']);
export function validate(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Use the inquiry form to submit your details.';
 const limits={name:100,email:254,phone:30,location:100,category:30,message:4000,website:200,csrf:100};
 for(const [key,max] of Object.entries(limits))if(typeof data[key]!=='string'||data[key].length>max)return `Please check the ${key} field.`;
 for(const key of ['name','email','phone','location','category'])if(/[\r\n\x00-\x1f\x7f]/.test(data[key]))return 'Some fields contain invalid characters. Please check your entries.';
 if(data.name.trim().length<2||!data.location.trim())return 'Please enter your full name and city or ZIP code.';
 // A conservative mailbox form without quoted local parts, controls or multiple addresses.
 if(!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(data.email)||data.email.includes('..')||data.email.startsWith('.')||data.email.includes('.@'))return 'Please enter a valid email address.';
 if(data.phone&&!/^[+\d ()\-.]{6,30}$/.test(data.phone))return 'Please check your phone number.';
 if(!categories.has(data.category))return 'Please select an inquiry type.';
 if(data.message.trim().length<10||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data.message))return 'Please enter a message between 10 and 4,000 characters without control characters.';
 if(data.consent!==true)return 'Please agree to the privacy notice before submitting.';
 return null;
}
export function composeMail(data){const problem=validate(data);if(problem)throw new Error(problem);return {to:site.email,subject:`[MohFam Car Wash] ${data.category} inquiry`,replyTo:data.email,text:`Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone||'Not provided'}\nCity / ZIP: ${data.location}\nType: ${data.category}\n\n${data.message}`};}
export function createServer({port=4177,now=Date.now,minFillMs=2500}={}){
 const sessions=new Map(),limits=new Map();
 const maxEntries=10000;
 const allowedOrigins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
 const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
 const cleanup=()=>{for(const [k,v]of sessions)if(now()-v.created>1800000)sessions.delete(k);for(const[k,v]of limits)if(now()-v.start>3600000)limits.delete(k);};
 const send=(res,status,message)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({message}));};
 return http.createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'"};
  for(const[k,v]of Object.entries(headers))res.setHeader(k,v);
  if(!allowedHosts.has(req.headers.host))return send(res,403,'This preview accepts local requests only.');
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(res,400,'Invalid URL.');}
  if(pathname.startsWith('/api/')){
   res.setHeader('Cache-Control','no-store');cleanup();
   if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))return send(res,403,'The request origin was not accepted. Your entries have been preserved.');
   if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,'Cross-site requests are not accepted.');
   const ip=req.socket.remoteAddress;
   if(pathname==='/api/csrf'&&req.method==='GET'){
    const existing=limits.get(ip);if(existing&&existing.tokens>=60)return send(res,429,'Too many form initializations. Please try again later.');
    if(!existing&&limits.size>=maxEntries)return send(res,503,'The form is temporarily unavailable.');
    const entry=existing||{start:now(),attempts:0,tokens:0};entry.tokens++;limits.set(ip,entry);
    if(sessions.size>=maxEntries)return send(res,503,'The form is temporarily unavailable.');
    const id=crypto.randomBytes(32).toString('hex'),token=crypto.randomBytes(32).toString('hex');sessions.set(id,{token,created:now(),ip});
    res.setHeader('Set-Cookie',`mw_csrf=${id}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=1800`);
    res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({token}));
   }
   if(pathname!=='/api/inquiry')return send(res,404,'Endpoint not found.');
   if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,'Use POST to submit an inquiry.');}
   if(!allowedOrigins.has(req.headers.origin))return send(res,403,'The request origin was not accepted. Your entries have been preserved.');
   const entry=limits.get(ip)||{start:now(),attempts:0,tokens:0};
   if(!limits.has(ip)&&limits.size>=maxEntries)return send(res,503,'The form is temporarily unavailable.');
   entry.attempts++;limits.set(ip,entry);
   if(entry.attempts>5){res.setHeader('Retry-After',String(Math.ceil((entry.start+3600000-now())/1000)));return send(res,429,'Too many attempts. Please try again in an hour or contact MohFam directly. Your entries are still here.');}
   if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(res,415,'Use the website form to submit your inquiry.');
   const chunks=[];let bytes=0;
   try{for await(const chunk of req){bytes+=chunk.length;if(bytes>16384){send(res,413,'The inquiry is too long. Please shorten your message.');req.resume();return;}chunks.push(chunk);}}catch{return send(res,400,'Connection interrupted. Your inquiry was not sent.');}
   const body=Buffer.concat(chunks).toString('utf8');
   let data;try{data=JSON.parse(body);}catch{return send(res,400,'The inquiry could not be read. Please retry.');}
   const cookie=req.headers.cookie?.match(/(?:^|;\s*)mw_csrf=([a-f0-9]{64})(?:;|$)/)?.[1],session=sessions.get(cookie);
   if(!session||session.ip!==ip||typeof data?.csrf!=='string'||!/^[a-f0-9]{64}$/.test(data.csrf)||!crypto.timingSafeEqual(Buffer.from(data.csrf),Buffer.from(session.token)))return send(res,403,'Your secure form session expired or could not be verified. Your entries are still here; please retry.');
   const problem=validate(data);if(problem)return send(res,422,problem+' Your entries are still here.');
   if(data.website||now()-session.created<minFillMs)return send(res,422,'The inquiry could not be accepted. Please wait a few seconds, check the form and try again. Your entries are still here.');
   // Deliberate hard stop: no environment variable or copied credential can activate mail in this preview.
   return send(res,503,'Email delivery is disabled in this local preview. Your inquiry has NOT been sent. Your entries are still here. Please call +1 (818) 818-1181 or email mohfamsolutions@gmail.com.');
  }
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(res,405,'Method not allowed.');}
  if(pathname.includes('\0')||pathname.includes('\\'))return send(res,400,'Invalid path.');
  if(/\/index\.html$/.test(pathname)){res.writeHead(308,{Location:pathname.replace(/index\.html$/,'')});return res.end();}
  let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep))return send(res,403,'Invalid path.');
  let status=200;
  try{const stat=await fs.stat(file);if(stat.isDirectory()){if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'});return res.end();}file=path.join(file,'index.html');}await fs.access(file);if(pathname==='/404/'||pathname==='/404.html')status=404;}
  catch{file=path.join(root,'404.html');status=404;}
  try{const content=await fs.readFile(file);res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}catch{send(res,503,'Build the local preview first with npm.cmd run build.');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||4177);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid preview port');createServer({port}).listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port} — noindex, mail disabled`));}
