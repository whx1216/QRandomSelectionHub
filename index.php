<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Add this for HTTP compatibility -->
    <title>抽号器系统</title>
    <link href="https://www.unpkg.com/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://www.unpkg.com/animate.css@4.1.1/animate.min.css" rel="stylesheet">
    <link href="https://www.unpkg.com/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
<div class="container">
    <header class="text-center mt-2 mb-2">
        <h1 class="display-5">抽号器系统</h1>
    </header>

    <!-- 项目选择界面 -->
    <div id="project-selector" class="row justify-content-center">
        <div class="col-lg-8">
            <div class="card">
                <div class="card-header py-2">
                    <h5 class="mb-0">项目选择</h5>
                </div>
                <div class="card-body">
                    <!-- 项目列表容器 -->
                    <div id="project-list-container">
                        <div class="mb-2">
                            <button id="createProjectBtn" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> 创建新项目
                            </button>
                        </div>
                        <div id="projectList" class="mt-2">
                            <div class="text-center py-2">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-2">加载项目列表...</p>
                            </div>
                        </div>
                    </div>

                    <!-- 创建项目表单 -->
                    <div id="create-project-container" class="d-none">
                        <div class="mb-2">
                            <button id="backToListBtn" class="btn btn-outline-secondary">
                                <i class="bi bi-arrow-left"></i> 返回项目列表
                            </button>
                        </div>
                        <h4>创建新项目</h4>
                        <form id="projectForm">
                            <div class="mb-2">
                                <label for="projectName" class="form-label">项目名称</label>
                                <input type="text" class="form-control" id="projectName" required>
                            </div>
                            <div class="mb-2">
                                <label for="projectDescription" class="form-label">项目描述 (可选)</label>
                                <textarea class="form-control" id="projectDescription" rows="2"></textarea>
                            </div>
                            <div class="mb-2">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="enablePasswordSwitch">
                                    <label class="form-check-label" for="enablePasswordSwitch">启用密码保护</label>
                                </div>
                            </div>
                            <div class="mb-2 password-container d-none">
                                <label for="projectPassword" class="form-label">项目密码</label>
                                <input type="password" class="form-control" id="projectPassword">
                                <div class="form-text small">设置密码后，其他人需要密码才能访问此项目</div>
                            </div>
                            <button type="submit" class="btn btn-primary">创建项目</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 项目内容 -->
    <div id="project-container" class="d-none">
        <div class="project-info mb-2 text-center">
            <h2 id="project-name" class="mb-2 fs-3">项目名称</h2>
            <div class="badge bg-primary mb-1">项目代码: <span id="project-code">CODE</span></div>
        </div>

        <div class="row gx-3">
            <!-- 左侧二维码 -->
            <div class="col-md-4 mb-3">
                <div class="card qrcode-card h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title fs-6">扫码参与</h5>
                        <div id="qrcode" class="my-1"></div>
                        <button id="openSubmitPageBtn" class="btn btn-sm btn-outline-primary mt-1">
                            <i class="bi bi-link-45deg"></i> 打开提交页面
                        </button>
                    </div>
                </div>
            </div>

            <!-- 右侧内容 -->
            <div class="col-md-8">
                <!-- 控制面板 -->
                <div class="card control-card mb-2">
                    <div class="card-header py-1 d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 fs-6">控制面板</h5>
                        <div class="">
                            <button class="btn btn-sm btn-outline-primary" id="backToListButton">
                                <i class="bi bi-arrow-left"></i> 返回列表
                            </button>
                            <button class="btn btn-sm btn-outline-info" id="viewHistoryButton">
                                <i class="bi bi-clock-history"></i> 历史记录
                            </button>
                        </div>
                        <div class="form-check form-switch mb-0">
                            <input class="form-check-input" type="checkbox" id="autoRefreshSwitch">
                            <label class="form-check-label small" for="autoRefreshSwitch">自动刷新</label>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- 抽号设置 - 重新布局 -->
                        <div class="draw-settings mb-3">
                            <div class="row align-items-center">
                                <div class="col-6">
                                    <div class="d-flex align-items-center">
                                        <label for="drawCount" class="form-label me-2 mb-0">抽取人数:</label>
                                        <div class="input-group input-group-sm" style="width: 100px;">
                                            <input type="number" id="drawCount" class="form-control" min="1" value="1">
                                            <span class="input-group-text">人</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-6">
                                    <div class="form-check form-switch d-flex align-items-center">
                                        <input class="form-check-input me-2" type="checkbox" id="allowRepeatSwitch">
                                        <label class="form-check-label" for="allowRepeatSwitch">允许重复抽取</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 控制按钮组 - 保持网格但优化间距 -->
                        <div class="action-buttons mb-3">
                            <button id="drawButton" class="btn-action btn-draw">
                                <i class="bi bi-dice-5-fill"></i> 开始抽号
                            </button>
                            <button id="resetButton" class="btn-action btn-reset">
                                <i class="bi bi-arrow-counterclockwise"></i> 重置
                            </button>
                            <button id="refreshButton" class="btn-action btn-refresh">
                                <i class="bi bi-arrow-repeat"></i> 刷新列表
                            </button>
                            <button id="clearButton" class="btn-action btn-clear">
                                <i class="bi bi-trash"></i> 清空列表
                            </button>
                        </div>

                        <!-- 数据管理按钮 -->
                        <div class="d-flex justify-content-between mt-2">
                            <button id="importUsersBtn" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-file-earmark-arrow-up"></i> 导入用户
                            </button>
                            <button id="clearDrawMarksBtn" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-eraser"></i> 清除抽号标记
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 抽号结果 -->
                <div id="result-display" class="card result-card mb-2 d-none">
                    <div class="card-header py-1">
                        <h5 class="mb-0 fs-6">抽号结果</h5>
                    </div>
                    <div class="card-body text-center">
                        <div id="winner" class="winner-display"></div>
                    </div>
                </div>

                <!-- 用户列表 -->
                <div class="card user-list-card">
                    <div class="card-header py-1 d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 fs-6">参与人员</h5>
                        <span class="badge bg-primary rounded-pill" id="user-count">0</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover table-sm mb-0">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>姓名</th>
                                    <th>手机号</th>
                                    <th>提交时间</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody id="userList">
                                <tr>
                                    <td colspan="5" class="text-center">加载中...</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 抽号历史容器 -->
    <div id="history-container" class="d-none">
        <div class="row">
            <div class="col-12 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h3 class="fs-4">抽号历史记录</h3>
                    <div>
                        <button class="btn btn-sm btn-outline-danger" id="clearHistoryBtn">
                            <i class="bi bi-trash"></i> 清空历史
                        </button>
                        <button class="btn btn-sm btn-primary" id="backToProjectButton">
                            <i class="bi bi-arrow-left"></i> 返回项目
                        </button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header py-1 d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 fs-6">历史记录列表</h5>
                        <div>
                            <button id="refreshHistoryBtn" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-arrow-repeat"></i> 刷新
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover table-sm mb-0">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>时间</th>
                                    <th>人数</th>
                                    <th>描述</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody id="historyList">
                                <tr>
                                    <td colspan="5" class="text-center">加载中...</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-2">
        <p class="text-muted small mb-0">design by whx</p>
    </footer>
