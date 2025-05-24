<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 获取项目代码
$projectCode = safeGetParam('project');
if (empty($projectCode) || !isValidProjectCode($projectCode)) {
    echo json_encode(['success' => false, 'message' => '无效的项目代码']);
    exit;
}

// 获取要抽取的人数
$count = isset($_GET['count']) ? intval($_GET['count']) : 1;
if ($count < 1) $count = 1;

// 获取允许重复抽取标志
$allowRepeat = isset($_GET['allowRepeat']) && $_GET['allowRepeat'] === '1';

// 获取描述信息（可选）
$description = isset($_GET['description']) ? trim($_GET['description']) : '';

// 数据文件路径
$file = getUsersFilePath($projectCode);

// 读取用户数据
if (file_exists($file)) {
    $content = file_get_contents($file);
    if (!empty($content)) {
        $users = json_decode($content, true);

        if (!is_array($users) || empty($users)) {
            echo json_encode([
                'success' => false,
                'message' => '没有参与者数据'
            ]);
            exit;
        }

        if (!$allowRepeat && count($users) < $count) {
            echo json_encode([
                'success' => false,
                'message' => '参与人数不足',
                'required' => $count,
                'available' => count($users)
            ]);
            exit;
        }

        // 随机抽取指定数量的用户
        $winners = [];

        if ($allowRepeat) {
            // 允许重复抽取
            for ($i = 0; $i < $count; $i++) {
                $randomIndex = array_rand($users);
                $winners[] = $users[$randomIndex];
            }
        } else {
            // 不允许重复抽取
            $keys = array_keys($users);
            shuffle($keys);

            // 确保不超过用户总数
            $actualCount = min($count, count($users));

            for ($i = 0; $i < $actualCount; $i++) {
                $winners[] = $users[$keys[$i]];
            }
        }

        // 保存抽号历史
        $drawParams = [
            'count' => $count,
            'allowRepeat' => $allowRepeat,
            'description' => $description,
            'total_participants' => count($users)
        ];

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
            'params' => $drawParams
        ];

        // 添加到历史
        $history[] = $newRecord;

        // 保存历史
        file_put_contents($historyFile, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        echo json_encode([
            'success' => true,
            'data' => $winners,
            'allowRepeat' => $allowRepeat,
            'historyId' => $historyId
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => '没有参与者数据']);
    }
} else {
    echo json_encode(['success' => false, 'message' => '用户数据文件不存在']);
}
?>