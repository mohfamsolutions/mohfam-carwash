<?php
declare(strict_types=1);
namespace MohFam\CarWash {
    // Namespaced cURL stubs exercise the actual transport without a network call.
    function curl_init($url) { $GLOBALS['transport_url'] = $url; return new \stdClass(); }
    function curl_setopt_array($curl, $options) { $GLOBALS['transport_options'] = $options; return true; }
    function curl_exec($curl) { $GLOBALS['transport_events'][] = 'request'; return $GLOBALS['transport_body']; }
    function curl_getinfo($curl, $option) { return $GLOBALS['transport_code']; }
    function curl_close($curl) {}
    function curl_version() { return ['protocols' => ['https']]; }
    function litespeed_finish_request() { $GLOBALS['transport_events'][] = 'response_finished'; return $GLOBALS['finish_result']; }
}
namespace {
    require __DIR__ . '/../hosting/api/inquiry-mail.php';
    if (!function_exists('curl_init')) { function curl_init() {} }
    if (!function_exists('litespeed_finish_request')) { function litespeed_finish_request() {} }
    // Portable local PHP installations may omit the extension; these mocks never use it.
    foreach (['CURLOPT_POST', 'CURLOPT_POSTFIELDS', 'CURLOPT_HTTPHEADER', 'CURLOPT_RETURNTRANSFER', 'CURLOPT_TIMEOUT', 'CURLOPT_CONNECTTIMEOUT', 'CURLOPT_SSL_VERIFYPEER', 'CURLOPT_SSL_VERIFYHOST', 'CURLOPT_FOLLOWLOCATION', 'CURLOPT_PROTOCOLS', 'CURLPROTO_HTTPS', 'CURLINFO_HTTP_CODE'] as $index => $name) if (!defined($name)) define($name, 10000 + $index);
    function transportCheck(bool $ok, string $message): void { if (!$ok) throw new \RuntimeException($message); }
    $GLOBALS['transport_code'] = 201;
    $GLOBALS['transport_body'] = '{"messageId":"<synthetic@example.test>"}';
    $result = \MohFam\CarWash\request('email', ['subject' => 'Synthetic fixture'], 'synthetic-key');
    transportCheck(\MohFam\CarWash\accepted($result), 'Valid 201/messageId rejected');
    transportCheck($GLOBALS['transport_url'] === 'https://api.brevo.com/v3/smtp/email', 'Unexpected notification endpoint');
    $options = $GLOBALS['transport_options'];
    transportCheck($options[CURLOPT_SSL_VERIFYPEER] === true && $options[CURLOPT_SSL_VERIFYHOST] === 2 && $options[CURLOPT_FOLLOWLOCATION] === false && $options[CURLOPT_PROTOCOLS] === CURLPROTO_HTTPS, 'TLS or redirect protections missing');
    transportCheck($options[CURLOPT_TIMEOUT] === 10 && $options[CURLOPT_CONNECTTIMEOUT] === 5 && $options[CURLOPT_POST] === true, 'Transport method/timeouts incorrect');
    transportCheck(in_array('api-key: synthetic-key', $options[CURLOPT_HTTPHEADER], true), 'Authentication header missing');
    foreach ([[200, '{"messageId":"<id@test>"}'], [201, '{}'], [201, 'invalid-json'], [201, '{"messageId":["invalid"]}'], [201, '{"messageId":"bad value"}'], [400, '{"message":"never-log-provider-body"}'], [0, false]] as [$code, $body]) {
        $GLOBALS['transport_code'] = $code; $GLOBALS['transport_body'] = $body;
        $result = \MohFam\CarWash\request('email', [], 'synthetic-key');
        transportCheck(!\MohFam\CarWash\accepted($result), 'Unaccepted provider response counted as success');
        transportCheck(array_keys($result) === ['ok', 'http_code', 'messageId'] && strpos(json_encode($result), 'never-log-provider-body') === false, 'Transport exposed provider body');
    }
    $GLOBALS['transport_code'] = 204; $GLOBALS['transport_body'] = '';
    $result = \MohFam\CarWash\request('contact', ['listIds' => [15], 'updateEnabled' => true], 'synthetic-key');
    transportCheck($GLOBALS['transport_url'] === 'https://api.brevo.com/v3/contacts' && $result['ok'] === true && $result['http_code'] === 204, 'Contact upsert endpoint/status incorrect');
    $temp = sys_get_temp_dir() . '/carwash-after-response-test-' . bin2hex(random_bytes(8));
    mkdir($temp, 0700); mkdir($temp . '/public_html'); mkdir($temp . '/public_html/mohfamcarwash.com'); mkdir($temp . '/private');
    file_put_contents($temp . '/private/mohfam-mail.php', '<?php return ["brevo_api_key"=>"synthetic-private-config-for-testing-only"];');
    try {
        $job = ['reference' => str_repeat('a', 24), 'date' => '2026-11-14', 'fields' => ['name' => 'Test Visitor', 'email' => 'visitor@example.com', 'category' => 'Personal vehicle inquiry']];
        $GLOBALS['transport_code'] = 201; $GLOBALS['transport_body'] = '{"messageId":"<synthetic@example.test>"}';
        $GLOBALS['transport_events'] = []; $GLOBALS['finish_result'] = true;
        \MohFam\CarWash\afterResponse($job, $temp . '/public_html/mohfamcarwash.com');
        transportCheck($GLOBALS['transport_events'] === ['response_finished', 'request', 'request'], 'Follow-ups ran before response completion or in wrong count');
        $GLOBALS['transport_events'] = []; $GLOBALS['finish_result'] = false;
        \MohFam\CarWash\afterResponse($job, $temp . '/public_html/mohfamcarwash.com');
        transportCheck($GLOBALS['transport_events'] === ['response_finished'], 'Follow-ups ran after a failed response finish');
        $log = file_get_contents($temp . '/private/mohfam-carwash-inquiry.log');
        transportCheck(strpos($log, 'response_finish_failed') !== false && strpos($log, 'visitor@example.com') === false, 'After-response logs missing guard or expose address');
    } finally {
        foreach (['mohfam-mail.php', 'mohfam-carwash-inquiry.log'] as $file) if (file_exists($temp . '/private/' . $file)) unlink($temp . '/private/' . $file);
        rmdir($temp . '/private'); rmdir($temp . '/public_html/mohfamcarwash.com'); rmdir($temp . '/public_html'); rmdir($temp);
    }
    echo "Transport checks passed: fixed endpoints, TLS, timeouts, strict acceptance, and sanitized responses. All cURL calls mocked; no requests sent.\n";
}
