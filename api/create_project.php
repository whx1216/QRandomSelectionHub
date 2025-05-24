<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 验证和日志函数
include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("创建项目请求: " . $inputJSON);

// 解析JSON数据
$data = json_decode($inputJSON, true);

// 基础验证
if (!is_array($data) || !isset($data['name']) || empty(trim($data['name']))) {
    writeLog("错误: 项目名称不能为空");
    echo json_encode(['success' => false, 'message' => '项目名称不能为空']);
    exit;
}

// 生成随机项目代码
$projectCode = generateUniqueProjectCode();
$projectName = trim($data['name']);
$description = isset($data['description']) ? trim($data['description']) : '';

// 检查是否设置了密码
$isProtected = false;
$passwordHash = null;
if (isset($data['password']) && !empty(trim($data['password']))) {
    $isProtected = true;
    $passwordHash = password_hash(trim($data['password']), PASSWORD_DEFAULT);
}

// 项目数据
$project = [
    'code' => $projectCode,
    'name' => $projectName,
    'description' => $description,
    'created_at' => date('Y-m-d H:i:s'),
    'is_protected' => $isProtected
];

// 如果有密码，则添加密码哈希
if ($isProtected) {
    $project['password_hash'] = $passwordHash;
}

// 保存项目数据
$projectsFile = DATA_PATH . '/projects.json';
if (!file_exists(dirname($projectsFile))) {
    mkdir(dirname($projectsFile), 0755, true);
}

$projects = [];
if (file_exists($projectsFile)) {
    $projectsContent = file_get_contents($projectsFile);
    if (!empty($projectsContent)) {
        $projects = json_decode($projectsContent, true);
    }
}

// 确保$projects是数组
if (!is_array($projects)) {
    $projects = [];
}

// 添加新项目
$projects[] = $project;

// 保存项目列表
file_put_contents($projectsFile, json_encode($projects, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// 创建项目目录
$projectDir = DATA_PATH . "/projects/{$projectCode}";
if (!file_exists($projectDir)) {
    mkdir($projectDir, 0755, true);
}

// 创建空的用户数据文件
file_put_contents("{$projectDir}/users.json", json_encode([]));

echo json_encode([
    'success' => true,
    'message' => '项目创建成功',
    'project' => $project
]);

function generateUniqueProjectCode() {
    // 生成6位随机字母数字组合
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $projectCode = '';
    for ($i = 0; $i < 6; $i++) {
        $projectCode .= $characters[rand(0, strlen($characters) - 1)];
    }

    // 确保项目代码唯一
    $projectsFile = DATA_PATH . '/projects.json';
    if (file_exists($projectsFile)) {
        $projectsContent = file_get_contents($projectsFile);
        if (!empty($projectsContent)) {
            $projects = json_decode($projectsContent, true);
            if (is_array($projects)) {
                $codes = array_column($projects, 'code');
                if (in_array($projectCode, $codes)) {
                    // 如果代码已存在，递归生成新代码
                    return generateUniqueProjectCode();
                }
            }
        }
    }

    return $projectCode;
}
?>