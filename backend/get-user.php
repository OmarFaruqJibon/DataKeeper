<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
require_once "db.php";

$userId = $_GET['userId'] ?? '';

if (!$userId) {
    echo json_encode(['success' => false, 'error' => 'User ID missing']);
    exit;
}

$stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(['success' => false, 'error' => 'User not found']);
    exit;
}

echo json_encode([
    'success' => true,
    // 'phone' => $user['phone_number'],
    'name' => $user['name'],

]);
