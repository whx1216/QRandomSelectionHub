document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数中的项目代码
    const urlParams = new URLSearchParams(window.location.search);
    const projectCode = urlParams.get('project');

    // 如果URL包含项目代码，直接加载该项目
    if (projectCode) {
        loadProject(projectCode);
    } else {
        // 否则显示项目选择界面
        showProjectSelector();
    }

    // 设置事件处理程序
    setupEventListeners();
});

// 设置所有事件监听器
function setupEventListeners() {
    // 抽号相关按钮
    document.getElementById('drawButton')?.addEventListener('click', startDraw);
    document.getElementById('resetButton')?.addEventListener('click', resetDraw);
    document.getElementById('refreshButton')?.addEventListener('click', function() {
        loadUserList(getCurrentProjectCode());
    });
    document.getElementById('clearButton')?.addEventListener('click', confirmClearUsers);
    document.getElementById('clearDrawMarksBtn')?.addEventListener('click', clearDrawMarks);

    // 项目导航按钮
    document.getElementById('backToListButton')?.addEventListener('click', showProjectSelector);
    document.getElementById('viewHistoryButton')?.addEventListener('click', function() {
        showDrawHistoryWithValidation(getCurrentProjectCode());
    });
    document.getElementById('backToProjectButton')?.addEventListener('click', backToProject);
    document.getElementById('deleteProjectBtn')?.addEventListener('click', confirmDeleteProject);
    document.getElementById('clearHistoryBtn')?.addEventListener('click', confirmClearHistory);

    // 提交页面按钮
    document.getElementById('openSubmitPageBtn')?.addEventListener('click', function() {
        const projectCode = getCurrentProjectCode();
        if (projectCode) {
            const currentURL = window.location.href;
            const baseURL = currentURL.substring(0, currentURL.lastIndexOf('/') + 1);
            const submitURL = `${baseURL}submit.php?project=${projectCode}`;
            window.open(submitURL, '_blank');
        }
    });

    // 项目选择相关
    document.getElementById('createProjectBtn')?.addEventListener('click', showCreateProjectForm);
    document.getElementById('projectForm')?.addEventListener('submit', handleCreateProject);
    document.getElementById('backToListBtn')?.addEventListener('click', function() {
        document.getElementById('project-list-container').classList.remove('d-none');
        document.getElementById('create-project-container').classList.add('d-none');
    });

    // 密码开关事件
    document.getElementById('enablePasswordSwitch')?.addEventListener('change', function() {
        const passwordContainer = document.querySelector('.password-container');
        const passwordInput = document.getElementById('projectPassword');

        if (this.checked) {
            passwordContainer.classList.remove('d-none');
            passwordInput.setAttribute('required', 'required');
        } else {
            passwordContainer.classList.add('d-none');
            passwordInput.removeAttribute('required');
        }
    });

    // 用户导入相关
    document.getElementById('importUsersBtn')?.addEventListener('click', function() {
        document.getElementById('importUsersModal').classList.add('show');
        document.getElementById('importUsersModal').style.display = 'block';
    });
    document.getElementById('closeImportModalBtn')?.addEventListener('click', function() {
        document.getElementById('importUsersModal').classList.remove('show');
        document.getElementById('importUsersModal').style.display = 'none';
    });
    document.getElementById('importForm')?.addEventListener('submit', handleImportUsers);

    // 自动刷新切换
    const autoRefreshSwitch = document.getElementById('autoRefreshSwitch');
    if (autoRefreshSwitch) {
        autoRefreshSwitch.addEventListener('change', function() {
            if (this.checked) {
                // 开启自动刷新 - 每秒刷新一次
                window.autoRefreshInterval = setInterval(function() {
                    loadUserList(getCurrentProjectCode(), true); // true表示静默刷新
                }, 1000);
                showNotification('success', '自动刷新已开启', '每秒自动刷新一次');
            } else {
                // 关闭自动刷新
                clearInterval(window.autoRefreshInterval);
                showNotification('info', '自动刷新已关闭');
            }
        });
    }

    // 历史相关
    document.getElementById('refreshHistoryBtn')?.addEventListener('click', function() {
        loadDrawHistory(getCurrentProjectCode());
    });

    // 确认删除项目按钮
    document.getElementById('confirmDeleteProjectBtn')?.addEventListener('click', function() {
        deleteProject(getCurrentProjectCode());
    });

    // 确认清空历史按钮
    document.getElementById('confirmClearHistoryBtn')?.addEventListener('click', function() {
        clearAllHistory(getCurrentProjectCode());
    });
}

// 获取当前项目代码
function getCurrentProjectCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('project');
}

// 加载项目
function loadProject(projectCode) {
    fetch(`./api/get_projects.php`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.text().then(text => {
                if (!text || text.trim() === '') {
                    return { success: false, message: '服务器返回空响应' };
                }

                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSON解析错误:', e);
                    throw new Error('服务器返回了非JSON格式的数据');
                }
            });
        })
        .then(data => {
            if (data.success && data.data.length > 0) {
                // 查找当前项目
                const project = data.data.find(p => p.code === projectCode);

                if (project) {
                    // 检查项目是否受密码保护
                    if (project.is_protected) {
                        // 检查是否已经验证过密码（存在token）
                        const token = localStorage.getItem(`project_token_${projectCode}`);
                        if (token) {
                            // 验证token有效性
                            verifyToken(projectCode, token, function(valid) {
                                if (valid) {
                                    displayProject(project);
                                } else {
                                    // token无效，需要重新输入密码
                                    showPasswordModal(project);
                                }
                            });
                        } else {
                            // 没有token，需要输入密码
                            showPasswordModal(project);
                        }
                    } else {
                        // 项目不受密码保护，直接显示
                        displayProject(project);
                    }
                } else {
                    showNotification('error', '项目不存在', '请选择有效的项目');
                    showProjectSelector();
                }
            } else {
                showNotification('error', '无法加载项目', '请创建一个新项目');
                showProjectSelector();
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
            showProjectSelector();
        });
}

// 验证token
function verifyToken(projectCode, token, callback) {
    apiRequest('./api/verify_token.php', 'POST', {
        projectCode: projectCode,
        token: token
    })
        .then(data => {
            callback(data.success);
        })
        .catch(error => {
            console.error('验证token错误:', error);
            callback(false);
        });
}

// 显示密码输入模态框
function showPasswordModal(project) {
    // 创建模态框实例
    const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    passwordModal.show();

    // 设置密码模态框的标题
    document.querySelector('#passwordModal .modal-title').textContent = `输入项目密码 - ${project.name}`;
    document.querySelector('#passwordModal .modal-body p').textContent = `项目 "${project.name}" 受密码保护，请输入密码继续。`;

    // 清空密码输入框和错误信息
    document.getElementById('projectPasswordInput').value = '';
    document.getElementById('passwordError').classList.add('d-none');

    // 返回按钮事件
    document.getElementById('backToProjectsBtn').addEventListener('click', function() {
        passwordModal.hide();
        setTimeout(() => {
            showProjectSelector();
        }, 300);
    });

    // 提交密码按钮事件
    document.getElementById('submitPasswordBtn').addEventListener('click', function() {
        const password = document.getElementById('projectPasswordInput').value;

        if (!password) {
            document.getElementById('passwordError').classList.remove('d-none');
            document.getElementById('passwordError').textContent = '请输入密码';
            return;
        }

        // 禁用按钮，显示加载状态
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 验证中...';

        // 验证密码
        verifyProjectPassword(project.code, password, function(success, token) {
            if (success) {
                // 存储token
                localStorage.setItem(`project_token_${project.code}`, token);

                // 关闭模态框
                passwordModal.hide();

                // 显示项目内容
                displayProject(project);
            } else {
                // 恢复按钮状态
                document.getElementById('submitPasswordBtn').disabled = false;
                document.getElementById('submitPasswordBtn').textContent = '确认';

                // 显示错误
                document.getElementById('passwordError').classList.remove('d-none');
                document.getElementById('passwordError').textContent = '密码错误，请重试';
            }
        });
    });

    // 按Enter键提交
    document.getElementById('projectPasswordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('submitPasswordBtn').click();
        }
    });
}

