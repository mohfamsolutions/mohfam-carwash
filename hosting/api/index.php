<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
function reply(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['message' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}
set_exception_handler(function (Throwable $e): void { reply(503, 'The inquiry form is temporarily unavailable. Your inquiry was not sent. Please contact MohFam directly.'); });
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (($origin !== '' && $origin !== 'https://mohfamcarwash.com') || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
    reply(403, 'The request origin was not accepted. Your entries are still here.');
}
$route = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$isToken = $route === '/api/csrf';
if (!$isToken && $route !== '/api/inquiry') reply(404, 'Endpoint not found.');
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (($isToken && $method !== 'GET') || (!$isToken && $method !== 'POST')) {
    header('Allow: ' . ($isToken ? 'GET' : 'POST'));
    reply(405, 'Method not allowed.');
}
if (!$isToken && $origin !== 'https://mohfamcarwash.com') reply(403, 'The request origin was not accepted. Your entries are still here.');

// Only server-observed client addresses are used; untrusted proxy headers are ignored.
$rateDir = sys_get_temp_dir() . '/mohfam-carwash-' . substr(hash('sha256', __DIR__), 0, 20);
if (!is_dir($rateDir) && !mkdir($rateDir, 0700, true) && !is_dir($rateDir)) reply(503, 'The secure form is temporarily unavailable.');
if (is_link($rateDir)) reply(503, 'The secure form is temporarily unavailable.');
$ratePath = $rateDir . '/' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown') . '.json';
if (is_link($ratePath)) reply(503, 'The secure form is temporarily unavailable.');
$rateFile = fopen($ratePath, 'c+');
if (!$rateFile || !flock($rateFile, LOCK_EX)) reply(503, 'The secure form is temporarily unavailable.');
chmod($ratePath, 0600);
$raw = stream_get_contents($rateFile);
$rate = json_decode($raw ?: '{}', true);
$now = time();
if (!is_array($rate) || ($rate['start'] ?? 0) + 3600 <= $now) $rate = ['start' => $now, 'attempts' => 0, 'tokens' => 0];
$key = $isToken ? 'tokens' : 'attempts';
$rate[$key] = (int)($rate[$key] ?? 0) + 1;
rewind($rateFile); ftruncate($rateFile, 0); fwrite($rateFile, json_encode($rate)); fflush($rateFile); flock($rateFile, LOCK_UN); fclose($rateFile);
// Remove stale hashed abuse counters; never store inquiry contents.
foreach (glob($rateDir . '/*.json') ?: [] as $old) {
    if (!is_link($old) && filemtime($old) < $now - 3700) @unlink($old);
}
if ($rate[$key] > ($isToken ? 60 : 5)) {
    header('Retry-After: ' . max(1, $rate['start'] + 3600 - $now));
    reply(429, 'Too many attempts. Please try again in an hour or contact MohFam directly. Your entries are still here.');
}
session_name('mohfam_carwash');
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime' => 1800, 'path' => '/api', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
if (!session_start()) reply(503, 'The secure form is temporarily unavailable.');
if ($isToken) {
    session_regenerate_id(true);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $_SESSION['created'] = microtime(true);
    echo json_encode(['token' => $_SESSION['csrf']]);
    exit;
}
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') reply(415, 'Use the website form to submit your inquiry.');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) reply(413, 'The inquiry is too long.');
$body = file_get_contents('php://input', false, null, 0, 16385);
if ($body === false || strlen($body) > 16384) reply(413, 'The inquiry is too long.');
$data = json_decode($body, true);
if (!is_array($data)) reply(400, 'The inquiry could not be read.');
if (!is_string($data['csrf'] ?? null) || !isset($_SESSION['csrf'], $_SESSION['created']) || microtime(true) - $_SESSION['created'] > 1800 || !hash_equals($_SESSION['csrf'], $data['csrf'])) reply(403, 'Your secure form session expired or could not be verified. Your entries are still here; please retry.');
foreach (['name'=>100, 'email'=>254, 'phone'=>30, 'location'=>100, 'category'=>30, 'message'=>4000, 'website'=>200, 'csrf'=>100] as $field=>$limit) {
    if (!is_string($data[$field] ?? null) || strlen($data[$field]) > $limit * 4 || preg_match_all('/./us', $data[$field]) > $limit) reply(422, 'Please check the ' . $field . ' field. Your entries are still here.');
}
foreach (['name','email','phone','location','category'] as $field) {
    if (preg_match('/[\x00-\x1f\x7f]/', $data[$field])) reply(422, 'Please remove invalid characters from your entries. Your entries are still here.');
}
if (strlen(trim($data['name'])) < 2 || trim($data['location']) === '') reply(422, 'Please enter your name and city or ZIP code. Your entries are still here.');
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) reply(422, 'Please enter a valid email address. Your entries are still here.');
if ($data['phone'] !== '' && !preg_match('/^[+\d ()\-.]{6,30}$/D', $data['phone'])) reply(422, 'Please check your phone number. Your entries are still here.');
if (!in_array($data['category'], ['personal','household','business','other'], true) || ($data['consent'] ?? false) !== true) reply(422, 'Please select an inquiry type and agree to the privacy notice. Your entries are still here.');
if (strlen(trim($data['message'])) < 10 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $data['message'])) reply(422, 'Please check your message. Your entries are still here.');
if ($data['website'] !== '' || microtime(true) - $_SESSION['created'] < 2.5) reply(422, 'Please wait a few seconds, check the form and try again. Your entries are still here.');
// Delivery deliberately disabled until sender DNS authentication and inbox receipt are verified.
// Future transport must use this fixed recipient/prefix and the validated visitor email as Reply-To.
$recipient = 'mohfamsolutions@gmail.com';
$subject = '[MohFam Car Wash] ' . $data['category'] . ' inquiry';
$replyTo = $data['email'];
reply(503, 'Online inquiry delivery is not yet enabled. Your inquiry has NOT been sent. Your entries are still here. Please call +1 (818) 818-1181 or email mohfamsolutions@gmail.com.');
