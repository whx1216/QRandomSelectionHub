<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含通用函数
include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("删除项目请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data) || !isset($data['projectCode']) || empty($data['projectCode'])) {
    writeLog("错误: 项目代码不能为空");
    echo json_encode(['success' => false, 'message' => '项目代码不能为空']);
    exit;
}

$projectCode = $data['projectCode'];

// 检查项目代码是否有效
if (!isValidProjectCode($projectCode)) {
    writeLog("错误: 无效的项目代码 - " . $projectCode);
    echo json_encode(['success' => false, 'message' => '无效的项目代码']);
    exit;
}

// 获取项目数据文件路径
$projectsFile = DATA_PATH . '/projects.json';
$projectsContent = file_get_contents($projectsFile);
$projects = json_decode($projectsContent, true);

if (!is_array($projects)) {
    writeLog("错误: 项目数据文件格式错误");
    echo json_encode(['success' => false, 'message' => '项目数据文件格式错误']);
    exit;
}

// 查找并移除项目
$projectIndex = -1;
foreach ($projects as $index => $project) {
    if ($project['code'] === $projectCode) {
        $projectIndex = $index;
        break;
    }
}

if ($projectIndex === -1) {
    writeLog("错误: 项目不存在");
    echo json_encode(['success' => false, 'message' => '项目不存在']);
    exit;
}

// 移除项目
array_splice($projects, $projectIndex, 1);

// 保存更新后的项目列表
$saveSuccess = file_put_contents($projectsFile, json_encode($projects, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if (!$saveSuccess) {
    writeLog("错误: 保存项目列表失败");
    echo json_encode(['success' => false, 'message' => '保存项目列表失败']);
    exit;
}

// 删除项目目录
$projectDir = DATA_PATH . "/projects/{$projectCode}";
if (file_exists($projectDir)) {
    // 备份项目数据
    $backupDir = DATA_PATH . "/backups/{$projectCode}";
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    // 复制用户数据作为备份
    $usersFile = "{$projectDir}/users.json";
    if (file_exists($usersFile)) {
        $backupFile = $backupDir . '/users_deleted_' . date('Y-m-d_H-i-s') . '.json';
        copy($usersFile, $backupFile);
    }

    // 删除项目目录中的文件
    $files = glob($projectDir . '/*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }

    // 删除项目目录
    rmdir($projectDir);
}

// 删除项目历史数据
$historyDir = DATA_PATH . "/history/{$projectCode}";
if (file_exists($historyDir)) {
    // 备份历史数据
    $backupHistoryDir = "{$backupDir}/history";
    if (!file_exists($backupHistoryDir)) {
        mkdir($backupHistoryDir, 0755, true);
    }

    // 复制历史文件
    $historyFile = "{$historyDir}/draw_history.json";
    if (file_exists($historyFile)) {
        $backupHistoryFile = $backupHistoryDir . '/draw_history_' . date('Y-m-d_H-i-s') . '.json';
        copy($historyFile, $backupHistoryFile);
    }

    // 删除历史目录中的文件
    $historyFiles = glob($historyDir . '/*');
    foreach ($historyFiles as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }

    // 删除历史目录
    rmdir($historyDir);
}

writeLog("成功: 项目 {$projectCode} 已删除");
echo json_encode(['success' => true, 'message' => '项目已删除']);
?>