// 验证项目密码
function verifyProjectPassword(projectCode, password, callback) {
    // 显示加载状态
    document.getElementById('submitPasswordBtn').disabled = true;
    document.getElementById('submitPasswordBtn').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 验证中...';
    document.getElementById('passwordError').classList.add('d-none');

    apiRequest('./api/verify_project_password.php', 'POST', {
        projectCode: projectCode,
        password: password
    })
        .then(data => {
            if (data.success) {
                callback(true, data.token);
            } else {
                callback(false);
            }
        })
        .catch(error => {
            console.error('验证密码错误:', error);
            callback(false);
        });
}

// 显示项目内容
function displayProject(project) {
    // 显示项目信息
    document.getElementById('project-container').classList.remove('d-none');
    document.getElementById('project-selector').classList.add('d-none');
    document.getElementById('history-container')?.classList.add('d-none');

    document.getElementById('project-name').textContent = project.name;
    document.getElementById('project-code').textContent = project.code;

    // 更新二维码
    updateQRCode(project.code);

    // 加载用户列表
    loadUserList(project.code);

    // 初始化已抽取用户标记
    initializeDrawState(project.code);
}

// 初始化抽号状态
function initializeDrawState(projectCode) {
    // 从本地存储中获取已抽取用户
    const storageKey = `drawn_users_${projectCode}`;
    if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify([]));
    }
}

// 获取已抽取的用户ID列表
function getDrawnUsers(projectCode) {
    const storageKey = `drawn_users_${projectCode}`;
    const drawnUsers = localStorage.getItem(storageKey);
    return drawnUsers ? JSON.parse(drawnUsers) : [];
}

// 标记用户为已抽取
function markUserAsDrawn(projectCode, userId) {
    const storageKey = `drawn_users_${projectCode}`;
    const drawnUsers = getDrawnUsers(projectCode);

    if (!drawnUsers.includes(userId)) {
        drawnUsers.push(userId);
        localStorage.setItem(storageKey, JSON.stringify(drawnUsers));
    }
}

// 清除所有抽取标记
function clearDrawMarks() {
    const projectCode = getCurrentProjectCode();
    if (!projectCode) return;

    localStorage.setItem(`drawn_users_${projectCode}`, JSON.stringify([]));
    showNotification('success', '标记已清除', '所有抽号标记已清除');

    // 刷新用户列表，更新UI状态
    loadUserList(projectCode);
}

