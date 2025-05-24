<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 获取项目代码
$projectCode = safeGetParam('project');

// 验证项目代码
if (empty($projectCode)) {
    echo json_encode(['success' => false, 'message' => '项目代码不能为空', 'data' => []]);
    exit;
}

if (!isValidProjectCode($projectCode)) {
    echo json_encode(['success' => false, 'message' => '无效的项目代码', 'data' => []]);
    exit;
}

// 获取抽号历史 - 确保函数不会返回 null
$history = getDrawHistory($projectCode);
if ($history === null) {
    $history = [];
}

echo json_encode(['success' => true, 'data' => $history]);
exit;
?>