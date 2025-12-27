<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    http_response_code(200);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "db.php";

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Debug logging
$debugLog = __DIR__ . '/debug.log';
file_put_contents($debugLog, "\n" . date('Y-m-d H:i:s') . " - Request started\n", FILE_APPEND);
file_put_contents($debugLog, "POST data: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents($debugLog, "FILES data: " . print_r($_FILES, true) . "\n", FILE_APPEND);

// Get the request body for debugging
$input = file_get_contents("php://input");
file_put_contents($debugLog, "Raw input (first 500 chars): " . substr($input, 0, 500) . "\n", FILE_APPEND);

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

// Get user ID from POST or FILES
$userId = $_POST['userId'] ?? null;
if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "User ID required"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Handle profile picture upload
    $profilePic = null;
    
    file_put_contents($debugLog, "Checking for profile_pic file\n", FILE_APPEND);
    
    if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === UPLOAD_ERR_OK) {
        file_put_contents($debugLog, "File found! Error code: " . $_FILES['profile_pic']['error'] . "\n", FILE_APPEND);
        file_put_contents($debugLog, "File details: " . print_r($_FILES['profile_pic'], true) . "\n", FILE_APPEND);
        
        $file = $_FILES['profile_pic'];
        
        // Validate file
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception("Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.");
        }
        
        if ($file['size'] > $maxSize) {
            throw new Exception("File size exceeds 5MB limit.");
        }
        
        // Generate unique filename
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('profile_', true) . '.' . $ext;
        $uploadDir = __DIR__ . '/uploads/profile_pics/';
        $uploadPath = $uploadDir . $filename;
        
        file_put_contents($debugLog, "Upload dir: $uploadDir\n", FILE_APPEND);
        file_put_contents($debugLog, "Upload path: $uploadPath\n", FILE_APPEND);
        file_put_contents($debugLog, "Dir exists: " . (is_dir($uploadDir) ? 'Yes' : 'No') . "\n", FILE_APPEND);
        
        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            file_put_contents($debugLog, "Creating directory: $uploadDir\n", FILE_APPEND);
            if (!mkdir($uploadDir, 0777, true)) {
                $error = error_get_last();
                throw new Exception("Failed to create upload directory: " . ($error['message'] ?? 'Unknown error'));
            }
        }
        
        // Check if directory is writable
        if (!is_writable($uploadDir)) {
            throw new Exception("Upload directory is not writable: " . $uploadDir . 
                ". Please check folder permissions in C:\\xampp\\htdocs\\data\\uploads\\profile_pics");
        }
        
        file_put_contents($debugLog, "Temp file: " . $file['tmp_name'] . "\n", FILE_APPEND);
        file_put_contents($debugLog, "Target file: $uploadPath\n", FILE_APPEND);
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
            $profilePic = $filename;
            file_put_contents($debugLog, "File uploaded successfully: $filename\n", FILE_APPEND);
            file_put_contents($debugLog, "File exists at target: " . (file_exists($uploadPath) ? 'Yes' : 'No') . "\n", FILE_APPEND);
        } else {
            $error = error_get_last();
            throw new Exception("Failed to move uploaded file. Error: " . ($error['message'] ?? 'Unknown error') . 
                ". Temp file: " . $file['tmp_name'] . ", Target: $uploadPath");
        }
    } else {
        file_put_contents($debugLog, "No file uploaded or upload error.\n", FILE_APPEND);
        if (isset($_FILES['profile_pic'])) {
            file_put_contents($debugLog, "Upload error code: " . $_FILES['profile_pic']['error'] . "\n", FILE_APPEND);
            
            // Check specific error codes
            $error_codes = [
                UPLOAD_ERR_INI_SIZE => 'File size exceeds php.ini limit',
                UPLOAD_ERR_FORM_SIZE => 'File size exceeds form limit',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'PHP extension stopped the file upload'
            ];
            
            if (isset($error_codes[$_FILES['profile_pic']['error']])) {
                file_put_contents($debugLog, "Error meaning: " . $error_codes[$_FILES['profile_pic']['error']] . "\n", FILE_APPEND);
            }
        }
    }

    // Get person data from POST
    $person = [
        'profile_name' => $_POST['profile_name'] ?? '',
        'profile_id' => $_POST['profile_id'] ?? '',
        'phone_number' => $_POST['phone_number'] ?? null,
        'address' => $_POST['address'] ?? null,
        'occupation' => $_POST['occupation'] ?? null,
        'age' => $_POST['age'] ?? null
    ];
    
    $group = [
        'id' => $_POST['group_id'] ?? null,
        'group_name' => $_POST['group_name'] ?? '',
        'note' => $_POST['note'] ?? null
    ];
    
    $post = [
        'postDetails' => $_POST['post_details'] ?? '',
        'comments' => $_POST['comments'] ?? null
    ];

    // Validate required fields
    if (empty($person['profile_name']) || empty($person['profile_id'])) {
        throw new Exception("Profile name and ID are required");
    }

    // Check if person exists
    $stmt = $pdo->prepare(
        "SELECT id, profile_pic FROM person_info WHERE profile_id = ? AND user_id = ?"
    );
    $stmt->execute([$person['profile_id'], $userId]);
    $existing = $stmt->fetch();

    if ($existing) {
        $personId = $existing['id'];
        
        // Update profile picture if new one is uploaded
        if ($profilePic) {
            // Delete old profile picture if exists
            if ($existing['profile_pic']) {
                $oldPicPath = __DIR__ . '/uploads/profile_pics/' . $existing['profile_pic'];
                if (file_exists($oldPicPath)) {
                    unlink($oldPicPath);
                }
            }
            
            // Update profile pic in database
            $stmt = $pdo->prepare(
                "UPDATE person_info SET profile_pic = ? WHERE id = ?"
            );
            $stmt->execute([$profilePic, $personId]);
        }
    } else {
        // Insert new person with profile picture
        $stmt = $pdo->prepare("
            INSERT INTO person_info
            (profile_name, profile_id, phone_number, address, occupation, age, user_id, profile_pic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $person['profile_name'],
            $person['profile_id'],
            $person['phone_number'],
            $person['address'],
            $person['occupation'],
            $person['age'],
            $userId,
            $profilePic
        ]);
        $personId = $pdo->lastInsertId();
    }

    // Handle group
    if (!empty($group['id'])) {
        $groupId = $group['id'];
    } else {
        if (empty($group['group_name'])) {
            throw new Exception("Group name is required");
        }
        
        $stmt = $pdo->prepare(
            "INSERT INTO group_info (group_name, note, person_id) VALUES (?, ?, ?)"
        );
        $stmt->execute([$group['group_name'], $group['note'], $personId]);
        $groupId = $pdo->lastInsertId();
    }

    // Insert post if details are provided and not auto-created
    if (!empty($post['postDetails']) && $post['postDetails'] !== 'auto-created') {
        $stmt = $pdo->prepare(
            "INSERT INTO post_info (person_id, group_id, post_details, comments)
             VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$personId, $groupId, $post['postDetails'], $post['comments']]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "personId" => $personId,
        "groupId" => $groupId,
        "profilePic" => $profilePic
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
    file_put_contents($debugLog, "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    exit;
}
