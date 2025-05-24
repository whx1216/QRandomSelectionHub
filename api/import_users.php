<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

include_once('../includes/functions.php');

// 添加调试日志
writeLog("收到文件上传请求: " . print_r($_FILES, true));
writeLog("POST数据: " . print_r($_POST, true));
writeLog("GET参数: " . print_r($_GET, true));

// 验证项目代码
$projectCode = safeGetParam('project');
if (empty($projectCode) || !isValidProjectCode($projectCode)) {
    writeLog("错误: 无效的项目代码 - " . $projectCode);
    echo json_encode(['success' => false, 'message' => '无效的项目代码']);
    exit;
}

// 确保上传文件存在
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = isset($_FILES['file']) ? getUploadErrorMessage($_FILES['file']['error']) : '未接收到文件';
    writeLog("错误: 文件上传失败 - " . $errorMessage);
    echo json_encode(['success' => false, 'message' => '文件上传失败: ' . $errorMessage]);
    exit;
}

// 验证文件类型 - 不使用 mime_content_type，而是使用文件扩展名
$fileExtension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));

// 扩展支持的文件扩展名
$allowedExtensions = ['csv', 'xlsx', 'xls', 'json', 'txt'];

if (!in_array($fileExtension, $allowedExtensions)) {
    writeLog("错误: 不支持的文件类型 - 扩展名: " . $fileExtension);
    echo json_encode(['success' => false, 'message' => '不支持的文件格式，请使用CSV、Excel、JSON或文本文件']);
    exit;
}

// 准备导入数据
$newUsers = [];
$errors = [];
$duplicatePhones = [];

// 获取当前用户列表中的电话号码
$usersFile = getUsersFilePath($projectCode);
$existingUsers = [];
$existingPhones = [];

if (file_exists($usersFile)) {
    $usersContent = file_get_contents($usersFile);
    if (!empty($usersContent)) {
        $existingUsers = json_decode($usersContent, true);
        if (is_array($existingUsers)) {
            $existingPhones = array_column($existingUsers, 'phone');
        }
    }
}

// 根据文件类型处理
switch(strtolower($fileExtension)) {
    case 'csv':
    case 'txt':
        $newUsers = importFromCSV($_FILES['file']['tmp_name'], $existingPhones, $errors, $duplicatePhones);
        break;
    case 'xlsx':
    case 'xls':
        $newUsers = importFromExcel($_FILES['file']['tmp_name'], $existingPhones, $errors, $duplicatePhones);
        break;
    case 'json':
        $newUsers = importFromJSON($_FILES['file']['tmp_name'], $existingPhones, $errors, $duplicatePhones);
        break;
    default:
        // 默认尝试CSV处理
        $newUsers = importFromCSV($_FILES['file']['tmp_name'], $existingPhones, $errors, $duplicatePhones);
}

// 如果没有有效数据
if (empty($newUsers)) {
    $message = '没有有效的用户数据可导入';
    if (!empty($errors)) {
        $message .= "\n错误详情:\n" . implode("\n", $errors);
    }
    if (!empty($duplicatePhones)) {
        $message .= "\n重复的手机号:\n" . implode(", ", $duplicatePhones);
    }

    writeLog("错误: " . $message);
    echo json_encode(['success' => false, 'message' => $message, 'errors' => $errors, 'duplicates' => $duplicatePhones]);
    exit;
}

// 创建备份
createBackup($usersFile, $projectCode);

// 合并数据
$maxId = 0;
if (!empty($existingUsers)) {
    foreach ($existingUsers as $user) {
        if (isset($user['id']) && $user['id'] > $maxId) {
            $maxId = $user['id'];
        }
    }
}

// 分配ID
foreach ($newUsers as &$user) {
    $maxId++;
    $user['id'] = $maxId;
}

// 合并用户列表
$finalUsers = array_merge($existingUsers, $newUsers);

