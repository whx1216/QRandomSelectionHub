<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("清空历史记录请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data)) {
    writeLog("错误: 无效的JSON数据");
    echo json_encode(['success' => false, 'message' => '无效的请求数据']);
    exit;
}

// 验证项目代码
if (!isset($data['projectCode']) || empty($data['projectCode'])) {
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

// 历史文件路径
$historyFile = DATA_PATH . "/history/{$projectCode}/draw_history.json";

// 检查文件是否存在
if (!file_exists($historyFile)) {
    writeLog("错误: 历史记录文件不存在");
    echo json_encode(['success' => false, 'message' => '历史记录文件不存在']);
    exit;
}

// 创建备份
$backupDir = __DIR__ . "/../backups/history/{$projectCode}";
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0777, true);
}

$timestamp = date('Y-m-d_H-i-s');
$backupFile = "{$backupDir}/draw_history_{$timestamp}.json";

// 复制文件作为备份
if (file_exists($historyFile)) {
    copy($historyFile, $backupFile);
    writeLog("成功: 历史记录已备份到 {$backupFile}");
}

// 清空历史记录 - 写入空数组
$saveSuccess = file_put_contents($historyFile, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($saveSuccess !== false) {
    writeLog("成功: 项目 {$projectCode} 的所有历史记录已清空");
    echo json_encode(['success' => true, 'message' => '所有历史记录已清空']);
} else {
    writeLog("错误: 写入文件失败");
    echo json_encode(['success' => false, 'message' => '系统错误，请稍后再试']);
}
?>