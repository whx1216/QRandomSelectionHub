<?php
header('Content-Type: application/json');

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 包含通用函数
include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("收到用户添加请求: " . $inputJSON);

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

// 验证姓名
if (!isset($data['name']) || empty(trim($data['name']))) {
    writeLog("错误: 姓名不能为空");
    echo json_encode(['success' => false, 'message' => '姓名不能为空']);
    exit;
}

// 验证手机号
if (!isset($data['phone']) || empty(trim($data['phone']))) {
    writeLog("错误: 手机号不能为空");
    echo json_encode(['success' => false, 'message' => '手机号不能为空']);
    exit;
}

// 验证手机号格式（中国大陆手机号）
if (!validatePhone($data['phone'])) {
    writeLog("错误: 手机号格式不正确 - " . $data['phone']);
    echo json_encode(['success' => false, 'message' => '手机号格式不正确']);
    exit;
}

// 获取用户数据文件路径
$file = getUsersFilePath($projectCode);
$dataDir = dirname($file);

// 确保项目目录存在
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// 使用文件锁进行并发控制
$maxRetries = 5;
$retryDelay = 200000; // 微秒 (0.2秒)
$success = false;

for ($retry = 0; $retry < $maxRetries; $retry++) {
    // 如果不是第一次尝试，则等待一段时间
    if ($retry > 0) {
        usleep($retryDelay * $retry); // 逐步增加延迟
        writeLog("重试 #$retry 添加用户: " . $data['name'] . " 到项目: " . $projectCode);
    }

    // 获取文件锁并读取数据
    $fp = fopen($file, 'c+'); // 打开用于读写，如果不存在则创建

    if (!$fp) {
        writeLog("错误: 无法打开文件: $file");
        continue; // 尝试下一次重试
    }

    // 获取排他锁
    if (!flock($fp, LOCK_EX)) {
        writeLog("错误: 无法获取文件锁");
        fclose($fp);
        continue; // 尝试下一次重试
    }

    // 读取文件内容
    $content = '';
    while (!feof($fp)) {
        $content .= fread($fp, 8192);
    }

    // 解析JSON或创建新数组
    $users = [];
    if (!empty($content)) {
        $users = json_decode($content, true);

        // 检查JSON解析是否成功
        if ($users === null && json_last_error() !== JSON_ERROR_NONE) {
            $jsonError = json_last_error_msg();
            writeLog("警告: JSON解析错误: $jsonError, 创建新数组");

            // 备份损坏的文件
            createBackup($file, $projectCode);
            writeLog("已备份损坏的JSON文件");

            // 创建新的空数组
            $users = [];
        }
    }

    // 确保$users是数组
    if (!is_array($users)) {
        $users = [];
    }

    // 检查手机号是否已存在
    $exists = false;
    foreach ($users as $user) {
        if (isset($user['phone']) && $user['phone'] === $data['phone']) {
            $exists = true;
            break;
        }
    }

    if ($exists) {
        writeLog("信息: 手机号已存在: " . $data['phone'] . " 在项目: " . $projectCode);
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['success' => false, 'message' => '该手机号已提交过信息']);
        exit;
    }

    // 添加新用户
    $newId = 1;
    if (!empty($users)) {
        // 找出最大ID
        $maxId = 0;
        foreach ($users as $user) {
            if (isset($user['id']) && $user['id'] > $maxId) {
                $maxId = $user['id'];
            }
        }
        $newId = $maxId + 1;
    }

    $newUser = [
        'id' => $newId,
        'name' => trim($data['name']),
        'phone' => trim($data['phone']),
        'date' => date('Y-m-d H:i:s')
    ];

    // 添加备注(如果有)
    if (isset($data['remark']) && !empty(trim($data['remark']))) {
        $newUser['remark'] = trim($data['remark']);
    }

    // 添加用户到数组
    $users[] = $newUser;

    // 将数组转换为JSON
    $newContent = json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    // 截断文件并写入新内容
    ftruncate($fp, 0);
    rewind($fp);

    $writeSuccess = fwrite($fp, $newContent);

    // 释放锁并关闭文件
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($writeSuccess !== false) {
        $success = true;
        writeLog("成功: 添加用户 " . $data['name'] . " (ID: $newId) 到项目: " . $projectCode);
        break; // 跳出重试循环
    } else {
        writeLog("错误: 写入文件失败");
    }
}

// 返回结果
if ($success) {
    echo json_encode(['success' => true, 'message' => '用户信息添加成功']);
} else {
    writeLog("严重错误: 经过 $maxRetries 次尝试后仍无法保存用户数据");
    echo json_encode(['success' => false, 'message' => '系统繁忙，请稍后再试']);
}
?>