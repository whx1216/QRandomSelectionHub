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
writeLog("Token验证请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data) || !isset($data['projectCode']) || empty($data['projectCode'])) {
    echo json_encode(['success' => false, 'message' => '项目代码不能为空']);
    exit;
}

if (!isset($data['token']) || empty($data['token'])) {
    echo json_encode(['success' => false, 'message' => 'Token不能为空']);
    exit;
}

$projectCode = $data['projectCode'];
$token = $data['token'];

// 验证token
$tokensFile = DATA_PATH . '/tokens.json';
if (!file_exists($tokensFile)) {
    echo json_encode(['success' => false, 'message' => 'Token无效']);
    exit;
}

$content = file_get_contents($tokensFile);
if (empty($content)) {
    echo json_encode(['success' => false, 'message' => 'Token无效']);
    exit;
}

$tokens = json_decode($content, true);
if (!is_array($tokens) || !isset($tokens[$token])) {
    echo json_encode(['success' => false, 'message' => 'Token无效']);
    exit;
}

$tokenData = $tokens[$token];

// 检查token是否过期
if ($tokenData['project_code'] !== $projectCode) {
    echo json_encode(['success' => false, 'message' => 'Token与项目不匹配']);
    exit;
}

// 检查是否过期
if (strtotime($tokenData['expires_at']) < time()) {
    // 移除过期的token
    unset($tokens[$token]);
    file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));

    echo json_encode(['success' => false, 'message' => 'Token已过期']);
    exit;
}

// Token有效
echo json_encode(['success' => true, 'message' => 'Token有效']);
?>