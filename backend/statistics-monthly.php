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

// ===============================
// INPUT
// ===============================
$userId = $_GET['userId'] ?? null;
$period = $_GET['period'] ?? 'month'; // week | month | year

if (!$userId) {
    echo json_encode([
        "success" => false,
        "error"   => "User ID required"
    ]);
    exit;
}

try {

    $dateFormat  = '%b %Y';        // Jan 2025
    $intervalSql = "INTERVAL 6 MONTH";
    $limit       = 6;

    switch ($period) {
        case 'week':
            $dateFormat  = '%v %Y'; // Week + year
            $intervalSql = "INTERVAL 12 WEEK";
            $limit       = 12;
            break;

        case 'year':
            $dateFormat  = '%Y';
            $intervalSql = "INTERVAL 5 YEAR";
            $limit       = 5;
            break;

        default: // month
            $dateFormat  = '%b %Y';
            $intervalSql = "INTERVAL 6 MONTH";
            $limit       = 6;
    }

    // FORCE INTEGER (important for LIMIT safety)
    $limit = (int)$limit;

    $sql = "
        SELECT
            COUNT(*) AS count,
            DATE_FORMAT(created_at, '%Y-%m') AS period_key,
            DATE_FORMAT(created_at, ?) AS period_label
        FROM person_info
        WHERE user_id = ?
          AND created_at >= DATE_SUB(NOW(), $intervalSql)
        GROUP BY period_key, period_label
        ORDER BY period_key ASC
        LIMIT $limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$dateFormat, $userId]);
    $personsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "
        SELECT
            COUNT(*) AS count,
            DATE_FORMAT(c.created_at, '%Y-%m') AS period_key,
            DATE_FORMAT(c.created_at, ?) AS period_label
        FROM call_info c
        JOIN person_info p ON c.person_id = p.id
        WHERE p.user_id = ?
          AND c.created_at >= DATE_SUB(NOW(), $intervalSql)
        GROUP BY period_key, period_label
        ORDER BY period_key ASC
        LIMIT $limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$dateFormat, $userId]);
    $callsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $labels = [];

    for ($i = $limit - 1; $i >= 0; $i--) {
        if ($period === 'week') {
            $labels[] = date('W Y', strtotime("-$i weeks"));
        } elseif ($period === 'year') {
            $labels[] = (string)(date('Y') - $i);
        } else {
            $labels[] = date('M Y', strtotime("-$i months"));
        }
    }

    $personsData = array_fill_keys($labels, 0);
    $callsData   = array_fill_keys($labels, 0);

    foreach ($personsRaw as $row) {
        if (isset($personsData[$row['period_label']])) {
            $personsData[$row['period_label']] = (int)$row['count'];
        }
    }

    foreach ($callsRaw as $row) {
        if (isset($callsData[$row['period_label']])) {
            $callsData[$row['period_label']] = (int)$row['count'];
        }
    }

    $personsFormatted = [];
    $callsFormatted   = [];

    foreach ($labels as $label) {
        $personsFormatted[] = [
            "label" => $label,
            "count" => $personsData[$label]
        ];
        $callsFormatted[] = [
            "label" => $label,
            "count" => $callsData[$label]
        ];
    }

    echo json_encode([
        "success" => true,
        "period"  => $period,
        "persons" => $personsFormatted,
        "calls"   => $callsFormatted
    ]);

} catch (Exception $e) {
    error_log("Monthly statistics error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "error"   => "Server error"
    ]);
}
