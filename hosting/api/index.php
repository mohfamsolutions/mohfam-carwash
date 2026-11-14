<?php
declare(strict_types=1);
require_once __DIR__ . '/inquiry-mail.php';
use function MohFam\CarWash\{privateDirectory, loadKey, readiness, request, accepted, notificationPayload, consumeRateLimit, logEvent};

function carwashResult(int $status, string $message, bool $ok=false): array { return ['status'=>$status,'body'=>['ok'=>$ok,'message'=>$message]]; }
function carwashOrigin(string $url): string {
    if (preg_match('/[\x00-\x20\x7F]/', $url)) return '';
    $parts=parse_url($url);
    if (!is_array($parts) || ($parts['scheme']??'')!=='https' || isset($parts['user']) || isset($parts['pass']) || ($parts['port']??443)!==443) return '';
    return 'https://'.strtolower($parts['host']??'');
}
function carwashSameOrigin(array $server): bool {
    $origin=$server['HTTP_ORIGIN']??'';
    $source=$origin!=='' ? $origin : ($server['HTTP_REFERER']??'');
    return ($server['HTTP_SEC_FETCH_SITE']??'')!=='cross-site'
        && in_array(carwashOrigin($source),['https://mohfamcarwash.com','https://www.mohfamcarwash.com'],true);
}
function validateCarwashFields(array $data): array {
    $limits=['name'=>[2,100],'email'=>[3,254],'phone'=>[0,30],'location'=>[1,100],'category'=>[1,80],'message'=>[10,4000],'consent'=>[3,3],'website'=>[0,200]];
    $fields=[];
    foreach($limits as $field=>[$min,$max]) {
        $value=$data[$field]??'';
        if(!is_string($value)||!preg_match('//u',$value)) throw new InvalidArgumentException('Please check your inquiry fields.');
        $controls=$field==='message'?'/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u':'/[\x00-\x1F\x7F-\x9F]/u';
        if(preg_match($controls,$value)) throw new InvalidArgumentException('Please remove unsupported characters from your inquiry.');
        $value=trim($value);
        if(strlen($value)<$min||strlen($value)>$max) throw new InvalidArgumentException('Please check your '.$field.' field and try again.');
        $fields[$field]=$value;
    }
    if(!filter_var($fields['email'],FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Please enter a valid email address.');
    if($fields['phone']!==''&&!preg_match('/^[+\d ()\-.]{6,30}$/D',$fields['phone']))throw new InvalidArgumentException('Please check your phone number.');
    $categories=['personal'=>'Personal vehicle inquiry','household'=>'Multiple vehicle inquiry','business'=>'Business vehicle inquiry','other'=>'General question'];
    if(!isset($categories[$fields['category']])||($data['consent']??null)!=='yes')throw new InvalidArgumentException('Please choose a valid inquiry type and confirm consent.');
    if($fields['website']!=='') throw new InvalidArgumentException('We could not verify this submission. Please use the contact details below.');
    $fields['category']=$categories[$fields['category']];
    $fields['page_url']='https://mohfamcarwash.com/contact/';
    return $fields;
}
/** All side effects are injectable; tests use synthetic data and never call Brevo. */
function processCarwashInquiry(array $data,array $server,array $session,int $now,callable $send,callable $limit,callable $defer,callable $log): array {
    if(!carwashSameOrigin($server)) return carwashResult(403,'The security check failed. Reload the page and try again.');
    if(!is_string($data['csrf']??null)||!is_string($session['csrf']??null)||$session['csrf']===''||!hash_equals($session['csrf'],$data['csrf'])||!is_int($session['issued']??null)||$now-$session['issued']>1800) return carwashResult(403,'Your security session expired. Reload this page before trying again.');
    try{$fields=validateCarwashFields($data);}catch(InvalidArgumentException $error){return carwashResult(422,$error->getMessage());}
    if($now-$session['issued']<3) return carwashResult(422,'Please wait a few seconds and try again.');
    $ip=$server['REMOTE_ADDR']??'';
    if(!filter_var($ip,FILTER_VALIDATE_IP)) return carwashResult(403,'Unable to verify this connection. Please contact MohFam directly.');
    if(!$limit($ip)) return carwashResult(429,'Too many inquiries from this connection. Please try again later or contact MohFam directly.');
    $reference=bin2hex(random_bytes(12));
    if(!$log($reference,'notification_attempt',0,'')) return carwashResult(503,'Unable to send right now. Please contact MohFam directly.');
    $submitted=new DateTimeImmutable('@'.$now);
    try{$sent=$send(notificationPayload($fields,$reference,$submitted));}catch(Throwable $error){$sent=['ok'=>false,'http_code'=>0];}
    if(!accepted($sent)) {
        $log($reference,'notification_failed',(int)($sent['http_code']??0),'');
        return carwashResult(503,'We could not confirm your inquiry was sent. Please contact MohFam directly. Reference: '.$reference.'.');
    }
    $log($reference,'notification_accepted',201,$sent['messageId']);
    try{$defer(['reference'=>$reference,'fields'=>array_intersect_key($fields,array_flip(['name','email','category'])),'date'=>$submitted->setTimezone(new DateTimeZone('America/Los_Angeles'))->format('Y-m-d')]);}
    catch(Throwable $error){$log($reference,'followup_schedule_failed',0,'');}
    return carwashResult(200,'Your inquiry was sent to the MohFam team. MohFam Car Wash is a new division; the team will contact you about services and availability in your area. Reference: '.$reference.'.',true);
}
function handleCarwashInquiry(): void {
    umask(0077);ini_set('display_errors','0');
    header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex, nofollow');
    $route=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD']??'';
    if(!in_array($route,['/api/csrf','/api/inquiry'],true)){http_response_code(404);echo json_encode(['ok'=>false,'message'=>'Endpoint not found.']);return;}
    if(($route==='/api/csrf'&&$method!=='GET')||($route==='/api/inquiry'&&$method!=='POST')){header('Allow: '.($route==='/api/csrf'?'GET':'POST'));http_response_code(405);echo json_encode(['ok'=>false,'message'=>'Method not allowed.']);return;}
    if($method==='POST'&&!carwashSameOrigin($_SERVER)){http_response_code(403);echo json_encode(['ok'=>false,'message'=>'The security check failed. Reload the page and try again.']);return;}
    if($method==='GET'&&((($_SERVER['HTTP_ORIGIN']??'')!==''&&!carwashSameOrigin($_SERVER))||($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')){http_response_code(403);echo json_encode(['ok'=>false,'message'=>'The security check failed.']);return;}
    session_name('mohfam_carwash');ini_set('session.use_strict_mode','1');
    session_set_cookie_params(['lifetime'=>1800,'path'=>'/api','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();
    if($method==='GET'){
        if(empty($_SESSION['csrf'])||time()-(int)($_SESSION['issued']??0)>1800){session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));$_SESSION['issued']=time();}
        $mailReady=false;try{$mailReady=loadKey(privateDirectory(dirname(__DIR__)))!=='';}catch(Throwable $error){}
        echo json_encode(['token'=>$_SESSION['csrf'],'mailReady'=>$mailReady]);session_write_close();return;
    }
    if((int)($_SERVER['CONTENT_LENGTH']??0)>16384)$result=carwashResult(413,'This inquiry is too large. Please shorten your message.');
    elseif(strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]))!=='application/json')$result=carwashResult(415,'Use the website form to submit your inquiry.');
    else{
        $raw=file_get_contents('php://input',false,null,0,16385);
        if($raw===false||strlen($raw)>16384)$result=carwashResult(413,'This inquiry is too large. Please shorten your message.');
        else{
            $data=json_decode($raw,true);
            if(!is_array($data))$result=carwashResult(400,'The inquiry could not be read.');
            else{
                [$private,$key]=readiness(dirname(__DIR__));
                $result=processCarwashInquiry($data,$_SERVER,$_SESSION,time(),
                    static function(array $payload)use($key):array{return request('email',$payload,$key);},
                    static function(string $ip)use($private,$key):bool{return consumeRateLimit($private,$ip,$key,time());},
                    static function(array $job):void{register_shutdown_function('MohFam\\CarWash\\afterResponse',$job,dirname(__DIR__));},
                    static function(string $ref,string $category,int $code,string $id)use($private):bool{return logEvent($private,$ref,$category,$code,$id);});
                if($result['body']['ok'])unset($_SESSION['csrf'],$_SESSION['issued']);
            }
        }
    }
    session_write_close();if($result['status']===429)header('Retry-After: 3600');
    http_response_code($result['status']);echo json_encode($result['body'],JSON_UNESCAPED_UNICODE);
}
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){
    try{handleCarwashInquiry();}catch(Throwable $error){http_response_code(503);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');echo json_encode(['ok'=>false,'message'=>'The inquiry service is temporarily unavailable. Your entries are still here. Please call +1 (818) 818-1181 or email mohfamsolutions@gmail.com.']);}
}
