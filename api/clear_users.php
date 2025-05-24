<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');
// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

// 检查项目代码
if (!isset($data['projectCode']) || empty($data['projectCode'])) {
    echo json_encode(['success' => false, 'message' => '项目代码不能为空']);
    exit;
}

// 引入函数库（如果必要）
if (file_exists('../includes/functions.php')) {
    include_once('../includes/functions.php');
}

// 获取项目对应的数据文件路径
$projectCode = $data['projectCode'];
$file =DATA_PATH . '/' . $projectCode . '/users.json';

// 如果函数存在，使用它获取正确的路径
if (function_exists('getUsersFilePath')) {
    $file = getUsersFilePath($projectCode);
}

// 检查文件是否存在
if (!file_exists($file)) {
    echo json_encode(['success' => false, 'message' => '用户数据文件不存在']);
    exit;
}

// 备份当前文件
$backupDir = DATA_PATH . '/backups/' . $projectCode;
if (!file_exists($backupDir)) {
    mkdir($backupDir, 0777, true);
}

$backupFile = $backupDir . '/users_' . date('Y-m-d_H-i-s') . '.json';
copy($file, $backupFile);

// 使用文件锁安全清空
$fp = fopen($file, 'c+');
if ($fp) {
    if (flock($fp, LOCK_EX)) {
        // 截断文件并写入空数组
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode([]));

        // 释放锁
        flock($fp, LOCK_UN);
        fclose($fp);

        // 记录操作日志（如果函数存在）
        if (function_exists('writeLog')) {
            writeLog("用户列表已清空 - 项目: " . $projectCode);
        }

        echo json_encode(['success' => true, 'message' => '用户列表已清空']);
    } else {
        fclose($fp);
        echo json_encode(['success' => false, 'message' => '无法获取文件锁']);
    }
} else {
    echo json_encode(['success' => false, 'message' => '无法打开文件']);
}
?>