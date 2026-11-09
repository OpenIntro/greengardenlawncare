<?php
declare(strict_types=1);

/**
 * Estimate form. Validates and confirms the request.
 * ESTIMATE_TO is reserved and unused: email is not sent.
 */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo 'Method not allowed';
    exit;
}

function field(string $name, int $max): string
{
    $value = isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
    if (strlen($value) > $max) {
        $value = substr($value, 0, $max);
    }
    return $value;
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$name = field('name', 120);
$phone = field('phone', 40);
$email = field('email', 120);
$service = field('service', 80);
$address = field('address', 160);

$errors = [];
if ($name === '') {
    $errors[] = 'Please enter your name.';
}
if (!preg_match('/^[\d\s().+-]{10,}$/', $phone)) {
    $errors[] = 'Enter a valid phone number.';
}
if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email)) {
    $errors[] = 'Enter a valid email address.';
}
if ($service === '') {
    $errors[] = 'Choose a service.';
}
if ($address === '') {
    $errors[] = 'Enter an address or ZIP code.';
}

$ok = $errors === [];
if (!$ok) {
    http_response_code(422);
}

$prefix = trim((string) (getenv('PATH_PREFIX') ?: ''), '/');
$home = ($prefix === '' ? '' : '/' . $prefix) . '/';

if (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'errors' => $errors]);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $ok ? 'Estimate request received' : 'Check your estimate request' ?> | Green Garden Lawn Care</title>
</head>
<body>
<main>
<?php if ($ok): ?>
<h1>Thanks — we've got your request.</h1>
<p>Chris will reach out shortly to talk through your project and schedule a free estimate. Need something sooner? Call 214-962-9089.</p>
<p>No email was sent.</p>
<?php else: ?>
<h1>Please check your request.</h1>
<ul>
<?php foreach ($errors as $error): ?>
<li><?= h($error) ?></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>
<p><a href="<?= h($home) ?>">Back to Green Garden Lawn Care</a></p>
</main>
</body>
</html>