</div>

<!-- 导入用户模态框 -->
<div class="modal fade" id="importUsersModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">导入用户数据</h5>
                <button type="button" class="btn-close" id="closeImportModalBtn" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="importForm" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label for="importFile" class="form-label">选择文件</label>
                        <input class="form-control" type="file" id="importFile" accept=".csv,.xlsx,.xls,.json,.txt">
                        <div class="form-text">支持的文件格式: CSV, Excel, JSON, TXT</div>
                    </div>
                    <div class="mb-3">
                        <div class="alert alert-info">
                            <p><i class="bi bi-info-circle"></i> 文件格式说明</p>
                            <p>1. CSV/TXT: 第一行可以是标题(姓名,手机号,备注)<br>
                                2. Excel: 第一列为姓名，第二列为手机号，第三列为备注(可选)<br>
                                3. JSON: 包含name和phone字段的对象数组<br>
                                4. 手机号必须是有效的11位中国大陆手机号</p>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" id="importSubmitBtn">导入数据</button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- 密码输入模态框 -->
<div class="modal fade" id="passwordModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">输入项目密码</h5>
            </div>
            <div class="modal-body">
                <p>该项目受密码保护，请输入密码继续。</p>
                <div class="mb-3">
                    <label for="projectPasswordInput" class="form-label">密码</label>
                    <input type="password" class="form-control" id="projectPasswordInput" placeholder="请输入项目密码">
                </div>
                <div id="passwordError" class="alert alert-danger d-none"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="backToProjectsBtn">返回项目列表</button>
                <button type="button" class="btn btn-primary" id="submitPasswordBtn">确认</button>
            </div>
        </div>
    </div>
</div>

<!-- 删除项目确认模态框 -->
<div class="modal fade" id="deleteProjectModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">确认删除项目</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>您确定要删除此项目吗？</p>
                <p class="text-danger"><strong>警告：</strong>此操作将删除项目及其所有数据，且无法恢复！</p>
                <p class="text-muted small">删除后的数据将自动备份到 backups 目录</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-danger" id="confirmDeleteProjectBtn">确认删除</button>
            </div>
        </div>
    </div>
</div>

<!-- 清空历史确认模态框 -->
<div class="modal fade" id="clearHistoryModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">确认清空历史</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>您确定要清空所有抽号历史记录吗？</p>
                <p class="text-danger"><strong>警告：</strong>此操作无法撤销！所有历史记录将被永久删除。</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-danger" id="confirmClearHistoryBtn">确认清空</button>
            </div>
        </div>
    </div>
</div>

<script src="https://www.unpkg.com/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://www.unpkg.com/qrcodejs@1.0.0/qrcode.min.js"></script>
<script src="js/main.js"></script>
</body>
</html>