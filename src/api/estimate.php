<?php
declare(strict_types=1);

/**
 * Estimate form. Validates the request, emails a branded recap to RECIPIENT,
 * and emails a branded thank-you to the visitor.
 * The build replaces the placeholder with ESTIMATE_TO.
 * Mail is sent from the domain mailbox so DreamHost will accept it.
 */

const RECIPIENT = '__ESTIMATE_TO__';
const FROM_ADDRESS = 'chris@greengardenlawncare.com';
const SEND_FAILURE = 'We could not send that. Please call 214-962-9089.';

header('X-Robots-Tag: noindex');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo 'Method not allowed';
    exit;
}

function field(string $name, int $max): string
{
    $value = isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
    $value = str_replace(["\r", "\n"], ' ', $value);
    if (strlen($value) > $max) {
        $value = substr($value, 0, $max);
    }
    return trim($value);
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function isEmail(string $value): bool
{
    return preg_match('/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/', $value) === 1;
}

function greetingName(string $name): string
{
    $parts = preg_split('/\s+/', $name) ?: [];
    $first = $parts[0] ?? '';
    return $first !== '' ? $first : $name;
}

function logoUrl(string $home): string
{
    $host = strtolower((string) preg_replace('/[^a-z0-9.:-]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    $local = $host === '' || $host === 'localhost' || str_starts_with($host, '127.');
    $origin = $local ? 'https://greengardenlawncare.com' : 'https://' . $host;
    return $origin . rtrim($home, '/') . '/assets/img/green-garden-lawn-care-logo.jpg';
}

/** @param array<string, string> $rows */
function plainDetails(array $rows): string
{
    $lines = [];
    foreach ($rows as $label => $value) {
        $lines[] = $label . ': ' . $value;
    }
    return implode("\n", $lines);
}

/** @param array<string, string> $rows */
function htmlDetails(array $rows): string
{
    $html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;border-collapse:collapse;">';
    foreach ($rows as $label => $value) {
        $html .= '<tr><td style="padding:10px 0;border-bottom:1px solid #E3E7E1;font-family:Arial,Helvetica,sans-serif;">'
            . '<div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1F5638;">' . h((string) $label) . '</div>'
            . '<div style="margin-top:4px;font-size:16px;line-height:1.45;color:#202923;">' . h($value) . '</div>'
            . '</td></tr>';
    }
    return $html . '</table>';
}

function brandedHtml(string $logo, string $headline, string $introHtml, string $detailsHtml, string $closingHtml): string
{
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'
        . h($headline) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#F8F7F2;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F2;"><tr><td align="center" style="padding:32px 16px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E3E7E1;border-radius:8px;">'
        . '<tr><td align="center" style="background:#103D27;padding:28px 24px 24px;">'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;"><tr><td style="padding:12px 16px;">'
        . '<img src="' . h($logo) . '" width="180" alt="Green Garden Lawn Care" style="display:block;width:180px;height:auto;border:0;">'
        . '</td></tr></table>'
        . '<div style="margin-top:16px;font-family:Georgia,Times New Roman,serif;font-size:22px;line-height:1.2;color:#ffffff;">Green Garden</div>'
        . '<div style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;color:#C6A35A;">LAWN CARE</div>'
        . '</td></tr>'
        . '<tr><td style="padding:32px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:#202923;">'
        . '<h1 style="margin:0 0 12px;font-family:Georgia,Times New Roman,serif;font-weight:400;font-size:28px;line-height:1.2;color:#103D27;">' . h($headline) . '</h1>'
        . '<p style="margin:0;font-size:16px;line-height:1.6;color:#4A554E;">' . $introHtml . '</p>'
        . $detailsHtml
        . '<p style="margin:20px 0 28px;font-size:16px;line-height:1.6;color:#4A554E;">' . $closingHtml . '</p>'
        . '</td></tr>'
        . '<tr><td align="center" style="background:#103D27;padding:20px 24px;font-family:Arial,Helvetica,sans-serif;">'
        . '<a href="tel:2149629089" style="color:#C6A35A;font-size:18px;font-weight:700;text-decoration:none;">214-962-9089</a>'
        . '<div style="margin-top:6px;font-size:13px;color:#F8F7F2;">Serving homeowners across North Texas</div>'
        . '</td></tr></table>'
        . '<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6B756E;">Green Garden Lawn Care · Beautiful homes. Every season.</p>'
        . '</td></tr></table></body></html>';
}

function deliver(string $to, string $subject, string $plain, string $html, string $replyTo): bool
{
    $boundary = 'gg_' . bin2hex(random_bytes(8));
    $headers = implode("\r\n", [
        'From: Green Garden Lawn Care <' . FROM_ADDRESS . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ]);
    $body = "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $plain . "\r\n"
        . "--{$boundary}\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $html . "\r\n"
        . "--{$boundary}--\r\n";

    $sink = getenv('ESTIMATE_MAIL_SINK');
    if (is_string($sink) && $sink !== '') {
        $record = "To: {$to}\nSubject: {$subject}\n{$headers}\n\n{$body}\n";
        return file_put_contents($sink, $record, FILE_APPEND) !== false;
    }
    return mail($to, $subject, $body, $headers, '-f' . FROM_ADDRESS);
}

function respond(bool $ok, array $errors, int $status, string $home): void
{
    http_response_code($status);
    if (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Content-Type: text/html; charset=utf-8');
    $title = $ok ? 'Estimate request received' : 'Check your estimate request';
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="robots" content="noindex">';
    echo '<title>' . h($title) . ' | Green Garden Lawn Care</title></head><body><main>';
    if ($ok) {
        echo '<h1>Thanks — we\'ve got your request.</h1>';
        echo '<p>Chris will reach out shortly to talk through your project and schedule a free estimate. Need something sooner? Call <a href="tel:2149629089">214-962-9089</a>.</p>';
    } else {
        echo '<h1>Please check your request.</h1><ul>';
        foreach ($errors as $error) {
            echo '<li>' . h($error) . '</li>';
        }
        echo '</ul>';
    }
    echo '<p><a href="' . h($home) . '">Back to Green Garden Lawn Care</a></p></main></body></html>';
    exit;
}

$prefix = trim((string) (getenv('PATH_PREFIX') ?: ''), '/');
$home = ($prefix === '' ? '' : '/' . $prefix) . '/';

if (field('leave_blank', 200) !== '') {
    respond(true, [], 200, $home);
}

$name = field('name', 120);
$phone = field('phone', 40);
$email = field('email', 120);
$service = field('service', 80);
$address = field('address', 160);
$notes = field('notes', 2000);

$errors = [];
if ($name === '') {
    $errors[] = 'Please enter your name.';
}
if (!preg_match('/^[\d\s().+-]{10,}$/', $phone)) {
    $errors[] = 'Enter a valid phone number.';
}
if (!isEmail($email)) {
    $errors[] = 'Enter a valid email address.';
}
if ($service === '') {
    $errors[] = 'Choose a service.';
}
if ($address === '') {
    $errors[] = 'Enter an address or ZIP code.';
}
if ($errors !== []) {
    respond(false, $errors, 422, $home);
}

if (!isEmail(RECIPIENT) || !isEmail(FROM_ADDRESS)) {
    respond(false, [SEND_FAILURE], 503, $home);
}

$rows = [
    'Name' => $name,
    'Phone' => $phone,
    'Email' => $email,
    'Service' => $service,
    'Address' => $address,
    'Notes' => $notes === '' ? '(none)' : $notes,
];
$logo = logoUrl($home);
$details = htmlDetails($rows);
$plain = plainDetails($rows);

$staffIntro = 'A new estimate request just came in from <strong style="color:#103D27;">' . h($name) . '</strong>.';
$staffClosing = 'Reply to this email to reach ' . h($name) . '.';
$staffPlain = "New estimate request from {$name}\n\n{$plain}\n\nReply to this message to reach the customer.\n\nGreen Garden Lawn Care\n214-962-9089\n";
$staffHtml = brandedHtml($logo, 'New estimate request', $staffIntro, $details, $staffClosing);
if (!deliver(RECIPIENT, 'New estimate request from ' . $name, $staffPlain, $staffHtml, $email)) {
    respond(false, [SEND_FAILURE], 503, $home);
}

$hello = greetingName($name);
$visitorIntro = 'Thanks, ' . h($hello) . '. We received your request for <strong style="color:#103D27;">' . h($service) . '</strong> at <strong style="color:#103D27;">' . h($address) . '</strong>. Chris will reach out shortly to talk through your project and schedule a free estimate.';
$visitorClosing = 'Need something sooner? Call <a href="tel:2149629089" style="color:#103D27;font-weight:700;text-decoration:none;">214-962-9089</a>.';
$visitorPlain = "Thanks, {$hello}.\n\nWe received your request for {$service} at {$address}. Chris will reach out shortly to talk through your project and schedule a free estimate.\n\n{$plain}\n\nNeed something sooner? Call 214-962-9089.\n\nGreen Garden Lawn Care\n";
$visitorHtml = brandedHtml($logo, 'Thanks for your estimate request', $visitorIntro, $details, $visitorClosing);
if (!deliver($email, 'Thanks for your estimate request', $visitorPlain, $visitorHtml, FROM_ADDRESS)) {
    respond(false, [SEND_FAILURE], 503, $home);
}

respond(true, [], 200, $home);
