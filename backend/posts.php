<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    http_response_code(200);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "db.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $personId = $_GET['personId'] ?? null;
    $groupId  = $_GET['groupId'] ?? null;
    $userId   = $_GET['userId'] ?? null;

    if (!$personId || !$groupId || !$userId) {
        http_response_code(400);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT p.id, p.post_details, p.comments, p.created_at
        FROM post_info p
        JOIN person_info pi ON p.person_id = pi.id
        WHERE p.person_id = ? AND p.group_id = ? AND pi.user_id = ?
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$personId, $groupId, $userId]);

    echo json_encode(["success" => true, "posts" => $stmt->fetchAll()]);
}

elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $personId = $input['personId'] ?? null;
    $groupId  = $input['groupId'] ?? null;
    $details  = $input['postDetails'] ?? null;
    $comments = $input['comments'] ?? null;
    $userId   = $input['userId'] ?? null;

    if (!$personId || !$groupId || !$details || !$userId) {
        http_response_code(400);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM person_info WHERE id = ? AND user_id = ?");
    $stmt->execute([$personId, $userId]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO post_info (person_id, group_id, post_details, comments)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$personId, $groupId, $details, $comments]);

    echo json_encode(["success" => true]);
}
