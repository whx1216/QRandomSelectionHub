<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("项目密码验证请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data) || !isset($data['projectCode']) || empty($data['projectCode'])) {
    echo json_encode(['success' => false, 'message' => '项目代码不能为空']);
    exit;
}

if (!isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => '密码不能为空']);
    exit;
}

$projectCode = $data['projectCode'];
$password = trim($data['password']); // Added trim() to match how password was created

// 获取项目信息
$project = getProject($projectCode);
if (!$project) {
    echo json_encode(['success' => false, 'message' => '项目不存在']);
    exit;
}

// 检查项目是否受密码保护
if (!isset($project['is_protected']) || !$project['is_protected']) {
    echo json_encode(['success' => false, 'message' => '此项目不需要密码']);
    exit;
}

// 验证密码
if (password_verify($password, $project['password_hash'])) {
    // 密码正确，生成一个会话令牌
    $token = generateSessionToken($projectCode);
    echo json_encode(['success' => true, 'message' => '密码验证成功', 'token' => $token]);
} else {
    echo json_encode(['success' => false, 'message' => '密码错误']);
}

// Remove the generateSessionToken function definition completely from here
// It's already defined in functions.php
?>