// 保存数据
$saveSuccess = file_put_contents($usersFile, json_encode($finalUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($saveSuccess) {
    writeLog("成功: 导入了 " . count($newUsers) . " 位用户");
    echo json_encode([
        'success' => true,
        'message' => '成功导入 ' . count($newUsers) . ' 位用户',
        'imported' => count($newUsers),
        'errors' => $errors,
        'duplicates' => count($duplicatePhones)
    ]);
} else {
    writeLog("错误: 保存导入数据失败");
    echo json_encode(['success' => false, 'message' => '保存数据失败，请重试']);
}

// 获取上传错误信息
function getUploadErrorMessage($error) {
    switch ($error) {
        case UPLOAD_ERR_INI_SIZE:
            return "上传的文件超过了 php.ini 中 upload_max_filesize 选项限制的值";
        case UPLOAD_ERR_FORM_SIZE:
            return "上传文件的大小超过了 HTML 表单中 MAX_FILE_SIZE 选项指定的值";
        case UPLOAD_ERR_PARTIAL:
            return "文件只有部分被上传";
        case UPLOAD_ERR_NO_FILE:
            return "没有文件被上传";
        case UPLOAD_ERR_NO_TMP_DIR:
            return "找不到临时文件夹";
        case UPLOAD_ERR_CANT_WRITE:
            return "文件写入失败";
        default:
            return "未知上传错误";
    }
}

// 导入CSV文件
function importFromCSV($filePath, $existingPhones, &$errors, &$duplicatePhones) {
    $newUsers = [];
    $lineNum = 0;
    $file = fopen($filePath, 'r');

    if (!$file) {
        $errors[] = "无法打开上传的文件";
        return $newUsers;
    }

    // 读取CSV行
    while (($data = fgetcsv($file)) !== FALSE) {
        $lineNum++;

        // 跳过标题行
        if ($lineNum === 1 && (strcasecmp($data[0], '姓名') === 0 || strcasecmp($data[0], '名字') === 0)) {
            continue;
        }

        // 验证数据
        if (count($data) < 2) {
            $errors[] = "行 {$lineNum}: 数据不完整，需要至少包含姓名和手机号";
            continue;
        }

        $name = trim($data[0]);
        $phone = trim($data[1]);
        $remark = isset($data[2]) ? trim($data[2]) : '';

        // 基本验证
        if (empty($name)) {
            $errors[] = "行 {$lineNum}: 姓名不能为空";
            continue;
        }

        if (empty($phone)) {
            $errors[] = "行 {$lineNum}: 手机号不能为空";
            continue;
        }

        // 验证手机号格式
        if (!validatePhone($phone)) {
            $errors[] = "行 {$lineNum}: 手机号格式不正确 - {$phone}";
            continue;
        }

        // 检查是否与现有数据重复
        if (in_array($phone, $existingPhones)) {
            $duplicatePhones[] = $phone;
            continue;
        }

        // 检查CSV内部是否有重复
        if (in_array($phone, array_column($newUsers, 'phone'))) {
            $errors[] = "行 {$lineNum}: 手机号在导入文件中重复 - {$phone}";
            continue;
        }

        // 创建新用户
        $newUser = [
            'name' => $name,
            'phone' => $phone,
            'date' => date('Y-m-d H:i:s')
        ];

        if (!empty($remark)) {
            $newUser['remark'] = $remark;
        }

        $newUsers[] = $newUser;
    }

    fclose($file);
    return $newUsers;
}

// 导入Excel文件 - 使用SimpleXLSX而不是PhpSpreadsheet
function importFromExcel($filePath, $existingPhones, &$errors, &$duplicatePhones) {
    $newUsers = [];

    // 检查SimpleXLSX是否可用
    $simplexlsxPath = './SimpleXLSX.php';
    if (!file_exists($simplexlsxPath)) {
        $errors[] = "缺少SimpleXLSX库，无法处理Excel文件";
        writeLog("错误: 缺少SimpleXLSX库，无法处理Excel文件");
        return importFromCSV($filePath, $existingPhones, $errors, $duplicatePhones);
    }

    // 引入SimpleXLSX库
    require_once $simplexlsxPath;

    try {
        // 使用SimpleXLSX解析Excel文件
        $xlsx = new \Shuchkin\SimpleXLSX($filePath);
        $rows = $xlsx->rows();

        // 跳过标题行
        if (count($rows) > 0 && (strcasecmp($rows[0][0], '姓名') === 0 || strcasecmp($rows[0][0], '名字') === 0)) {
            array_shift($rows);
        }

        foreach ($rows as $index => $row) {
            // 行数从1开始
            $lineNum = $index + 1;

            // 验证数据
            if (count($row) < 2 || empty($row[0]) || empty($row[1])) {
                $errors[] = "行 {$lineNum}: 数据不完整，需要至少包含姓名和手机号";
                continue;
            }

            $name = trim($row[0]);
            $phone = trim($row[1]);
            $remark = isset($row[2]) ? trim($row[2]) : '';

            // 验证手机号格式
            if (!validatePhone($phone)) {
                $errors[] = "行 {$lineNum}: 手机号格式不正确 - {$phone}";
                continue;
            }

            // 检查是否与现有数据重复
            if (in_array($phone, $existingPhones)) {
                $duplicatePhones[] = $phone;
                continue;
            }

            // 检查Excel内部是否有重复
            if (in_array($phone, array_column($newUsers, 'phone'))) {
                $errors[] = "行 {$lineNum}: 手机号在导入文件中重复 - {$phone}";
                continue;
            }

            // 创建新用户
            $newUser = [
                'name' => $name,
                'phone' => $phone,
                'date' => date('Y-m-d H:i:s')
            ];

            if (!empty($remark)) {
                $newUser['remark'] = $remark;
            }

            $newUsers[] = $newUser;
        }
    } catch (Exception $e) {
        $errors[] = "Excel文件解析错误: " . $e->getMessage();
        writeLog("错误: Excel解析失败: " . $e->getMessage());

        // 失败后尝试使用另一种更简单的方法
        $newUsers = importExcelAlternative($filePath, $existingPhones, $errors, $duplicatePhones);
        if (empty($newUsers)) {
            // 如果这种方法也失败，尝试CSV解析
            return importFromCSV($filePath, $existingPhones, $errors, $duplicatePhones);
        }
    }

    return $newUsers;
}

// 替代Excel导入方法 - 使用PHP原生函数
function importExcelAlternative($filePath, $existingPhones, &$errors, &$duplicatePhones) {
    $newUsers = [];

    // 创建临时CSV文件
    $tempCsvFile = tempnam(sys_get_temp_dir(), 'excel_import_');
    if ($tempCsvFile === false) {
        $errors[] = "无法创建临时文件";
        return $newUsers;
    }

    // 尝试将Excel转换为CSV (这需要shell_exec权限和相关工具)
    if (function_exists('shell_exec')) {
        // 检查是否安装了ssconvert (Gnumeric套件)
        $checkSsconvert = shell_exec('which ssconvert 2>/dev/null');
        if (!empty($checkSsconvert)) {
            $command = 'ssconvert ' . escapeshellarg($filePath) . ' ' . escapeshellarg($tempCsvFile . '.csv') . ' 2>/dev/null';
            shell_exec($command);

            if (file_exists($tempCsvFile . '.csv')) {
                $newUsers = importFromCSV($tempCsvFile . '.csv', $existingPhones, $errors, $duplicatePhones);
                unlink($tempCsvFile . '.csv');
                unlink($tempCsvFile);
                return $newUsers;
            }
        }

        // 检查是否安装了xlsx2csv (Python工具)
        $checkXlsx2csv = shell_exec('which xlsx2csv 2>/dev/null');
        if (!empty($checkXlsx2csv)) {
            $command = 'xlsx2csv ' . escapeshellarg($filePath) . ' ' . escapeshellarg($tempCsvFile . '.csv') . ' 2>/dev/null';
            shell_exec($command);

            if (file_exists($tempCsvFile . '.csv')) {
                $newUsers = importFromCSV($tempCsvFile . '.csv', $existingPhones, $errors, $duplicatePhones);
                unlink($tempCsvFile . '.csv');
                unlink($tempCsvFile);
                return $newUsers;
            }
        }
    }

    // 如果以上方法都失败，尝试直接以二进制方式读取Excel文件，解析表格标记
    // 注意：这种方法不太可靠，仅作为最后尝试
    $xlsData = file_get_contents($filePath);
    if ($xlsData !== false) {
        // 使用正则表达式尝试提取单元格内容 (这只能处理简单的XLSX文件)
        preg_match_all('/<c[^>]*>(?:<v>([^<]*)<\/v>|<t>([^<]*)<\/t>)<\/c>/', $xlsData, $matches);

        // 如果找到内容，尝试解析
        if (!empty($matches[0])) {
            $values = array();
            foreach ($matches[0] as $i => $match) {
                if (!empty($matches[1][$i])) {
                    $values[] = $matches[1][$i];
                } elseif (!empty($matches[2][$i])) {
                    $values[] = $matches[2][$i];
                }
            }

            // 假设每行有3个字段 (name, phone, remark)
            $rowCount = floor(count($values) / 3);
            for ($i = 0; $i < $rowCount; $i++) {
                $index = $i * 3;
                $name = isset($values[$index]) ? trim($values[$index]) : '';
                $phone = isset($values[$index+1]) ? trim($values[$index+1]) : '';
                $remark = isset($values[$index+2]) ? trim($values[$index+2]) : '';

                // 验证数据
                if (empty($name) || empty($phone)) {
                    continue;
                }

                // 验证手机号
                if (!validatePhone($phone)) {
                    continue;
                }

                // 检查是否与现有数据重复
                if (in_array($phone, $existingPhones)) {
                    $duplicatePhones[] = $phone;
                    continue;
                }

                // 检查是否与之前条目重复
                if (in_array($phone, array_column($newUsers, 'phone'))) {
                    continue;
                }

                // 创建新用户
                $newUser = [
                    'name' => $name,
                    'phone' => $phone,
                    'date' => date('Y-m-d H:i:s')
                ];

                if (!empty($remark)) {
                    $newUser['remark'] = $remark;
                }

                $newUsers[] = $newUser;
            }
        }
    }

    // 清理临时文件
    if (file_exists($tempCsvFile)) {
        unlink($tempCsvFile);
    }

    return $newUsers;
}

// 导入JSON文件
function importFromJSON($filePath, $existingPhones, &$errors, &$duplicatePhones) {
    $newUsers = [];

    // 读取文件内容
    $content = file_get_contents($filePath);
    if (empty($content)) {
        $errors[] = "JSON文件为空";
        return $newUsers;
    }

    // 解析JSON
    $data = json_decode($content, true);
    if ($data === null) {
        $errors[] = "JSON解析错误: " . json_last_error_msg();
        return $newUsers;
    }

    // 如果是数组的数组（用户列表）
    if (is_array($data) && !isset($data['name'])) {
        foreach ($data as $index => $user) {
            // 索引+1作为行号
            $lineNum = $index + 1;

            // 检查必要字段
            if (!isset($user['name']) || !isset($user['phone'])) {
                $errors[] = "数据 {$lineNum}: 缺少必要字段，需要包含name和phone";
                continue;
            }

            $name = trim($user['name']);
            $phone = trim($user['phone']);
            $remark = isset($user['remark']) ? trim($user['remark']) : '';

            // 基本验证
            if (empty($name)) {
                $errors[] = "数据 {$lineNum}: 姓名不能为空";
                continue;
            }

            if (empty($phone)) {
                $errors[] = "数据 {$lineNum}: 手机号不能为空";
                continue;
            }

            // 验证手机号格式
            if (!validatePhone($phone)) {
                $errors[] = "数据 {$lineNum}: 手机号格式不正确 - {$phone}";
                continue;
            }

            // 检查是否与现有数据重复
            if (in_array($phone, $existingPhones)) {
                $duplicatePhones[] = $phone;
                continue;
            }

            // 检查JSON内部是否有重复
            if (in_array($phone, array_column($newUsers, 'phone'))) {
                $errors[] = "数据 {$lineNum}: 手机号在导入文件中重复 - {$phone}";
                continue;
            }

            // 创建新用户
            $newUser = [
                'name' => $name,
                'phone' => $phone,
                'date' => date('Y-m-d H:i:s')
            ];

            if (!empty($remark)) {
                $newUser['remark'] = $remark;
            }

            $newUsers[] = $newUser;
        }
    }
    // 如果是单个用户对象
    else if (isset($data['name']) && isset($data['phone'])) {
        $name = trim($data['name']);
        $phone = trim($data['phone']);
        $remark = isset($data['remark']) ? trim($data['remark']) : '';

        // 基本验证
        if (empty($name)) {
            $errors[] = "数据: 姓名不能为空";
            return $newUsers;
        }

        if (empty($phone)) {
            $errors[] = "数据: 手机号不能为空";
            return $newUsers;
        }

        // 验证手机号格式
        if (!validatePhone($phone)) {
            $errors[] = "数据: 手机号格式不正确 - {$phone}";
            return $newUsers;
        }

        // 检查是否与现有数据重复
        if (in_array($phone, $existingPhones)) {
            $duplicatePhones[] = $phone;
            return $newUsers;
        }

        // 创建新用户
        $newUser = [
            'name' => $name,
            'phone' => $phone,
            'date' => date('Y-m-d H:i:s')
        ];

        if (!empty($remark)) {
            $newUser['remark'] = $remark;
        }

        $newUsers[] = $newUser;
    } else {
        $errors[] = "JSON格式不正确，需要包含name和phone字段";
    }

    return $newUsers;
}
?>