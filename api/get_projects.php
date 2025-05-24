<?php

/** @const DATA_PATH */
require_once __DIR__ . '/../data/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 数据文件路径
$projectsFile = DATA_PATH . '/projects.json';

if (file_exists($projectsFile)) {
    $content = file_get_contents($projectsFile);
    if (!empty($content)) {
        $projects = json_decode($content, true);
        if (is_array($projects)) {
            // 按创建时间降序排列
            usort($projects, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            echo json_encode(['success' => true, 'data' => $projects]);
            exit;
        }
    }

    echo json_encode(['success' => true, 'data' => []]);
} else {
    file_put_contents($projectsFile, json_encode([]));
    echo json_encode(['success' => true, 'data' => []]);
}
?>