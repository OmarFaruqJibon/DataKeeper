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
    $userId = $_GET['userId'] ?? null;

    if (!$personId || !$userId) {
        echo json_encode(["success" => false, "error" => "Missing parameters"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM person_info WHERE id = ? AND user_id = ?");
        $stmt->execute([$personId, $userId]);
        
        if (!$stmt->fetch()) {
            echo json_encode(["success" => false, "error" => "Person not found or access denied"]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT id, call_message, note, person_id, created_at
            FROM call_info 
            WHERE person_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->execute([$personId]);
        $calls = $stmt->fetchAll();

        echo json_encode(["success" => true, "calls" => $calls]);

    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    $userId = $input['userId'] ?? null;
    $personId = $input['personId'] ?? null;
    $callMessage = $input['callMessage'] ?? '';
    $note = $input['note'] ?? '';

    // FIXED: Removed $callDate check since we removed the column
    if (!$userId || !$personId) {
        echo json_encode(["success" => false, "error" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM person_info WHERE id = ? AND user_id = ?");
        $stmt->execute([$personId, $userId]);
        
        if (!$stmt->fetch()) {
            echo json_encode(["success" => false, "error" => "Person not found or access denied"]);
            exit;
        }

        // FIXED: Removed call_date from INSERT and reduced parameters to 3
        $stmt = $pdo->prepare("
            INSERT INTO call_info (call_message, note, person_id) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$callMessage, $note, $personId]);
        
        $callId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("
            SELECT id, call_message, note, person_id, created_at
            FROM call_info WHERE id = ?
        ");
        $stmt->execute([$callId]);
        $call = $stmt->fetch();
        
        echo json_encode(["success" => true, "call" => $call]);
        
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    
} else {
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>