// 更新二维码
function updateQRCode(projectCode) {
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';

    const currentURL = window.location.href;
    const baseURL = currentURL.substring(0, currentURL.lastIndexOf('/') + 1);
    const submitURL = `${baseURL}submit.php?project=${projectCode}`;

    new QRCode(qrcodeElement, {
        text: submitURL,
        width: 200,
        height: 200,
        colorDark: '#4361ee',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// 显示项目选择界面
function showProjectSelector() {
    document.getElementById('project-container').classList.add('d-none');
    document.getElementById('project-selector').classList.remove('d-none');
    document.getElementById('history-container')?.classList.add('d-none');

    // 更新URL移除项目参数
    history.replaceState(null, document.title, window.location.pathname);

    // 加载项目列表
    apiRequest('./api/get_projects.php')
        .then(data => {
            if (data.success) {
                displayProjectList(data.data);
            } else {
                showNotification('error', '加载项目列表失败', data.message);
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        });
}

// 显示项目列表
function displayProjectList(projects) {
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = '';

    if (projects.length === 0) {
        projectList.innerHTML = '<div class="text-center py-5">暂无项目，请创建新项目</div>';
        return;
    }

    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'card project-card mb-3';

        // 添加锁图标（如果项目受密码保护）
        const lockIcon = project.is_protected ?
            '<i class="bi bi-lock-fill text-warning ms-2" title="此项目受密码保护"></i>' : '';

        projectCard.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${project.name} ${lockIcon}</h5>
                <h6 class="card-subtitle mb-2 text-muted">代码: ${project.code}</h6>
                <p class="card-text">${project.description || '无描述'}</p>
                <p class="card-text"><small class="text-muted">创建于: ${project.created_at}</small></p>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary select-project" data-code="${project.code}">选择此项目</button>
                    <button class="btn btn-outline-danger delete-project" data-code="${project.code}" data-name="${project.name}">删除</button>
                </div>
            </div>
        `;
        projectList.appendChild(projectCard);

        // 添加选择项目事件
        projectCard.querySelector('.select-project').addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            window.location.href = `index.php?project=${code}`;
        });

        // 添加删除项目事件
        projectCard.querySelector('.delete-project').addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            const name = this.getAttribute('data-name');
            confirmDeleteProject(code, name);
        });
    });
}


// 确认删除项目// 确认删除项目
function confirmDeleteProject(projectCode, projectName) {
    if (!projectCode) {
        projectCode = getCurrentProjectCode();
        projectName = document.getElementById('project-name').textContent;
    }

    // 获取项目信息
    apiRequest(`./api/get_projects.php`)
        .then(data => {
            if (data.success) {
                const project = data.data.find(p => p.code === projectCode);

                if (!project) {
                    showNotification('error', '项目不存在');
                    return;
                }

                // 如果项目受密码保护,先验证密码
                if (project.is_protected) {
                    showDeletePasswordModal(project);
                } else {
                    // 不需要密码的项目直接显示确认框
                    showDeleteConfirmModal(project);
                }
            }
        })
        .catch(error => {
            console.error('获取项目信息错误:', error);
            showNotification('error', '系统错误', '无法获取项目信息');
        });
}

// 显示删除密码验证模态框
function showDeletePasswordModal(project) {
    const modalHTML = `
        <div class="modal fade" id="deletePasswordModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">输入项目密码</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>删除项目 "${project.name}" 需要验证密码</p>
                        <div class="mb-3">
                            <label for="deletePasswordInput" class="form-label">请输入项目密码</label>
                            <input type="password" class="form-control" id="deletePasswordInput">
                        </div>
                        <div id="deletePasswordError" class="alert alert-danger d-none"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="verifyDeletePasswordBtn">验证</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('deletePasswordModal'));
    modal.show();

    // 验证密码按钮事件
    document.getElementById('verifyDeletePasswordBtn').addEventListener('click', function() {
        const password = document.getElementById('deletePasswordInput').value;

        if (!password) {
            document.getElementById('deletePasswordError').classList.remove('d-none');
            document.getElementById('deletePasswordError').textContent = '请输入密码';
            return;
        }

        // 验证密码
        apiRequest('./api/verify_project_password.php', 'POST', {
            projectCode: project.code,
            password: password
        })
            .then(data => {
                if (data.success) {
                    modal.hide();
                    // 密码验证成功后显示删除确认框
                    showDeleteConfirmModal(project);
                } else {
                    document.getElementById('deletePasswordError').classList.remove('d-none');
                    document.getElementById('deletePasswordError').textContent = '密码错误';
                }
            })
            .catch(error => {
                console.error('密码验证错误:', error);
                document.getElementById('deletePasswordError').classList.remove('d-none');
                document.getElementById('deletePasswordError').textContent = '系统错误,请重试';
            });
    });

    // 模态框关闭时移除元素
    document.getElementById('deletePasswordModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}

// 显示删除确认模态框
function showDeleteConfirmModal(project) {
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteProjectModal'));
    document.querySelector('#deleteProjectModal .modal-body p:first-child').textContent =
        `您确定要删除项目"${project.name}"吗？`;
    deleteModal.show();

    // 清除之前可能的事件监听
    const confirmBtn = document.getElementById('confirmDeleteProjectBtn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    // 添加确认删除事件
    newBtn.addEventListener('click', function() {
        deleteProject(project.code);
        deleteModal.hide();
    });
}

// 删除项目
function deleteProject(projectCode) {
    // 显示加载状态
    const deleteBtn = document.getElementById('confirmDeleteProjectBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 删除中...';

    apiRequest('./api/delete_project.php', 'POST', {
        projectCode: projectCode
    })
        .then(data => {
            if (data.success) {
                showNotification('success', '项目已删除');
                // 返回项目列表
                showProjectSelector();
            } else {
                showNotification('error', '删除失败', data.message);
            }
        })
        .catch(error => {
            console.error('删除项目错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        })
        .finally(() => {
            // 恢复按钮状态（虽然模态框可能已关闭）
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '确认删除';
            }
        });
}

// 显示创建项目表单
function showCreateProjectForm() {
    document.getElementById('project-list-container').classList.add('d-none');
    document.getElementById('create-project-container').classList.remove('d-none');
}

// 处理创建项目
function handleCreateProject(e) {
    e.preventDefault();

    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const enablePassword = document.getElementById('enablePasswordSwitch').checked;
    const projectPassword = document.getElementById('projectPassword').value;

    if (!projectName) {
        showNotification('error', '项目名称不能为空');
        return;
    }

    if (enablePassword && !projectPassword) {
        showNotification('error', '请输入项目密码');
        return;
    }

    // 禁用提交按钮
    const submitButton = document.querySelector('#projectForm button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 创建中...';

    const data = {
        name: projectName,
        description: projectDescription
    };

    // 只有启用密码时才发送密码
    if (enablePassword) {
        data.password = projectPassword;
    }

    apiRequest('./api/create_project.php', 'POST', data)
        .then(result => {
            if (result.success) {
                showNotification('success', '项目创建成功');
                // 重定向到新项目
                window.location.href = `index.php?project=${result.project.code}`;
            } else {
                showNotification('error', '创建项目失败', result.message);
                // 恢复按钮状态
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
            // 恢复按钮状态
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
}

// 加载用户列表
function loadUserList(projectCode, silent = false) {
    if (!projectCode) return;

    // Show loading indicator
    const userList = document.getElementById('userList');
    if (userList.children.length === 0) {
        userList.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> 加载中...</td></tr>';
    }

    // Get current page from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page')) || 1;

    // Load users with pagination info
    apiRequest(`./api/get_users.php?project=${projectCode}&page=${currentPage}&limit=50`)
        .then(data => {
            if (data.success) {
                displayUserList(data.data, projectCode);
                if (!silent) {
                    showNotification('success', '刷新成功', `共加载 ${data.data.length} 位参与者`);
                }
            } else {
                console.error('加载用户列表失败:', data.message);
                if (!silent) {
                    showNotification('error', '加载失败', data.message);
                }
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            if (!silent) {
                showNotification('error', '网络错误', '无法连接到服务器');
            }
        });
}

// 显示用户列表
function displayUserList(users, projectCode) {
    const userList = document.getElementById('userList');
    const userCount = document.getElementById('user-count');
    const paginationContainer = document.getElementById('userListPagination') || createPaginationContainer();

    // Update the count
    userCount.textContent = users.length;

    // Get drawn users
    const drawnUsers = getDrawnUsers(projectCode);

    if (users.length === 0) {
        userList.innerHTML = '<tr><td colspan="5" class="text-center">暂无参与者</td></tr>';
        paginationContainer.style.display = 'none';
        return;
    }

    // Sort users by ID in descending order (newest first)
    users.sort((a, b) => b.id - a.id);

    // Pagination settings
    const pageSize = 50; // Show 50 users per page
    const totalPages = Math.ceil(users.length / pageSize);

    // Get current page from URL or default to 1
    const urlParams = new URLSearchParams(window.location.search);
    let currentPage = parseInt(urlParams.get('page')) || 1;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    // Calculate slice indices for current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, users.length);
    const currentPageUsers = users.slice(startIndex, endIndex);

    // Use DocumentFragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    // Clear existing content
    userList.innerHTML = '';

    // Track existing rows to minimize DOM changes
    const existingRows = new Map();
    Array.from(userList.querySelectorAll('tr[data-user-id]')).forEach(row => {
        existingRows.set(row.getAttribute('data-user-id'), row);
    });

    // Process current page of users
    currentPageUsers.forEach(user => {
        const isDrawn = drawnUsers.includes(user.id);
        const maskedPhone = user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

        let row;
        // Reuse existing row if possible
        if (existingRows.has(user.id.toString())) {
            row = existingRows.get(user.id.toString());

            // Update content only if needed
            row.querySelector('td:nth-child(2)').textContent = user.name;
            row.querySelector('td:nth-child(3)').textContent = maskedPhone;
            row.querySelector('td:nth-child(4)').innerHTML =
                `${user.date} ${isDrawn ? '<span class="badge bg-success ms-1">已抽</span>' : ''}`;

            // Update drawn status efficiently
            if (isDrawn && !row.classList.contains('table-success')) {
                row.classList.add('table-success');
            } else if (!isDrawn && row.classList.contains('table-success')) {
                row.classList.remove('table-success');
            }

            existingRows.delete(user.id.toString());
        } else {
            // Create new row without unnecessary animation
            row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);

            if (isDrawn) {
                row.classList.add('table-success');
            }

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${maskedPhone}</td>
                <td>${user.date} ${isDrawn ? '<span class="badge bg-success ms-1">已抽</span>' : ''}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id}" title="编辑"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}" title="删除"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            `;
        }

        fragment.appendChild(row);
    });

    // Add all rows to the DOM at once
    userList.appendChild(fragment);

    // Update pagination
    updatePagination(paginationContainer, currentPage, totalPages, projectCode);

    // Use event delegation for better performance
    setupUserTableEventListeners(userList, projectCode);
}

// Create pagination container if it doesn't exist
function createPaginationContainer() {
    const container = document.createElement('div');
    container.id = 'userListPagination';
    container.className = 'pagination-container mt-3 d-flex justify-content-center';

    const userListContainer = document.getElementById('userList').parentNode.parentNode;
    userListContainer.appendChild(container);

    return container;
}

// Update pagination UI
function updatePagination(container, currentPage, totalPages, projectCode) {
    // Don't show pagination for small datasets
    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    let paginationHTML = `
        <nav aria-label="用户列表分页">
            <ul class="pagination">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="上一页">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
    `;

    // Limit visible page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;

        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }

        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }

    paginationHTML += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="下一页">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    `;

    container.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    container.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                // Update URL with new page parameter
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('page', page);
                urlParams.set('project', projectCode);

                // Replace URL without reloading page
                history.replaceState(null, '', `?${urlParams.toString()}`);

                // Reload user list with new page
                loadUserList(projectCode, true);
            }
        });
    });
}

// Use event delegation for user table events
function setupUserTableEventListeners(userList, projectCode) {
    // Remove existing event listeners first to prevent duplicates
    const newTable = userList.cloneNode(true);
    userList.parentNode.replaceChild(newTable, userList);

    // Add new event listener using event delegation
    newTable.addEventListener('click', function(e) {
        // Find the closest button if any was clicked
        const editBtn = e.target.closest('.edit-user');
        const deleteBtn = e.target.closest('.delete-user');

        if (editBtn) {
            const userId = editBtn.getAttribute('data-id');
            // Find user data
            apiRequest(`./api/get_users.php?project=${projectCode}&id=${userId}`)
                .then(response => {
                    if (response.success && response.data.length > 0) {
                        showEditUserModal(response.data[0], projectCode);
                    } else {
                        showNotification('error', '找不到用户数据');
                    }
                })
                .catch(error => {
                    console.error('获取用户数据错误:', error);
                    showNotification('error', '系统错误', '无法获取用户数据');
                });

        } else if (deleteBtn) {
            const userId = deleteBtn.getAttribute('data-id');
            const row = deleteBtn.closest('tr');
            const userName = row.querySelector('td:nth-child(2)').textContent;
            confirmDeleteUser(userId, userName, projectCode);
        }
    });
}


// 显示编辑用户模态框
function showEditUserModal(user, projectCode) {
    // 创建模态框
    const modalHTML = `
        <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">编辑用户</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <input type="hidden" id="editUserId" value="${user.id}">
                            <div class="mb-3">
                                <label for="editUserName" class="form-label">姓名</label>
                                <input type="text" class="form-control" id="editUserName" value="${user.name}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editUserPhone" class="form-label">手机号</label>
                                <input type="tel" class="form-control" id="editUserPhone" value="${user.phone}" pattern="[0-9]{11}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editUserRemark" class="form-label">备注 (可选)</label>
                                <textarea class="form-control" id="editUserRemark" rows="2">${user.remark || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="saveUserBtn">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();

    // 保存按钮事件
    document.getElementById('saveUserBtn').addEventListener('click', function() {
        handleSaveUser(projectCode, modal);
    });

    // 模态框关闭时移除元素
    document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}

// 处理保存用户
function handleSaveUser(projectCode, modal) {
    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const phone = document.getElementById('editUserPhone').value.trim();
    const remark = document.getElementById('editUserRemark').value.trim();

    // 基本验证
    if (!name) {
        showNotification('error', '姓名不能为空');
        return;
    }

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        showNotification('error', '请输入有效的手机号');
        return;
    }

    const data = {
        id: parseInt(userId),
        name: name,
        phone: phone,
        projectCode: projectCode
    };

    if (remark) {
        data.remark = remark;
    }

    apiRequest('./api/edit_user.php', 'POST', data)
        .then(result => {
            if (result.success) {
                showNotification('success', '用户信息已更新');
                modal.hide();

                // 刷新用户列表
                loadUserList(projectCode);
            } else {
                showNotification('error', '更新失败', result.message);
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        });
}

// 确认删除用户
function confirmDeleteUser(userId, userName, projectCode) {
    const confirmHTML = `
        <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">确认删除</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>您确定要删除用户 <strong>${userName}</strong> 吗？</p>
                        <p class="text-danger">此操作无法撤销！</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteBtn">确认删除</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = confirmHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();

    // 确认删除按钮事件
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        deleteUser(userId, projectCode, modal);
    });

    // 模态框关闭时移除元素
    document.getElementById('deleteUserModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}

// 删除用户
function deleteUser(userId, projectCode, modal) {
    apiRequest('./api/delete_user.php', 'POST', {
        id: parseInt(userId),
        projectCode: projectCode
    })
        .then(result => {
            if (result.success) {
                showNotification('success', '用户已删除');
                modal.hide();

                // 刷新用户列表
                loadUserList(projectCode);
            } else {
                showNotification('error', '删除失败', result.message);
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        });
}

// 处理用户导入
function handleImportUsers(e) {
    e.preventDefault();

    const projectCode = getCurrentProjectCode();
    if (!projectCode) {
        showNotification('error', '项目代码无效');
        return;
    }

    const fileInput = document.getElementById('importFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('error', '请选择文件');
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB限制
        showNotification('error', '文件过大', '文件大小不能超过10MB');
        return;
    }

    // 检查文件类型
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const allowedExtensions = ['csv', 'xlsx', 'xls', 'json', 'txt'];

    if (!allowedExtensions.includes(fileExtension)) {
        showNotification('error', '不支持的文件类型', '支持的文件格式: CSV, Excel, JSON, TXT');
        return;
    }

    // 显示加载状态
    const importBtn = document.getElementById('importSubmitBtn');
    const originalBtnText = importBtn.textContent;
    importBtn.disabled = true;
    importBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 导入中...';

    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);

    // 使用原生fetch API发送文件 (不要设置Content-Type头，让浏览器自动处理)
    fetch(`./api/import_users.php?project=${projectCode}`, {
        method: 'POST',
        body: formData,
        // 确保不自动设置Content-Type和其他相关头部
        headers: {}
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            // 安全处理JSON解析
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('JSON解析错误:', e, 'Raw response:', text);
                throw new Error('服务器返回了非JSON格式的数据');
            }
            return result;
        })
        .then(result => {
            if (result.success) {
                showNotification('success', '导入成功', `已导入 ${result.imported} 位用户`);

                // 关闭模态框
                document.getElementById('closeImportModalBtn').click();

                // 重置表单
                document.getElementById('importForm').reset();

                // 刷新用户列表
                loadUserList(projectCode);
            } else {
                let errorMsg = result.message;
                if (result.errors && result.errors.length > 0) {
                    errorMsg += '\n首个错误: ' + result.errors[0];
                }
                showNotification('error', '导入失败', errorMsg);
            }
        })
        .catch(error => {
            console.error('导入用户错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器: ' + error.message);
        })
        .finally(() => {
            // 恢复按钮状态
            importBtn.disabled = false;
            importBtn.textContent = originalBtnText;
        });
}

// 开始抽号
// 开始抽号
function startDraw() {
    const drawButton = document.getElementById('drawButton');
    const resultDisplay = document.getElementById('result-display');
    const winnerElement = document.getElementById('winner');
    const drawCount = parseInt(document.getElementById('drawCount').value) || 1;
    const allowRepeat = document.getElementById('allowRepeatSwitch').checked;
    const projectCode = getCurrentProjectCode();

    // 验证抽取数量
    if (drawCount < 1) {
        showNotification('error', '参数错误', '抽取人数必须大于0');
        return;
    }

    // 禁用抽号按钮，防止重复点击
    drawButton.disabled = true;
    drawButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 抽号中...';

    // 显示结果区域
    resultDisplay.classList.remove('d-none');

    // 添加加载动画
    winnerElement.className = 'animate__animated animate__flash animate__infinite';
    winnerElement.innerHTML = '<div class="spinner-border text-primary" role="status"></div><p>正在选择幸运者...</p>';

    // 获取全部用户
    apiRequest(`./api/get_users.php?project=${projectCode}`)
        .then(data => {
            if (data.success && data.data.length > 0) {
                const users = data.data;
                const drawnUsers = getDrawnUsers(projectCode);

                // 检查剩余可抽人数（如果不允许重复抽取）
                if (!allowRepeat) {
                    const availableUsers = users.filter(user => !drawnUsers.includes(user.id));

                    if (availableUsers.length === 0) {
                        winnerElement.className = 'animate__animated animate__shakeX';
                        winnerElement.innerHTML = `
                            <div class="alert alert-warning">
                                <p>所有参与者已被抽取过！</p>
                                <p>请点击"清除抽号标记"按钮重新开始，或启用"允许重复抽取"选项。</p>
                                <button class="btn btn-primary mt-2" id="clearMarksNowBtn">立即清除标记</button>
                            </div>
                        `;

                        // 添加立即清除标记按钮事件
                        document.getElementById('clearMarksNowBtn').addEventListener('click', function() {
                            clearDrawMarks();
                            resetDraw();
                        });

                        // 恢复按钮状态
                        drawButton.disabled = false;
                        drawButton.innerHTML = '开始抽号';
                        return;
                    }

                    if (availableUsers.length < drawCount) {
                        winnerElement.className = 'animate__animated animate__shakeX';
                        winnerElement.innerHTML = `
                            <div class="alert alert-warning">
                                <p>剩余未抽取的参与者不足！</p>
                                <p>当前剩余 ${availableUsers.length} 人，您需要 ${drawCount} 人。</p>
                                <p>请减少抽取人数，或清除抽号标记重新开始。</p>
                                <div class="mt-2">
                                    <button class="btn btn-success me-2" id="drawAvailableBtn">抽取剩余 ${availableUsers.length} 人</button>
                                    <button class="btn btn-primary" id="clearMarksForDrawBtn">清除标记后抽取</button>
                                </div>
                            </div>
                        `;

                        // 添加抽取剩余人数按钮事件
                        document.getElementById('drawAvailableBtn').addEventListener('click', function() {
                            // 调整抽取人数
                            document.getElementById('drawCount').value = availableUsers.length;
                            // 重新开始抽取
                            startDraw();
                        });

                        // 添加清除标记后抽取按钮事件
                        document.getElementById('clearMarksForDrawBtn').addEventListener('click', function() {
                            clearDrawMarks();
                            startDraw();
                        });

                        // 恢复按钮状态
                        drawButton.disabled = false;
                        drawButton.innerHTML = '开始抽号';
                        return;
                    }
                }

                // 优化：根据抽取人数调整动画效果
                let animationDuration = drawCount > 50 ? 1500 : 3000; // 大量人数时缩短动画时间
                const maxRollingCount = drawCount > 20 ? 10 : 20; // 大量人数时减少滚动次数

                // 模拟抽号动画
                let counter = 0;
                const animationStartTime = Date.now();
                let randomNamesInterval = setInterval(() => {
                    // 随机选择用户显示
                    const randomUser = users[Math.floor(Math.random() * users.length)];
                    // 大量人数时简化显示内容
                    if (drawCount > 50) {
                        winnerElement.innerHTML = `<p class="fs-4">正在抽取 ${drawCount} 名幸运者...</p>`;
                    } else {
                        winnerElement.innerHTML = `<p class="fs-4">${randomUser.name}</p><p>${randomUser.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>`;
                    }

                    counter++;
                    const elapsedTime = Date.now() - animationStartTime;

                    // 使用时间和计数器双重判断，保证动画效果
                    if (counter > maxRollingCount || elapsedTime > animationDuration) {
                        clearInterval(randomNamesInterval);

                        // 如果不允许重复抽取，需要过滤掉已抽取的用户
                        let eligibleUsers = users;
                        if (!allowRepeat) {
                            eligibleUsers = users.filter(user => !drawnUsers.includes(user.id));
                        }

                        // 进行实际抽取
                        let winners = [];
                        const availableCount = eligibleUsers.length;
                        // 确保抽取数量不超过可用人数
                        const actualDrawCount = allowRepeat ? drawCount : Math.min(drawCount, availableCount);

                        // 随机抽取指定数量的用户
                        if (allowRepeat) {
                            // 允许重复抽取
                            for (let i = 0; i < actualDrawCount; i++) {
                                const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
                                winners.push(eligibleUsers[randomIndex]);
                            }
                        } else {
                            // 不允许重复抽取，使用洗牌算法
                            const shuffledUsers = [...eligibleUsers];
                            for (let i = shuffledUsers.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [shuffledUsers[i], shuffledUsers[j]] = [shuffledUsers[j], shuffledUsers[i]];
                            }
                            winners = shuffledUsers.slice(0, actualDrawCount);

                            // 标记这些用户为已抽取
                            winners.forEach(winner => {
                                markUserAsDrawn(projectCode, winner.id);
                            });
                        }

                        // 保存抽号历史
                        saveDrawHistory(projectCode, winners, actualDrawCount, allowRepeat, users.length);

                        // 显示结果 - 优化大量获奖者的展示方式
                        winnerElement.className = 'animate__animated animate__bounceIn';
                        displayWinners(winnerElement, winners, availableCount, allowRepeat, projectCode);

                        // 更新用户列表，显示标记
                        loadUserList(projectCode, true);

                        // 恢复抽号按钮状态
                        drawButton.disabled = false;
                        drawButton.innerHTML = '开始抽号';
                    }
                }, drawCount > 50 ? 50 : 100); // 大量人数时加快动画速度
            } else {
                winnerElement.className = 'animate__animated animate__shakeX';
                winnerElement.innerHTML = '<div class="alert alert-danger">没有参与者数据，请等待用户提交信息</div>';

                // 恢复按钮状态
                drawButton.disabled = false;
                drawButton.innerHTML = '开始抽号';

                // 显示错误通知
                showNotification('error', '抽号失败', '没有参与者数据');
            }
        })
        .catch(error => {
            console.error('抽号过程出错:', error);
            winnerElement.className = 'animate__animated animate__shakeX';
            winnerElement.innerHTML = '<div class="alert alert-danger">服务器错误，请稍后重试</div>';

            // 恢复按钮状态
            drawButton.disabled = false;
            drawButton.innerHTML = '开始抽号';

            // 显示错误通知
            showNotification('error', '系统错误', '抽号过程出错，请重试');
        });
}

// 新增：优化展示中奖者结果的函数
function displayWinners(container, winners, availableCount, allowRepeat, projectCode) {
    // 初始化HTML
    let winnersHTML = `
        <div class="alert alert-success">
            <h4 class="mb-3">抽取结果 (共 ${winners.length} 人)</h4>
    `;

    // 根据中奖人数采用不同的展示方式
    if (winners.length <= 10) {
        // 少量获奖者时展示完整信息
        winnersHTML += `<div class="winners-list">`;
        winners.forEach((winner) => {
            const maskedPhone = winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
            winnersHTML += `
                <div class="winner-item">
                    <div class="winner-info">
                        <h3 class="winner-name">${winner.name}</h3>
                        <p class="winner-phone">${maskedPhone}</p>
                    </div>
                </div>
            `;
        });
        winnersHTML += `</div>`;
    } else if (winners.length <= 50) {
        // 中等数量获奖者时使用紧凑列表
        winnersHTML += `<div class="table-responsive"><table class="table table-sm table-striped">
            <thead><tr><th>姓名</th><th>手机号</th></tr></thead>
            <tbody>`;

        winners.forEach((winner) => {
            const maskedPhone = winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
            winnersHTML += `<tr><td>${winner.name}</td><td>${maskedPhone}</td></tr>`;
        });

        winnersHTML += `</tbody></table></div>`;
    } else {
        // 大量获奖者时使用分页表格
        winnersHTML += `
            <p>由于获奖人数较多，已采用分页显示</p>
            <div class="winners-pagination mb-2">
                <nav aria-label="Page navigation">
                    <ul class="pagination pagination-sm" id="winners-page-nav"></ul>
                </nav>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead><tr><th>序号</th><th>姓名</th><th>手机号</th></tr></thead>
                    <tbody id="paged-winners-table"></tbody>
                </table>
            </div>
        `;
    }

    // 添加抽号统计信息
    if (!allowRepeat) {
        const remainingCount = availableCount - winners.length;
        winnersHTML += `<p class="mt-2">剩余未抽取: <strong>${remainingCount}</strong> 人</p>`;
    }

    // 添加操作按钮
    winnersHTML += `
            <div class="mt-3">
                <button class="btn btn-outline-primary btn-sm export-winners">导出结果</button>
                <button class="btn btn-outline-info btn-sm ms-2 view-history-btn">查看历史记录</button>
            </div>
        </div>
    `;

    // 设置HTML内容
    container.innerHTML = winnersHTML;

    // 如果是大量获奖者，设置分页功能
    if (winners.length > 50) {
        setupWinnersPagination(winners);
    }

    // 添加导出结果事件
    const exportBtn = container.querySelector('.export-winners');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showExportOptionsModal(winners);
        });
    }

    // 添加查看历史记录事件
    const historyBtn = container.querySelector('.view-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', function() {
            showDrawHistoryWithValidation(projectCode);
        });
    }

    // 显示成功通知
    showNotification('success', '抽号完成', `已成功抽取${winners.length}位幸运者`);
}

// 新增：为大量获奖者设置分页功能
function setupWinnersPagination(winners) {
    const pageSize = 30; // 每页显示30条记录
    const totalPages = Math.ceil(winners.length / pageSize);
    const paginationNav = document.getElementById('winners-page-nav');
    const tableBody = document.getElementById('paged-winners-table');

    // 生成分页导航
    let paginationHTML = '';

    if (totalPages <= 7) {
        // 页数较少时显示所有页码
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<li class="page-item ${i === 1 ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    } else {
        // 页数较多时使用省略形式
        paginationHTML += `
            <li class="page-item active"><a class="page-link" href="#" data-page="1">1</a></li>
            <li class="page-item"><a class="page-link" href="#" data-page="2">2</a></li>
            <li class="page-item"><a class="page-link" href="#" data-page="3">3</a></li>
            <li class="page-item disabled"><span class="page-link">...</span></li>
        `;

        for (let i = totalPages - 2; i <= totalPages; i++) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    paginationNav.innerHTML = paginationHTML;

    // 显示第一页数据
    displayWinnersPage(winners, 1, pageSize);

    // 添加分页点击事件
    paginationNav.addEventListener('click', function(e) {
        e.preventDefault();
        if (e.target.tagName === 'A' && e.target.hasAttribute('data-page')) {
            const page = parseInt(e.target.getAttribute('data-page'));
            // 更新激活状态
            paginationNav.querySelectorAll('.page-item').forEach(item => item.classList.remove('active'));
            e.target.closest('.page-item').classList.add('active');
            // 显示对应页数据
            displayWinnersPage(winners, page, pageSize);
        }
    });
}

// 新增：显示特定页的获奖者数据
function displayWinnersPage(winners, page, pageSize) {
    const tableBody = document.getElementById('paged-winners-table');
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, winners.length);

    // 使用DocumentFragment提高性能
    const fragment = document.createDocumentFragment();

    // 清空当前表格内容
    tableBody.innerHTML = '';

    // 添加当前页的数据
    for (let i = startIndex; i < endIndex; i++) {
        const winner = winners[i];
        const maskedPhone = winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${winner.name}</td>
            <td>${maskedPhone}</td>
        `;

        fragment.appendChild(row);
    }

    tableBody.appendChild(fragment);
}
// 保存抽号历史
function saveDrawHistory(projectCode, winners, drawCount, allowRepeat, totalParticipants) {
    if (!projectCode || !winners || !Array.isArray(winners)) {
        console.error('保存抽号历史: 无效参数');
        return;
    }

    const data = {
        projectCode: projectCode,
        winners: winners,
        params: {
            count: drawCount,
            allowRepeat: allowRepeat,
            total_participants: totalParticipants,
            description: '' // 可以添加描述字段
        }
    };

    apiRequest('./api/save_draw_history.php', 'POST', data)
        .then(result => {
            if (!result.success) {
                console.warn('保存抽号历史警告:', result.message);
            }
        })
        .catch(error => {
            console.error('保存抽号历史出错:', error);
        });
}

// 重置抽号结果
function resetDraw() {
    const resultDisplay = document.getElementById('result-display');
    const winnerElement = document.getElementById('winner');

    // 隐藏结果区域
    resultDisplay.classList.add('d-none');
    winnerElement.innerHTML = '';

    // 刷新用户列表
    loadUserList(getCurrentProjectCode());

    // 显示通知
    showNotification('info', '已重置', '抽号结果已清除');
}


function confirmClearUsers() {
    const projectCode = getCurrentProjectCode();

    if (!projectCode) {
        showNotification('error', '错误', '无法确定当前项目');
        return;
    }

    // 创建模态确认框
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'modal fade';
    confirmDialog.id = 'confirmClearModal';
    confirmDialog.setAttribute('tabindex', '-1');
    confirmDialog.setAttribute('aria-hidden', 'true');

    confirmDialog.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">确认清除</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>您确定要清空当前项目的所有用户数据吗？</p>
                    <p class="text-danger"><strong>警告：</strong>此操作无法撤销！所有参与者信息将被永久删除。</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-danger" id="confirmClearBtn">确认清除</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(confirmDialog);

    // 实例化Bootstrap模态框
    const modal = new bootstrap.Modal(document.getElementById('confirmClearModal'));
    modal.show();

    // 添加确认按钮事件 - 确保移除旧的事件处理程序
    const confirmBtn = document.getElementById('confirmClearBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', function() {
        modal.hide();
        clearUserList(projectCode);
    });

    // 模态框关闭时移除元素
    document.getElementById('confirmClearModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(confirmDialog);
    });
}

// 清除用户列表
function clearUserList(projectCode) {
    if (!projectCode) {
        showNotification('error', '错误', '无法确定当前项目');
        return;
    }

    const clearButton = document.getElementById('clearButton');

    // 禁用按钮，防止重复点击
    clearButton.disabled = true;
    clearButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';

    console.log('清除用户列表, 项目代码:', projectCode); // 调试信息

    apiRequest('./api/clear_users.php', 'POST', { projectCode: projectCode })
        .then(data => {
            console.log('清除用户响应:', data); // 调试信息

            if (data.success) {
                // 显示成功消息
                showNotification('success', '操作成功', '所有用户数据已清除');

                // 重新加载用户列表
                loadUserList(projectCode);

                // 重置抽号结果
                resetDraw();
            } else {
                showNotification('error', '操作失败', data.message || '未知错误');
            }
        })
        .catch(error => {
            console.error('清除列表错误:', error);
            showNotification('error', '系统错误', '操作失败，请重试');
        })
        .finally(() => {
            // 恢复按钮状态
            clearButton.disabled = false;
            clearButton.innerHTML = '清除列表';
        });
}

// 确认清空历史记录
function confirmClearHistory() {
    const projectCode = getCurrentProjectCode();
    if (!projectCode) return;

    // Check if the modal element exists
    const clearHistoryModal = document.getElementById('clearHistoryModal');
    if (!clearHistoryModal) {
        console.error('Modal element #clearHistoryModal not found in the document');
        showNotification('error', '系统错误', '无法显示确认对话框');
        return;
    }

    try {
        // Create the modal instance safely
        const modal = new bootstrap.Modal(clearHistoryModal);
        modal.show();
    } catch (error) {
        console.error('Error showing modal:', error);
        showNotification('error', '系统错误', '无法显示确认对话框');
    }
}

// 清空所有历史记录
function clearAllHistory(projectCode) {
    if (!projectCode) return;

    // 禁用按钮，防止重复点击
    const clearBtn = document.getElementById('confirmClearHistoryBtn');
    clearBtn.disabled = true;
    clearBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 清空中...';

    apiRequest('./api/clear_history.php', 'POST', { projectCode: projectCode })
        .then(data => {
            if (data.success) {
                showNotification('success', '历史记录已清空');
                loadDrawHistory(projectCode);

                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('clearHistoryModal'));
                modal.hide();
            } else {
                showNotification('error', '操作失败', data.message);
            }
        })
        .catch(error => {
            console.error('清空历史记录错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        })
        .finally(() => {
            // 恢复按钮状态
            clearBtn.disabled = false;
            clearBtn.textContent = '确认清空';
        });
}

// 加载抽号历史
function loadDrawHistory(projectCode) {
    if (!projectCode) {
        showNotification('error', '无效的项目代码', '请确保有效的项目');
        return;
    }

    // 添加加载指示器
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> 加载中...</td></tr>';

    apiRequest(`./api/get_draw_history.php?project=${projectCode}`)
        .then(data => {
            if (data.success) {
                displayDrawHistory(data.data || []);
                showNotification('success', '历史记录已加载', `共 ${data.data ? data.data.length : 0} 条记录`);
            } else {
                console.error('加载抽号历史失败:', data.message);
                showNotification('error', '加载失败', data.message);
                historyList.innerHTML = `<tr><td colspan="5" class="text-center">加载历史记录失败: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', `无法加载历史记录: ${error.message}`);
            historyList.innerHTML = '<tr><td colspan="5" class="text-center">网络错误，请稍后再试</td></tr>';
        });
}

// 显示抽号历史
function displayDrawHistory(history) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (history.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">暂无抽取记录</td>';
        historyList.appendChild(row);
        return;
    }

    history.forEach((record) => {
        const row = document.createElement('tr');

        // 创建抽号历史行
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.timestamp}</td>
            <td>${record.winners.length}</td>
            <td>${record.params.description || '无描述'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary view-history" data-id="${record.id}">查看</button>
                    <button class="btn btn-sm btn-outline-danger delete-history" data-id="${record.id}">删除</button>
                </div>
            </td>
        `;

        historyList.appendChild(row);

        // 添加查看详情事件
        row.querySelector('.view-history').addEventListener('click', function() {
            showHistoryDetail(record);
        });

        // 添加删除历史记录事件
        row.querySelector('.delete-history').addEventListener('click', function() {
            confirmDeleteHistory(record.id);
        });
    });
}

// 确认删除历史记录
function confirmDeleteHistory(historyId) {
    const confirmHTML = `
        <div class="modal fade" id="deleteHistoryModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">确认删除</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>您确定要删除这条抽号记录吗？</p>
                        <p class="text-danger">此操作无法撤销！</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteHistoryBtn">确认删除</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = confirmHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('deleteHistoryModal'));
    modal.show();

    // 确认删除按钮事件
    document.getElementById('confirmDeleteHistoryBtn').addEventListener('click', function() {
        deleteHistory(historyId);
        modal.hide();
        setTimeout(() => {
            document.body.removeChild(modalContainer);
        }, 500);
    });

    // 模态框关闭时移除元素
    document.getElementById('deleteHistoryModal').addEventListener('hidden.bs.modal', function() {
        setTimeout(() => {
            document.body.removeChild(modalContainer);
        }, 500);
    });
}

// 删除历史记录
function deleteHistory(historyId) {
    const projectCode = getCurrentProjectCode();
    if (!projectCode) return;

    apiRequest('./api/delete_history.php', 'POST', {
        projectCode: projectCode,
        historyId: historyId
    })
        .then(data => {
            if (data.success) {
                showNotification('success', '历史记录已删除');
                loadDrawHistory(projectCode);
            } else {
                showNotification('error', '删除失败', data.message);
            }
        })
        .catch(error => {
            console.error('删除历史记录错误:', error);
            showNotification('error', '网络错误', '无法连接到服务器');
        });
}

// 显示抽号历史详情
function showHistoryDetail(record) {
    // 创建模态框
    const modalHTML = `
        <div class="modal fade" id="historyDetailModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">抽取记录详情 #${record.id}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="history-info mb-4">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>抽取时间:</strong> ${record.timestamp}</p>
                                    <p><strong>人数:</strong> ${record.winners.length}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>参与人数:</strong> ${record.params.total_participants || '未知'}</p>
                                    <p><strong>允许重复:</strong> ${record.params.allowRepeat ? '是' : '否'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <h6>名单</h6>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>姓名</th>
                                        <th>手机号</th>
                                        <th>提交时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${record.winners.map(winner => `
                                        <tr>
                                            <td>${winner.name}</td>
                                            <td>${winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</td>
                                            <td>${winner.date || '未知'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        <button type="button" class="btn btn-primary" id="exportHistoryBtn">导出结果</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('historyDetailModal'));
    modal.show();

    // 导出按钮事件
    document.getElementById('exportHistoryBtn').addEventListener('click', function() {
        showExportOptionsModal(record.winners);
    });

    // 模态框关闭时移除元素
    document.getElementById('historyDetailModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}

// 导出中奖者名单
/**
 * 导出获奖者列表到各种格式
 * @param {Array} winners - 获奖者数组
 * @param {Object} options - 配置选项
 * @param {string} options.format - 导出格式 ('csv', 'excel', 'json')
 * @param {string} options.filename - 自定义文件名（不含扩展名）
 * @param {Array} options.columns - 自定义列配置 [{key:'name', title:'姓名'}, ...]
 * @param {string} options.dateFormat - 日期格式化模式
 * @returns {Promise<boolean>} - 导出是否成功
 */
function exportWinnersList(winners, options = {}) {
    try {
        // 默认选项
        const defaultOptions = {
            format: 'csv',
            filename: `抽奖结果_${new Date().toISOString().replace(/[:.]/g, '_')}`,
            columns: [
                { key: 'name', title: '姓名' },
                { key: 'phone', title: '手机号' },
                { key: 'date', title: '提交时间' }
            ],
            dateFormat: 'YYYY-MM-DD HH:mm:ss'
        };

        // 合并选项
        const opts = { ...defaultOptions, ...options };

        // 格式化日期
        const formatDate = (dateString) => {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                // 简单日期格式化，实际使用可考虑引入日期库如dayjs
                return dateString; // 这里可以根据opts.dateFormat进行自定义格式化
            } catch (e) {
                return dateString;
            }
        };

        // 根据不同格式处理数据
        let content, type, extension;

        switch (opts.format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(winners, null, 2);
                type = 'application/json;charset=utf-8';
                extension = 'json';
                break;

            case 'excel':
                // 这里使用CSV格式，但设置为Excel打开
                // 为Excel添加BOM标记，解决中文乱码问题
                const BOM = '\uFEFF';
                let csvContent = BOM + opts.columns.map(col => col.title).join(',') + '\n';

                winners.forEach(winner => {
                    const row = opts.columns.map(col => {
                        let value = winner[col.key] || '';
                        // 日期特殊处理
                        if (col.key === 'date') {
                            value = formatDate(value);
                        }
                        // 处理包含逗号、引号或换行符的情况
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            value = '"' + value.replace(/"/g, '""') + '"';
                        }
                        return value;
                    }).join(',');
                    csvContent += row + '\n';
                });

                content = csvContent;
                type = 'application/vnd.ms-excel;charset=utf-8';
                extension = 'xls';
                break;

            case 'csv':
            default:
                // 添加BOM标记，解决中文乱码问题
                const BOM_CSV = '\uFEFF';
                let csvData = BOM_CSV + opts.columns.map(col => col.title).join(',') + '\n';

                winners.forEach(winner => {
                    const row = opts.columns.map(col => {
                        let value = winner[col.key] || '';
                        // 日期特殊处理
                        if (col.key === 'date') {
                            value = formatDate(value);
                        }
                        // 处理包含逗号、引号或换行符的情况
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            value = '"' + value.replace(/"/g, '""') + '"';
                        }
                        return value;
                    }).join(',');
                    csvData += row + '\n';
                });

                content = csvData;
                type = 'text/csv;charset=utf-8';
                extension = 'csv';
                break;
        }

        // 使用Blob对象
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${opts.filename}.${extension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);

        // 触发下载
        link.click();

        // 移除链接并释放URL
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        return Promise.resolve(true);
    } catch (error) {
        console.error("导出失败:", error);
        return Promise.reject(error);
    }
}

/**
 * 显示导出选项模态框
 * @param {Array} winners - 获奖者数组
 */
function showExportOptionsModal(winners) {
    // 创建模态框HTML
    const modalHTML = `
        <div class="modal fade" id="exportOptionsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">导出选项</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="exportOptionsForm">
                            <div class="mb-3">
                                <label class="form-label">导出格式</label>
                                <div class="form-check">
                                    <input class="form-check-input" style="width: 22px;height: 22px" type="radio" name="exportFormat" id="formatCsv" value="csv" checked>
                                    <label class="form-check-label" for="formatCsv">
                                        CSV格式 (.csv)
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" style="width: 22px;height: 22px" type="radio" name="exportFormat" id="formatExcel" value="excel">
                                    <label class="form-check-label" for="formatExcel">
                                        Excel格式 (.xls)
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" style="width: 22px;height: 22px" type="radio" name="exportFormat" id="formatJson" value="json">
                                    <label class="form-check-label" for="formatJson">
                                        JSON格式 (.json)
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="exportFilename" class="form-label">文件名</label>
                                <input type="text" class="form-control" id="exportFilename" placeholder="抽奖结果">
                                <div class="form-text">留空则使用默认文件名</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmExportBtn">导出</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('exportOptionsModal'));
    modal.show();

    // 确认导出按钮事件
    document.getElementById('confirmExportBtn').addEventListener('click', function() {
        // 获取选择的格式
        const format = document.querySelector('input[name="exportFormat"]:checked').value;

        // 获取自定义文件名
        const filename = document.getElementById('exportFilename').value.trim() ||
            `抽奖结果_${new Date().toISOString().replace(/[:.]/g, '_')}`;

        // 调用导出函数
        exportWinnersList(winners, {
            format: format,
            filename: filename
        }).catch(err => {
            console.error("导出失败:", err);
            alert("导出失败，请稍后再试");
        });

        // 关闭模态框
        modal.hide();
    });

    // 模态框关闭时移除元素
    document.getElementById('exportOptionsModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}


// 显示抽号历史页面
function showDrawHistory(projectCode) {
    // 验证项目代码
    if (!projectCode) {
        showNotification('error', '错误', '缺少有效的项目代码');
        return;
    }

    // 先验证项目是否有效
    apiRequest(`./api/get_projects.php`)
        .then(data => {
            if (data.success) {
                // 查找当前项目
                const project = data.data.find(p => p.code === projectCode);

                if (project) {
                    // 隐藏其他容器
                    document.getElementById('project-container').classList.add('d-none');
                    document.getElementById('project-selector').classList.add('d-none');

                    // 显示历史容器
                    const historyContainer = document.getElementById('history-container');
                    if (historyContainer) {
                        historyContainer.classList.remove('d-none');
                        // 加载历史数据
                        loadDrawHistory(projectCode);
                    } else {
                        showNotification('error', '系统错误', '历史记录容器不存在');
                    }
                } else {
                    showNotification('error', '项目不存在', '请选择有效的项目');
                }
            } else {
                showNotification('error', '加载项目失败', data.message || '未知错误');
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            showNotification('error', '网络错误', error.message);
        });
}

// 验证项目函数
function isValidProject(projectCode) {
    return new Promise((resolve, reject) => {
        if (!projectCode) {
            resolve(false);
            return;
        }

        apiRequest(`./api/get_projects.php`)
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    const project = data.data.find(p => p.code === projectCode);
                    resolve(!!project);
                } else {
                    resolve(false);
                }
            })
            .catch(error => {
                console.error('验证项目出错:', error);
                reject(error);
            });
    });
}

// 使用isValidProject函数来增强showDrawHistory
function showDrawHistoryWithValidation(projectCode) {
    if (!projectCode) {
        showNotification('error', '错误', '缺少有效的项目代码');
        return;
    }

    isValidProject(projectCode)
        .then(isValid => {
            if (isValid) {
                // 隐藏其他容器
                document.getElementById('project-container').classList.add('d-none');
                document.getElementById('project-selector').classList.add('d-none');

                // 显示历史容器
                const historyContainer = document.getElementById('history-container');
                if (historyContainer) {
                    historyContainer.classList.remove('d-none');
                    // 加载历史数据
                    loadDrawHistory(projectCode);
                } else {
                    showNotification('error', '系统错误', '历史记录容器不存在');
                }
            } else {
                showNotification('error', '项目不存在或无效', '请返回选择有效的项目');
            }
        })
        .catch(error => {
            showNotification('error', '验证项目失败', error.message);
        });
}

// 返回项目详情
function backToProject() {
    document.getElementById('history-container').classList.add('d-none');
    document.getElementById('project-container').classList.remove('d-none');

    // 刷新用户列表
    loadUserList(getCurrentProjectCode());
}

// 显示通知消息
function showNotification(type, title, message = '') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let titleIcon = '';
    switch(type) {
        case 'success':
            titleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            break;
        case 'error':
            titleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f72585" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            break;
        default:
            titleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4895ef" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    notification.innerHTML = `
        <div class="notification-title">${titleIcon} ${title}</div>
        ${message ? `<div class="notification-message">${message}</div>` : ''}
    `;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // 3秒后自动关闭
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 400);
    }, 3000);
}

// 增加一个通用的API请求处理函数
function apiRequest(url, method = 'GET', data = null) {
    // Make sure URLs are relative to work in both HTTP/HTTPS
    if (url.startsWith('https://')) {
        url = url.replace('https://', '/');
    }

    const options = {
        method: method,
        headers: {},
        // Important for HTTP environments
        credentials: 'same-origin'
    };

    if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.text().then(text => {
                // Handle empty responses
                if (!text || text.trim() === '') {
                    console.warn('Empty response received from server');
                    return { success: false, message: '服务器返回空响应' };
                }

                try {
                    return JSON.parse(text);
                } catch (e) {
                    // Log the raw text for debugging
                    console.error('JSON解析错误:', e);
                    console.error('原始响应内容:', text);

                    // For HTTP issues with non-JSON responses (could be HTML error pages)
                    if (text.includes('<!DOCTYPE html>')) {
                        console.warn('Received HTML instead of JSON - possibly a server error page');
                    }

                    return {
                        success: false,
                        message: '服务器返回了非JSON格式的数据'
                    };
                }
            });
        })
        .catch(error => {
            console.error(`请求失败 (${url}):`, error);
            // Return a structured error object instead of throwing
            return {
                success: false,
                message: '网络错误: ' + error.message
            };
        });
}