<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    http_response_code(200);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "db.php";

$personId = $_GET['personId'] ?? null;
$userId   = $_GET['userId'] ?? null;

if (!$personId || !$userId) {
    echo json_encode(["success" => true, "groups" => []]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT g.id, g.group_name, g.note
    FROM group_info g
    JOIN person_info p ON g.person_id = p.id
    WHERE g.person_id = ? AND p.user_id = ?
    ORDER BY g.group_name
");
$stmt->execute([$personId, $userId]);

echo json_encode([
    "success" => true,
    "groups" => $stmt->fetchAll()
]);
