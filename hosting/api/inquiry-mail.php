<?php
declare(strict_types=1);
namespace MohFam\CarWash;

const SITE = 'https://mohfamcarwash.com';
const BACKUP = 'mohfamsolutions@gmail.com';

function privateDirectory(string $root): string {
    $root = realpath($root);
    if ($root === false || basename($root) !== 'mohfamcarwash.com' || basename(dirname($root)) !== 'public_html') throw new \RuntimeException('private_path_unavailable');
    $path = dirname($root, 2) . DIRECTORY_SEPARATOR . 'private';
    if (is_link($path) || realpath($path) !== $path || !is_dir($path)) throw new \RuntimeException('private_path_unavailable');
    return $path;
}

function loadKey(string $private): string {
    $file = $private . '/mohfam-mail.php';
    if (is_link($file) || !is_file($file) || !is_readable($file)) throw new \RuntimeException('config_unavailable');
    ob_start();
    try { $config = @include $file; } finally { ob_end_clean(); }
    $key = is_array($config) ? ($config['brevo_api_key'] ?? null) : null;
    if (!is_string($key) || !preg_match('/\A[\x21-\x7E]{20,512}\z/', $key)) throw new \RuntimeException('config_invalid');
    return $key;
}

function readiness(string $root): array {
    $private = privateDirectory($root); $key = loadKey($private);
    $log = $private . '/mohfam-carwash-inquiry.log';
    if (!function_exists('curl_init') || !in_array('https', curl_version()['protocols'] ?? [], true)
        || !function_exists('litespeed_finish_request') || !is_writable($private) || is_link($log)
        || (file_exists($log) && (!is_file($log) || !is_writable($log)))) throw new \RuntimeException('readiness_unavailable');
    return [$private, $key];
}

function validMessageId($id): bool { return is_string($id) && preg_match('/\A[<>A-Za-z0-9@._:+\/-]{1,512}\z/', $id) === 1; }

function logEvent(string $private, string $reference, string $category, int $code = 0, string $id = ''): bool {
    if (!preg_match('/\A[a-f0-9]{24}\z/', $reference) || !preg_match('/\A[a-z_]{1,64}\z/', $category)) return false;
    $path = $private . '/mohfam-carwash-inquiry.log';
    if (is_link($path)) return false;
    $file = @fopen($path, 'ab');
    if ($file === false) return false;
    try {
        if (!@chmod($path, 0600) || !flock($file, LOCK_EX)) return false;
        $entry = ['timestamp' => gmdate('c'), 'reference' => $reference, 'status' => $category, 'http_code' => $code];
        if (validMessageId($id)) $entry['messageId'] = $id;
        $line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        return fwrite($file, $line) === strlen($line) && fflush($file);
    } finally { flock($file, LOCK_UN); fclose($file); }
}

/** Fixed HTTPS endpoints, no redirects or automatic retry, no raw provider errors. */
function request(string $kind, array $payload, string $key): array {
    $paths = ['email' => '/v3/smtp/email', 'contact' => '/v3/contacts'];
    if (!isset($paths[$kind])) throw new \InvalidArgumentException('invalid_transport');
    $curl = curl_init('https://api.brevo.com' . $paths[$kind]);
    if ($curl === false) return ['ok' => false, 'http_code' => 0, 'messageId' => ''];
    try {
        if (!curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER => ['api-key: ' . $key, 'accept: application/json', 'content-type: application/json'], CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS])) return ['ok' => false, 'http_code' => 0, 'messageId' => ''];
        $body = curl_exec($curl); $code = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $result = $body === false ? null : json_decode($body, true);
        return ['ok' => $body !== false, 'http_code' => $code, 'messageId' => is_array($result) && validMessageId($result['messageId'] ?? null) ? $result['messageId'] : ''];
    } finally { curl_close($curl); }
}

