<?php
/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';
// 日志函数
function writeLog($message) {
    $logDir = __DIR__ . '/../logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/api_' . date('Y-m-d') . '.log';
    $time = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$time] $message" . PHP_EOL, FILE_APPEND);
}

// 获取项目信息
function getProject($projectCode) {
    $projectsFile = DATA_PATH . '/projects.json';

    if (!file_exists($projectsFile)) {
        return null;
    }

    $projectsContent = file_get_contents($projectsFile);
    if (empty($projectsContent)) {
        return null;
    }

    $projects = json_decode($projectsContent, true);
    if (!is_array($projects)) {
        return null;
    }

    foreach ($projects as $project) {
        if ($project['code'] === $projectCode) {
            return $project;
        }
    }

    return null;
}

// 获取项目的用户列表文件路径
function getUsersFilePath($projectCode) {
    return DATA_PATH . "/projects/{$projectCode}/users.json";
}

// 安全获取URL参数
function safeGetParam($param, $default = '') {
    return isset($_GET[$param]) ? htmlspecialchars(trim($_GET[$param])) : $default;
}

// 验证电话号码
function validatePhone($phone) {
    return preg_match('/^1[3-9]\d{9}$/', $phone);
}

// 创建备份
function createBackup($filePath, $projectCode) {
    if (!file_exists($filePath)) {
        return false;
    }

    $backupDir = DATA_PATH . "/backups/{$projectCode}";
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $backupFile = $backupDir . '/users_' . date('Y-m-d_H-i-s') . '.json';
    return copy($filePath, $backupFile);
}

// 检查是否为有效的项目代码
function isValidProjectCode($projectCode) {
    return preg_match('/^[0-9A-Z]{6}$/', $projectCode) && getProject($projectCode) !== null;
}

// 保存抽号历史
function saveDrawHistory($projectCode, $winners, $drawParams) {
    $historyDir = DATA_PATH . "/history/{$projectCode}";
    if (!file_exists($historyDir)) {
        mkdir($historyDir, 0755, true);
    }

    $historyFile = $historyDir . "/draw_history.json";
    $history = [];

    if (file_exists($historyFile)) {
        $content = file_get_contents($historyFile);
        if (!empty($content)) {
            $history = json_decode($content, true);
            if (!is_array($history)) {
                $history = [];
            }
        }
    }

    // 创建新的历史记录
    $newRecord = [
        'id' => count($history) + 1,
        'timestamp' => date('Y-m-d H:i:s'),
        'winners' => $winners,
        'params' => $drawParams
    ];

    // 添加到历史
    $history[] = $newRecord;

    // 保存历史
    file_put_contents($historyFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return $newRecord['id'];
}

// 获取抽号历史
function getDrawHistory($projectCode) {
    $historyFile = DATA_PATH . "/history/{$projectCode}/draw_history.json";

    if (!file_exists($historyFile)) {
        return [];
    }

    $content = file_get_contents($historyFile);
    if ($content === false || empty($content)) {
        writeLog("警告: 无法读取或空的历史文件: {$historyFile}");
        return [];
    }

    $history = json_decode($content, true);
    if ($history === null && json_last_error() !== JSON_ERROR_NONE) {
        writeLog("错误: 解析历史文件JSON失败: " . json_last_error_msg());
        return [];
    }

    if (!is_array($history)) {
        writeLog("警告: 历史数据不是数组");
        return [];
    }

    return $history;
}
// 验证会话令牌
function verifyToken($token, $projectCode) {
    $tokensFile = DATA_PATH . '/tokens.json';

    if (!file_exists($tokensFile)) {
        return false;
    }

    $content = file_get_contents($tokensFile);
    if (empty($content)) {
        return false;
    }

    $tokens = json_decode($content, true);
    if (!is_array($tokens) || !isset($tokens[$token])) {
        return false;
    }

    $tokenData = $tokens[$token];

    // 检查项目代码是否匹配
    if ($tokenData['project_code'] !== $projectCode) {
        return false;
    }

    // 检查令牌是否过期
    if (strtotime($tokenData['expires_at']) < time()) {
        return false;
    }

    return true;
}

// 生成会话令牌
// 生成会话令牌
function generateSessionToken($projectCode) {
    $token = bin2hex(random_bytes(32));

    // 存储令牌（实际应用中应使用更安全的存储方式，如数据库）
    $tokensFile = DATA_PATH . '/tokens.json';
    $tokens = [];

    if (file_exists($tokensFile)) {
        $content = file_get_contents($tokensFile);
        if (!empty($content)) {
            $tokens = json_decode($content, true);
        }
    }

    // 确保tokens是数组
    if (!is_array($tokens)) {
        $tokens = [];
    }

    // 添加新令牌
    $tokens[$token] = [
        'project_code' => $projectCode,
        'created_at' => date('Y-m-d H:i:s'),
        'expires_at' => date('Y-m-d H:i:s', strtotime('+24 hours')) // 24小时有效期
    ];

    // Add error handling for file writing
    $result = @file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));

    if ($result === false) {
        writeLog("错误: 无法写入令牌文件: $tokensFile - 请检查目录权限");
        // Even though there's an error, we'll still return the token
        // since the authentication itself was successful
    }

    return $token;
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// 清理过期令牌
function cleanupExpiredTokens() {
    $tokensFile = DATA_PATH . '/tokens.json';

    if (!file_exists($tokensFile)) {
        return;
    }

    $content = file_get_contents($tokensFile);
    if (empty($content)) {
        return;
    }

    $tokens = json_decode($content, true);
    if (!is_array($tokens)) {
        return;
    }

    $currentTime = time();
    $updated = false;

    foreach ($tokens as $token => $data) {
        if (strtotime($data['expires_at']) < $currentTime) {
            unset($tokens[$token]);
            $updated = true;
        }
    }

    if ($updated) {
        file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));
    }
}

// 检查并清理过期令牌 (每100次请求执行一次)
if (rand(1, 100) === 1) {
    cleanupExpiredTokens();
}
?>