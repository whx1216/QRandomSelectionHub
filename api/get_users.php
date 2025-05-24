<?php
header('Content-Type: application/json');
// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// 包含通用函数
include_once('../includes/functions.php');

// 定义统一的响应函数
function sendResponse($success, $data = [], $message = '') {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// 获取项目代码
$projectCode = safeGetParam('project');

// 验证项目代码
if (empty($projectCode) || !isValidProjectCode($projectCode)) {
    sendResponse(false, [], '无效的项目代码');
}

// 数据文件路径
$file = getUsersFilePath($projectCode);

// 如果文件不存在，创建空文件
if (!file_exists($file)) {
    if (file_put_contents($file, json_encode([])) === false) {
        sendResponse(false, [], '无法创建数据文件');
    }
    sendResponse(true, []);
}

// 使用文件锁安全读取
$fp = fopen($file, 'r');
if (!$fp) {
    sendResponse(false, [], '无法打开文件');
}

// 获取共享锁 (读锁)
if (!flock($fp, LOCK_SH)) {
    fclose($fp);
    sendResponse(false, [], '无法获取文件锁');
}

// 一次性读取文件内容，更高效
$content = stream_get_contents($fp);

// 释放锁
flock($fp, LOCK_UN);
fclose($fp);

if (empty($content)) {
    sendResponse(true, []);
}

// 解析JSON数据
$users = json_decode($content, true);

// 检查JSON解析是否成功
if ($users === null && json_last_error() !== JSON_ERROR_NONE) {
    sendResponse(false, [], '数据格式错误');
}

// 确保数据是数组类型
if (!is_array($users)) {
    sendResponse(true, []);
}

// 按照ID降序排列(最新的在前面)
usort($users, function($a, $b) {
    return $b['id'] - $a['id']; // 降序排列
});

sendResponse(true, $users);
?>