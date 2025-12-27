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
    // Get all persons for this user
    $stmt = $pdo->prepare("
        SELECT occupation, age, profile_name, created_at
        FROM person_info
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
    ");
    $stmt->execute([$userId]);
    $persons = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate age distribution
    $ageRanges = [
        ['range' => '18-25', 'min' => 18, 'max' => 25],
        ['range' => '26-35', 'min' => 26, 'max' => 35],
        ['range' => '36-45', 'min' => 36, 'max' => 45],
        ['range' => '46-55', 'min' => 46, 'max' => 55],
        ['range' => '56+', 'min' => 56, 'max' => 200],
    ];
    
    $ageDistribution = [];
    foreach ($ageRanges as $range) {
        $count = 0;
        foreach ($persons as $person) {
            $age = (int)$person['age'];
            if ($age >= $range['min'] && $age <= $range['max']) {
                $count++;
            }
        }
        $ageDistribution[] = [
            'range' => $range['range'],
            'count' => $count
        ];
    }

    // Calculate top occupations
    $occupationCounts = [];
    foreach ($persons as $person) {
        $occupation = trim($person['occupation'] ?? '');
        if (!empty($occupation) && strtolower($occupation) !== 'null') {
            if (!isset($occupationCounts[$occupation])) {
                $occupationCounts[$occupation] = 0;
            }
            $occupationCounts[$occupation]++;
        }
    }
    
    // Sort occupations by count and get top 5
    arsort($occupationCounts);
    $topOccupations = [];
    $counter = 0;
    foreach ($occupationCounts as $occupation => $count) {
        $topOccupations[] = [
            'occupation' => $occupation,
            'count' => $count
        ];
        $counter++;
        if ($counter >= 5) break;
    }

    // Get recent activity (last 5 activities)
    $recentActivity = [];
    
    // Recent persons added (last 3)
    $stmt = $pdo->prepare("
        SELECT 
            'person_added' as type,
            CONCAT('Added ', profile_name) as description,
            created_at,
            CASE 
                WHEN DATE(created_at) = CURDATE() THEN 'Today'
                WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Yesterday'
                WHEN DATEDIFF(CURDATE(), DATE(created_at)) <= 7 THEN CONCAT(DATEDIFF(CURDATE(), DATE(created_at)), ' days ago')
                ELSE DATE_FORMAT(created_at, '%b %d')
            END as time_ago
        FROM person_info
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 3
    ");
    $stmt->execute([$userId]);
    $recentPersons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentPersons as $person) {
        $recentActivity[] = [
            'type' => $person['type'],
            'description' => $person['description'],
            'time' => $person['time_ago']
        ];
    }
    
    // Recent groups created (last 2)
    $stmt = $pdo->prepare("
        SELECT 
            'group_created' as type,
            CONCAT('Created ', g.group_name) as description,
            g.created_at,
            CASE 
                WHEN DATE(g.created_at) = CURDATE() THEN 'Today'
                WHEN DATE(g.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Yesterday'
                WHEN DATEDIFF(CURDATE(), DATE(g.created_at)) <= 7 THEN CONCAT(DATEDIFF(CURDATE(), DATE(g.created_at)), ' days ago')
                ELSE DATE_FORMAT(g.created_at, '%b %d')
            END as time_ago
        FROM group_info g
        JOIN person_info p ON g.person_id = p.id
        WHERE p.user_id = ?
        ORDER BY g.created_at DESC
        LIMIT 2
    ");
    $stmt->execute([$userId]);
    $recentGroups = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentGroups as $group) {
        $recentActivity[] = [
            'type' => $group['type'],
            'description' => $group['description'],
            'time' => $group['time_ago']
        ];
    }
    
    // Sort recent activity by time (newest first)
    usort($recentActivity, function($a, $b) {
        $timeA = strtotime(str_replace(['Today', 'Yesterday', ' days ago'], ['now', 'yesterday', ' days ago'], $a['time']));
        $timeB = strtotime(str_replace(['Today', 'Yesterday', ' days ago'], ['now', 'yesterday', ' days ago'], $b['time']));
        return $timeB - $timeA;
    });

    // Limit to 5 activities
    $recentActivity = array_slice($recentActivity, 0, 5);

    echo json_encode([
        "success" => true,
        "ageDistribution" => $ageDistribution,
        "topOccupations" => $topOccupations,
        "recentActivity" => $recentActivity,
        "totalPersons" => count($persons)
    ]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>