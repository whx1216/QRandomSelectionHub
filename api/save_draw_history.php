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
writeLog("保存抽号历史请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data) || !isset($data['projectCode']) || !isset($data['winners']) || !is_array($data['winners'])) {
    writeLog("错误: 无效的请求数据");
    echo json_encode(['success' => false, 'message' => '无效的请求数据']);
    exit;
}

$projectCode = $data['projectCode'];
$winners = $data['winners'];
$params = isset($data['params']) ? $data['params'] : [];

// 检查项目代码是否有效
if (!isValidProjectCode($projectCode)) {
    writeLog("错误: 无效的项目代码 - " . $projectCode);
    echo json_encode(['success' => false, 'message' => '无效的项目代码']);
    exit;
}

// 确保历史目录存在
$historyDir = DATA_PATH . "/history/{$projectCode}";
if (!file_exists($historyDir)) {
    mkdir($historyDir, 0755, true);
}

$historyFile = $historyDir . "/draw_history.json";
$history = [];

if (file_exists($historyFile)) {
    $historyContent = file_get_contents($historyFile);
    if (!empty($historyContent)) {
        $history = json_decode($historyContent, true);
        if (!is_array($history)) {
            $history = [];
        }
    }
}

// 创建新的历史记录
$historyId = count($history) + 1;
$newRecord = [
    'id' => $historyId,
    'timestamp' => date('Y-m-d H:i:s'),
    'winners' => $winners,
    'params' => $params
];

// 添加到历史
$history[] = $newRecord;

// 保存历史
$saveSuccess = file_put_contents($historyFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($saveSuccess) {
    writeLog("成功: 添加抽号历史记录，ID: {$historyId}");
    echo json_encode([
        'success' => true,
        'message' => '历史记录已保存',
        'historyId' => $historyId
    ]);
} else {
    writeLog("错误: 写入历史记录文件失败");
    echo json_encode(['success' => false, 'message' => '保存历史记录失败']);
}
?>