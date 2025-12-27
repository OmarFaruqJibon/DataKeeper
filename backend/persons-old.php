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

$q = $_GET['q'] ?? '';
$userId = $_GET['userId'] ?? null;

if (!$userId) {
    echo json_encode(["success" => false, "error" => "User ID required"]);
    exit;
}

try {
    if (strlen($q) < 2) {
        // If search query is too short, return all persons for this user
        $stmt = $pdo->prepare("
            SELECT id, profile_name, profile_id, phone_number, address, occupation, age, profile_pic
            FROM person_info
            WHERE user_id = ?
            ORDER BY profile_name
            LIMIT 50
        ");
        $stmt->execute([$userId]);
    } else {
        // If search query is 2+ characters, do the search
        $searchTerm = "%" . $q . "%";
        $stmt = $pdo->prepare("
            SELECT id, profile_name, profile_id, phone_number, address, occupation, age, profile_pic
            FROM person_info
            WHERE user_id = ? AND profile_name LIKE ?
            ORDER BY profile_name
            LIMIT 10
        ");
        $stmt->execute([$userId, $searchTerm]);
    }

    $persons = $stmt->fetchAll();

    // Add full URL for profile pictures
    foreach ($persons as &$person) {
        if ($person['profile_pic']) {
            $person['profile_pic_url'] = "http://" . $_SERVER['HTTP_HOST'] . "/data/uploads/profile_pics/" . $person['profile_pic'];
        } else {
            $person['profile_pic_url'] = null;
        }
    }

    echo json_encode([
        "success" => true,
        "persons" => $persons
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>