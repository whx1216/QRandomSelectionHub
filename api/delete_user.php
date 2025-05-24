<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 获取POST数据
$inputJSON = file_get_contents('php://input');
writeLog("删除用户请求: " . $inputJSON);

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

// 验证必要参数
if (!isset($data['id']) || !is_numeric($data['id'])) {
    writeLog("错误: 用户ID无效");
    echo json_encode(['success' => false, 'message' => '用户ID无效']);
    exit;
}

// 数据文件路径
$file = getUsersFilePath($projectCode);

// 确保文件存在
if (!file_exists($file)) {
    writeLog("错误: 用户数据文件不存在");
    echo json_encode(['success' => false, 'message' => '用户数据文件不存在']);
    exit;
}

// 创建备份
createBackup($file, $projectCode);

// 使用文件锁安全修改
$fp = fopen($file, 'r+');
if (!$fp) {
    writeLog("错误: 无法打开文件");
    echo json_encode(['success' => false, 'message' => '无法打开文件']);
    exit;
}

if (!flock($fp, LOCK_EX)) {
    writeLog("错误: 无法获取文件锁");
    fclose($fp);
    echo json_encode(['success' => false, 'message' => '无法获取文件锁']);
    exit;
}

// 读取文件内容
$content = '';
while (!feof($fp)) {
    $content .= fread($fp, 8192);
}

// 解析JSON
$users = json_decode($content, true);
if (!is_array($users)) {
    writeLog("错误: 用户数据格式错误");
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['success' => false, 'message' => '用户数据格式错误']);
    exit;
}

// 查找用户
$userId = (int)$data['id'];
$userIndex = -1;
$userFound = false;

foreach ($users as $index => $user) {
    if ($user['id'] === $userId) {
        $userIndex = $index;
        $userFound = true;
        break;
    }
}

if (!$userFound) {
    writeLog("错误: 用户不存在");
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['success' => false, 'message' => '用户不存在']);
    exit;
}

// 删除用户
array_splice($users, $userIndex, 1);

// 保存修改
ftruncate($fp, 0);
rewind($fp);
$success = fwrite($fp, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
flock($fp, LOCK_UN);
fclose($fp);

if ($success) {
    writeLog("成功: 用户ID {$userId} 已删除");
    echo json_encode(['success' => true, 'message' => '用户已删除']);
} else {
    writeLog("错误: 写入文件失败");
    echo json_encode(['success' => false, 'message' => '系统错误，请稍后再试']);
}
?>