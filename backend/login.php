<?php
// ===== HANDLE CORS + PREFLIGHT =====
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(200);
    exit;
}

// ===== NORMAL HEADERS =====
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

require_once "db.php";

// ===== READ INPUT =====
$input = json_decode(file_get_contents("php://input"), true);

$phone = $input['phone'] ?? '';
$password = $input['password'] ?? '';

if (!$phone || !$password) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Phone and password required"
    ]);
    exit;
}

// ===== FIND USER =====
$stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE phone_number = ?");
$stmt->execute([$phone]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Invalid phone or password"
    ]);
    exit;
}

// ===== CREATE TOKEN =====
$token = bin2hex(random_bytes(32));

echo json_encode([
    "success" => true,
    "token" => $token,
    "userId" => $user['id']
]);