function accepted(array $result): bool { return ($result['ok'] ?? false) === true && ($result['http_code'] ?? 0) === 201 && validMessageId($result['messageId'] ?? null); }
function escape(string $value): string { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Five attempts per connection per hour; state stays outside public_html. */
function consumeRateLimit(string $private, string $ip, string $key, int $now, string $kind='inquiry'): bool {
    if(!in_array($kind,['inquiry','token'],true))return false;
    $path=$private.'/mohfam-carwash-'.$kind.'-rate.json';
    if(is_link($path))return false;
    $file=@fopen($path,'c+');if($file===false)return false;
    try{
        if(!@chmod($path,0600)||!flock($file,LOCK_EX)||fstat($file)['size']>2000000)return false;
        $raw=stream_get_contents($file);$state=$raw===''?[]:json_decode($raw,true);if(!is_array($state))return false;
        foreach($state as $hash=>$times){
            if(!is_array($times))return false;
            $state[$hash]=array_values(array_filter($times,static function($time)use($now):bool{return is_int($time)&&$time>$now-3600;}));
            if(!$state[$hash])unset($state[$hash]);
        }
        $hash=hash_hmac('sha256','carwash-'.$kind.'-rate|'.$ip,$key);$times=$state[$hash]??[];
        if(count($times)>=($kind==='token'?60:5)||(!isset($state[$hash])&&count($state)>=10000))return false;
        $times[]=$now;$state[$hash]=$times;$json=json_encode($state,JSON_THROW_ON_ERROR);rewind($file);
        return ftruncate($file,0)&&fwrite($file,$json)===strlen($json)&&fflush($file);
    }finally{flock($file,LOCK_UN);fclose($file);}
}
function notificationPayload(array $fields,string $reference,\DateTimeImmutable $submitted): array {
    $details=['Reference'=>$reference,'Name'=>$fields['name'],'Email'=>$fields['email'],'Phone'=>$fields['phone'],
        'City / ZIP'=>$fields['location'],'Inquiry type'=>$fields['category'],'Message'=>$fields['message'],
        'Consent'=>'yes','Page URL'=>$fields['page_url'],
        'Submitted (UTC)'=>$submitted->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s T'),
        'Submitted (Los Angeles)'=>$submitted->setTimezone(new \DateTimeZone('America/Los_Angeles'))->format('Y-m-d H:i:s T (P)')];
    $text='';$html='<!doctype html><html lang="en"><body><h1>MohFam Car Wash inquiry</h1><table>';
    foreach($details as $label=>$value){$text.=$label.': '.$value."\n\n";$html.='<tr><th style="text-align:left;vertical-align:top;padding:8px">'.escape($label).'</th><td style="padding:8px">'.nl2br(escape($value)).'</td></tr>';}
    return ['sender'=>['name'=>'MohFam Car Wash','email'=>'website@mohfam.co'],'to'=>[['email'=>BACKUP,'name'=>'MohFam']],
        'replyTo'=>['email'=>$fields['email'],'name'=>$fields['name']],'tags'=>['inquiry-notification'],
        'subject'=>'[MohFam Car Wash] '.$fields['category'].' — '.$fields['name'],'textContent'=>$text,'htmlContent'=>$html.'</table></body></html>'];
}
function confirmationPayload(array $fields,string $reference): array {
    $first=preg_split('/\s+/u',$fields['name'],2)[0];
    $text='Hi '.$first.', we received your '.$fields['category'].'. MohFam Car Wash is a new division, and the team will contact you about services and availability in your area. Reference '.$reference.'. Questions: +1 (818) 818-1181.';
    $html='<!doctype html><html lang="en"><body style="margin:0;background:#f8f7f3;color:#1a1a1b;font-family:Arial,sans-serif">'
        .'<table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;background:white;border-top:4px solid #c5a059"><tr><td style="padding:24px">'
        .'<img src="'.SITE.'/assets/organization-logo.png" width="96" height="96" alt="MohFam Car Wash" style="display:block;border:0">'
        .'<p>Hi '.escape($first).', we received your '.escape($fields['category']).'.</p><p>MohFam Car Wash is a new division, and the team will contact you about services and availability in your area.</p>'
        .'<p>Reference '.escape($reference).'.</p><p>Questions: <a href="tel:+18188181181">+1 (818) 818-1181</a>.</p></td></tr></table></td></tr></table></body></html>';
    return ['sender'=>['name'=>'MohFam Car Wash','email'=>'website@mohfam.co'],'to'=>[['email'=>$fields['email'],'name'=>$fields['name']]],
        'replyTo'=>['email'=>BACKUP,'name'=>'MohFam Car Wash'],'subject'=>'We received your inquiry — MohFam Car Wash',
        'textContent'=>$text,'htmlContent'=>$html,'tags'=>['inquiry-confirmation']];
}
function contactPayload(array $fields,string $date): array {
    $name=preg_split('/\s+/u',$fields['name'],2);
    return ['email'=>$fields['email'],'updateEnabled'=>true,'listIds'=>[15],'attributes'=>['FIRSTNAME'=>$name[0],'LASTNAME'=>trim($name[1]??''),
        'SERVICE_INTEREST'=>$fields['category'],'SOURCE_SITE'=>'mohfamcarwash.com','LAST_INQUIRY_AT'=>$date]];
}

/** Independent attempts, after response completion. Neither changes visitor success. */
function followUps(array $fields, string $reference, string $date, callable $transport, callable $log): void {
    try {
        $result = $transport('email', confirmationPayload($fields, $reference));
        $log(accepted($result) ? 'confirmation_accepted' : 'confirmation_failed', (int)($result['http_code'] ?? 0), accepted($result) ? $result['messageId'] : '');
    } catch (\Throwable $error) { $log('confirmation_internal_error', 0, ''); }
    try {
        $result = $transport('contact', contactPayload($fields, $date));
        $ok = ($result['ok'] ?? false) === true && in_array($result['http_code'] ?? 0, [201, 204], true);
        $log($ok ? 'contact_synced' : 'contact_failed', (int)($result['http_code'] ?? 0), '');
    } catch (\Throwable $error) { $log('contact_internal_error', 0, ''); }
}

function afterResponse(array $job, string $root): void {
    ignore_user_abort(true); @set_time_limit(35);
    try {
        [$private, $key] = readiness($root);
        if (litespeed_finish_request() === false) { logEvent($private, $job['reference'], 'response_finish_failed'); return; }
        $log = static function (string $category, int $code, string $id) use ($private, $job): void { logEvent($private, $job['reference'], $category, $code, $id); };
        followUps($job['fields'], $job['reference'], $job['date'], static function (string $kind, array $payload) use ($key): array { return request($kind, $payload, $key); }, $log);
    } catch (\Throwable $error) { if (isset($private)) logEvent($private, $job['reference'], 'followup_internal_error'); }
}
