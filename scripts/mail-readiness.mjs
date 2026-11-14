import {Readable} from 'node:stream';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {connectFtps} from './ftps.mjs';
const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
const filename='api/readiness-'+randomBytes(12).toString('hex')+'.php';
const php=`<?php
ini_set('display_errors','0');header('Content-Type: application/json');header('Cache-Control: no-store');header('X-Robots-Tag: noindex, nofollow');
if(!hash_equals('${hash}',hash('sha256',$_SERVER['HTTP_X_CARWASH_READINESS']??''))){http_response_code(404);exit;}
$root=realpath(dirname(__DIR__));$private=$root?dirname($root,2).'/private':'';$file=$private.'/mohfam-mail.php';
$readable=$root&&basename($root)==='mohfamcarwash.com'&&basename(dirname($root))==='public_html'&&!is_link($private)&&realpath($private)===$private&&!is_link($file)&&is_file($file)&&is_readable($file);
$present=false;if($readable){ob_start();try{$config=@include $file;$present=is_array($config)&&is_string($config['brevo_api_key']??null)&&preg_match('/\\A[\\x21-\\x7E]{20,512}\\z/',$config['brevo_api_key'])===1;}catch(Throwable $e){}finally{ob_end_clean();}}
$log=$private.'/mohfam-carwash-inquiry.log';$rate=$private.'/mohfam-carwash-inquiry-rate.json';
echo json_encode(['config_readable'=>(bool)$readable,'key_present'=>(bool)$present,'https_curl'=>function_exists('curl_init')&&in_array('https',curl_version()['protocols']??[],true),'response_finish'=>function_exists('litespeed_finish_request'),'private_writable'=>(bool)($readable&&is_writable($private)),'private_files_safe'=>!is_link($log)&&!is_link($rate)]);
`;
const {client,config}=await connectFtps();let uploaded=false,result;
try{
 if(config.candidateOrigin!=='https://mohfamcarwash.com'||await client.pwd()!=='/')throw Error('Car Wash destination mismatch');
 await client.uploadFrom(Readable.from(php),filename);uploaded=true;
 const url=config.candidateOrigin+'/'+filename;
 const denied=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(denied.status!==404)throw Error('Readiness token protection failed');
 const response=await fetch(url,{redirect:'error',headers:{'X-Carwash-Readiness':token},signal:AbortSignal.timeout(20000)});
 if(response.status!==200)throw Error('Readiness unavailable');result=await response.json();
 if(Object.values(result).some(v=>typeof v!=='boolean'))throw Error('Invalid readiness response');
 console.log(JSON.stringify(result));
}finally{
 if(uploaded){await client.remove(filename);const gone=await fetch(config.candidateOrigin+'/'+filename,{redirect:'error',headers:{'X-Carwash-Readiness':token},signal:AbortSignal.timeout(20000)});const deleted=gone.status===404;console.log(JSON.stringify({probe_deleted:deleted}));if(!deleted)throw Error('Readiness cleanup not verified');}
 client.close();
}
if(!result||Object.values(result).some(v=>v!==true))throw Error('Readiness failed; stop before implementation');
await mkdir('artifacts/mail',{recursive:true});await writeFile('artifacts/mail/readiness.json',JSON.stringify(result,null,2));
