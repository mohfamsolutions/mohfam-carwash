<?php
declare(strict_types=1);
require __DIR__.'/../hosting/api/index.php';
use function MohFam\CarWash\{confirmationPayload,contactPayload,consumeRateLimit,followUps,logEvent,privateDirectory,loadKey};
function check(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
$now=1800000000;$key='synthetic-key-never-real';
$session=['csrf'=>str_repeat('a',64),'issued'=>$now-5];$server=['HTTP_ORIGIN'=>'https://mohfamcarwash.com','REMOTE_ADDR'=>'192.0.2.8'];
$fixture=['csrf'=>$session['csrf'],'name'=>'Test <Visitor>','email'=>'visitor@example.com','phone'=>'818-555-0100','location'=>'CONFIDENTIAL_LOCATION','category'=>'personal','message'=>"CONFIDENTIAL_MESSAGE <script>example</script>\nLine two",'consent'=>'yes','website'=>''];
$sent=[];$jobs=[];$logs=[];
$send=function(array $payload)use(&$sent):array{$sent[]=$payload;return ['ok'=>true,'http_code'=>201,'messageId'=>'<test@example.test>'];};
$allow=static function():bool{return true;};$defer=function(array $job)use(&$jobs):void{$jobs[]=$job;};
$log=function($reference,$category,$code,$id)use(&$logs):bool{$logs[]=compact('reference','category','code','id');return true;};
$run=static function(array $input,?array $request=null,?array $state=null,?callable $transport=null,?callable $limit=null)use($server,$session,$now,$send,$allow,$defer,$log):array{return processCarwashInquiry($input,$request??$server,$state??$session,$now,$transport??$send,$limit??$allow,$defer,$log);};
check($run($fixture)['body']['ok']===true,'Valid notification failed');$payload=$sent[0];$job=$jobs[0];
check($payload['sender']['email']==='website@mohfam.co'&&$payload['to'][0]['email']==='mohfamsolutions@gmail.com'&&$payload['replyTo']['email']===$fixture['email'],'Notification headers wrong');
check($payload['subject']==='[MohFam Car Wash] Personal vehicle inquiry — Test <Visitor>'&&$payload['tags']===['inquiry-notification'],'Notification subject/tag wrong');
foreach(['818-555-0100','CONFIDENTIAL_LOCATION','CONFIDENTIAL_MESSAGE','Consent: yes','https://mohfamcarwash.com/contact/','Submitted (UTC)','Submitted (Los Angeles)']as$value)check(strpos($payload['textContent'],$value)!==false,'Notification field missing');
check(strpos($payload['htmlContent'],'<script>')===false&&strpos($payload['htmlContent'],'&lt;script&gt;')!==false,'Notification HTML not escaped');
check(array_keys($job['fields'])===['name','email','category'],'Follow-up job retains unnecessary data');
foreach([['consent'=>''],['consent'=>'no'],['consent'=>true],['consent'=>'on'],['consent'=>['yes']],['email'=>"bad@example.com\r\nBcc:x@y.com"],['email'=>'invalid'],['phone'=>[]],['location'=>''],['category'=>'unknown'],['website'=>'bot'],['message'=>'short'],['name'=>"\tName"],['message'=>"bad\xFF"],['message'=>"bad\u{0085}"],['message'=>str_repeat('x',4001)]]as$invalid)check($run(array_replace($fixture,$invalid))['status']===422,'Invalid field accepted');
foreach([[],['HTTP_ORIGIN'=>'null'],['HTTP_ORIGIN'=>'https://attacker.example'],['HTTP_ORIGIN'=>'https://mohfamcarwash.com.attacker.example'],['HTTP_ORIGIN'=>'http://mohfamcarwash.com'],['HTTP_ORIGIN'=>'https://mohfamcarwash.com:444'],['HTTP_ORIGIN'=>'https://attacker.example','HTTP_REFERER'=>'https://mohfamcarwash.com/contact/'],['HTTP_REFERER'=>'https://attacker.example'],['HTTP_ORIGIN'=>$server['HTTP_ORIGIN'],'HTTP_SEC_FETCH_SITE'=>'cross-site']]as$invalid)check($run($fixture,$invalid+['REMOTE_ADDR'=>'192.0.2.8'])['status']===403,'Origin bypass');
check($run($fixture,['HTTP_REFERER'=>'https://mohfamcarwash.com/contact/','REMOTE_ADDR'=>'192.0.2.8'])['status']===200,'Referer fallback failed');
check($run(array_replace($fixture,['csrf'=>'wrong']))['status']===403,'CSRF bypass');
check($run($fixture,null,['csrf'=>$session['csrf'],'issued'=>$now-1801])['status']===403,'Expired CSRF accepted');
check($run($fixture,null,['csrf'=>$session['csrf'],'issued'=>$now-2])['status']===422,'Minimum time bypass');
check($run($fixture,null,['csrf'=>$session['csrf'],'issued'=>$now-3])['status']===200,'Three second boundary rejected');
check($run($fixture,null,null,null,static function():bool{return false;})['status']===429,'Rate bypass');
$count=count($jobs);
foreach([['ok'=>false,'http_code'=>201,'messageId'=>'<id@test>'],['ok'=>true,'http_code'=>200,'messageId'=>'<id@test>'],['ok'=>true,'http_code'=>202,'messageId'=>'<id@test>'],['ok'=>true,'http_code'=>201,'messageId'=>''],['ok'=>true,'http_code'=>201,'messageId'=>"bad\nvalue"]]as$failure)check($run($fixture,null,null,static function()use($failure):array{return $failure;})['status']===503,'Unaccepted provider result succeeded');
check(count($jobs)===$count,'Follow-ups scheduled on failed notification');
$confirmation=confirmationPayload($job['fields']+$fixture,$job['reference']);
check($confirmation['sender']===['name'=>'MohFam Car Wash','email'=>'website@mohfam.co']&&$confirmation['replyTo']['email']==='mohfamsolutions@gmail.com','Confirmation headers wrong');
check($confirmation['subject']==='We received your inquiry — MohFam Car Wash'&&$confirmation['tags']===['inquiry-confirmation'],'Confirmation subject/tag wrong');
check($confirmation['textContent']==='Hi Test, we received your Personal vehicle inquiry. MohFam Car Wash is a new division, and the team will contact you about services and availability in your area. Reference '.$job['reference'].'. Questions: +1 (818) 818-1181.','Confirmation wording changed');
check(strpos($confirmation['htmlContent'],'https://mohfamcarwash.com/assets/organization-logo.png')!==false&&strpos(json_encode($confirmation),'CONFIDENTIAL_')===false&&strpos(json_encode($confirmation),'818-555-0100')===false,'Confirmation logo/privacy wrong');
$contact=contactPayload($job['fields'],$job['date']);
check(array_keys($contact)===['email','updateEnabled','listIds','attributes']&&$contact['listIds']===[15]&&$contact['updateEnabled']===true,'Contact upsert/membership wrong');
check(array_keys($contact['attributes'])===['FIRSTNAME','LASTNAME','SERVICE_INTEREST','SOURCE_SITE','LAST_INQUIRY_AT'],'Unexpected contact attributes');
check($contact['attributes']['SOURCE_SITE']==='mohfamcarwash.com'&&$contact['attributes']['SERVICE_INTEREST']==='Personal vehicle inquiry'&&$contact['attributes']['LAST_INQUIRY_AT']===$job['date'],'Contact values wrong');
foreach(['2026-01-01T07:30:00Z'=>'2025-12-31','2026-07-01T06:30:00Z'=>'2026-06-30']as$utc=>$date){$time=strtotime($utc);$j=[];processCarwashInquiry($fixture,$server,['csrf'=>$session['csrf'],'issued'=>$time-5],$time,$send,$allow,function($job)use(&$j){$j=$job;},$log);check($j['date']===$date,'LA date/DST mismatch');}
$calls=[];$events=[];followUps($job['fields'],$job['reference'],$job['date'],function($kind,$payload)use(&$calls):array{$calls[]=$kind;if($kind==='email')throw new RuntimeException('synthetic');return ['ok'=>true,'http_code'=>204];},function($category)use(&$events){$events[]=$category;});
check($calls===['email','contact']&&$events===['confirmation_internal_error','contact_synced'],'Independent follow-ups failed');
$temp=sys_get_temp_dir().'/carwash-inquiry-test-'.bin2hex(random_bytes(8));mkdir($temp,0700);
try{
 for($i=0;$i<5;$i++)check(consumeRateLimit($temp,'192.0.2.8',$key,$now+$i),'Allowed attempt blocked');
 check(!consumeRateLimit($temp,'192.0.2.8',$key,$now+6),'Sixth attempt accepted');check(!consumeRateLimit($temp,'192.0.2.8',$key,$now+901),'Hourly rate expired early');
 check(consumeRateLimit($temp,'192.0.2.8',$key,$now+3605),'Hourly expiry failed');
 check(strpos(file_get_contents($temp.'/mohfam-carwash-inquiry-rate.json'),'192.0.2.')===false,'Raw IP stored');
 file_put_contents($temp.'/mohfam-carwash-inquiry-rate.json','invalid');check(!consumeRateLimit($temp,'192.0.2.8',$key,$now),'Corrupt rate state failed open');
 check(logEvent($temp,$job['reference'],'notification_accepted',201,'<test@example.test>'),'Log write failed');$entry=json_decode(trim(file_get_contents($temp.'/mohfam-carwash-inquiry.log')),true);check(array_keys($entry)===['timestamp','reference','status','http_code','messageId'],'Log contains extra data');
 mkdir($temp.'/public_html');mkdir($temp.'/public_html/mohfamcarwash.com');mkdir($temp.'/private');
 check(privateDirectory($temp.'/public_html/mohfamcarwash.com')===realpath($temp.'/private'),'Private path wrong');
 file_put_contents($temp.'/private/mohfam-mail.php','<?php echo "discarded"; return ["brevo_api_key"=>"synthetic-private-config-for-testing-only"];');
 ob_start();$loaded=loadKey($temp.'/private');$output=ob_get_clean();check($output===''&&$loaded==='synthetic-private-config-for-testing-only','Config output exposed');
 file_put_contents($temp.'/private/mohfam-mail.php','<?php return [];');$blocked=false;try{loadKey($temp.'/private');}catch(Throwable $e){$blocked=true;}check($blocked,'Missing key accepted');
}finally{
 foreach(['mohfam-carwash-inquiry-rate.json','mohfam-carwash-inquiry.log','private/mohfam-mail.php']as$file)if(is_file($temp.'/'.$file))unlink($temp.'/'.$file);
 rmdir($temp.'/private');rmdir($temp.'/public_html/mohfamcarwash.com');rmdir($temp.'/public_html');rmdir($temp);
}
echo "Car Wash inquiry checks passed: validation, CSRF, origin/referer, timing, rate, payloads, LA date, private config/logging, independent follow-ups. No email sent.\n";
