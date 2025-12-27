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

$userId = $_GET['userId'] ?? null;

if (!$userId) {
    echo json_encode(["success" => false, "error" => "User ID required"]);
    exit;
}

try {
    // Get total persons count
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM person_info WHERE user_id = ?");
    $stmt->execute([$userId]);
    $totalPersons = $stmt->fetch()['count'];

    // Get total groups count
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT g.id) as count 
        FROM group_info g
        JOIN person_info p ON g.person_id = p.id
        WHERE p.user_id = ?
    ");
    $stmt->execute([$userId]);
    $totalGroups = $stmt->fetch()['count'];

    // Get total calls count
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM call_info c
        JOIN person_info p ON c.person_id = p.id
        WHERE p.user_id = ?
    ");
    $stmt->execute([$userId]);
    $totalCalls = $stmt->fetch()['count'];

    // Get total posts count
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM post_info po
        JOIN person_info p ON po.person_id = p.id
        WHERE p.user_id = ?
    ");
    $stmt->execute([$userId]);
    $totalPosts = $stmt->fetch()['count'];

    // Calculate growth rate (persons added in last 30 days vs previous 30 days)
    $currentPeriodStart = date('Y-m-d', strtotime('-30 days'));
    $previousPeriodStart = date('Y-m-d', strtotime('-60 days'));
    $previousPeriodEnd = date('Y-m-d', strtotime('-31 days'));
    
    // Persons added in current period (last 30 days)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM person_info 
        WHERE user_id = ? 
        AND created_at >= ?
    ");
    $stmt->execute([$userId, $currentPeriodStart]);
    $currentPeriodCount = (int)$stmt->fetch()['count'];
    
    // Persons added in previous period (31-60 days ago)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM person_info 
        WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at < ?
    ");
    $stmt->execute([$userId, $previousPeriodStart, $previousPeriodEnd]);
    $previousPeriodCount = (int)$stmt->fetch()['count'];
    
    $growthRate = 0;
    if ($previousPeriodCount > 0) {
        $growthRate = round((($currentPeriodCount - $previousPeriodCount) / $previousPeriodCount) * 100);
    } elseif ($currentPeriodCount > 0) {
        $growthRate = 100; // Growth from 0
    }

    echo json_encode([
        "success" => true,
        "totalPersons" => (int)$totalPersons,
        "totalGroups" => (int)$totalGroups,
        "totalCalls" => (int)$totalCalls,
        "totalPosts" => (int)$totalPosts,
        "growthRate" => $growthRate,
        "currentPeriodCount" => $currentPeriodCount,
        "previousPeriodCount" => $previousPeriodCount
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>