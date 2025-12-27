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
    $userId = $_GET['userId'] ?? null;
    if (!$userId) {
        http_response_code(401);
        echo json_encode(["success" => false]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT g.id, g.group_name, g.person_id
        FROM group_info g
        JOIN person_info p ON g.person_id = p.id
        WHERE p.user_id = ?
        ORDER BY g.group_name
    ");
    $stmt->execute([$userId]);

    echo json_encode(["success" => true, "groups" => $stmt->fetchAll()]);
}

elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    $personId  = $input['personId'] ?? null;
    $groupName = $input['groupName'] ?? null;
    $userId    = $input['userId'] ?? null;
    $note      = $input['note'] ?? null;

    if (!$personId || !$groupName || !$userId) {
        http_response_code(400);
        echo json_encode(["success" => false]);
        exit;
    }

    // Ownership check
    $stmt = $pdo->prepare("SELECT id FROM person_info WHERE id = ? AND user_id = ?");
    $stmt->execute([$personId, $userId]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO group_info (group_name, note, person_id) VALUES (?, ?, ?)"
    );
    $stmt->execute([$groupName, $note, $personId]);

    echo json_encode([
        "success" => true,
        "group" => [
            "id" => $pdo->lastInsertId(),
            "group_name" => $groupName,
            "person_id" => $personId
        ]
    ]);
}
