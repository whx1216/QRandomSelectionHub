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
writeLog("删除历史记录请求: " . $inputJSON);

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

// 验证历史ID
if (!isset($data['historyId']) || !is_numeric($data['historyId'])) {
    writeLog("错误: 历史记录ID无效");
    echo json_encode(['success' => false, 'message' => '历史记录ID无效']);
    exit;
}

$historyId = (int)$data['historyId'];

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

// 读取历史记录
$historyContent = file_get_contents($historyFile);
$history = json_decode($historyContent, true);

if (!is_array($history)) {
    writeLog("错误: 历史记录格式错误");
    echo json_encode(['success' => false, 'message' => '历史记录文件格式错误']);
    exit;
}

// 查找要删除的记录
$recordIndex = -1;
foreach ($history as $index => $record) {
    if (isset($record['id']) && $record['id'] === $historyId) {
        $recordIndex = $index;
        break;
    }
}

if ($recordIndex === -1) {
    writeLog("错误: 历史记录不存在");
    echo json_encode(['success' => false, 'message' => '历史记录不存在']);
    exit;
}

// 删除记录
array_splice($history, $recordIndex, 1);

// 保存修改
$saveSuccess = file_put_contents($historyFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($saveSuccess) {
    writeLog("成功: 历史记录 ID {$historyId} 已删除");
    echo json_encode(['success' => true, 'message' => '历史记录已删除']);
} else {
    writeLog("错误: 写入文件失败");
    echo json_encode(['success' => false, 'message' => '系统错误，请稍后再试']);
}
?>