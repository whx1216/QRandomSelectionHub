document.addEventListener('DOMContentLoaded', function() {
    const userForm = document.getElementById('userForm');
    const messageArea = document.getElementById('message');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const remarkInput = document.getElementById('remark');

    // 获取URL参数中的项目代码
    const urlParams = new URLSearchParams(window.location.search);
    const projectCode = urlParams.get('project');

    // 验证项目代码
    if (!projectCode) {
        showMessage('danger', '无效的链接 - 缺少项目代码');
        disableForm();
        return;
    }

    // 检查项目是否存在
    checkProject(projectCode);

    // 表单提交处理
    userForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 验证表单
        if (!validateForm()) {
            return;
        }

        // 禁用提交按钮
        const submitButton = userForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';

        // 收集表单数据
        const formData = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            remark: remarkInput.value.trim(),
            projectCode: projectCode  // 确保包含项目代码
        };

        // 发送数据到API
        fetch('./api/add_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 显示成功消息，并告知用户可以关闭页面
                    showMessage('success', '信息提交成功！您已成功加入抽号名单。您可以关闭此页面了。');

                    // 清空表单
                    userForm.reset();

                    // 隐藏表单，只显示成功消息
                    userForm.style.display = 'none';

                    // 添加一个关闭说明
                    const closeInfo = document.createElement('div');
                    closeInfo.className = 'alert alert-info mt-3';
                    closeInfo.innerHTML = '<i class="bi bi-info-circle"></i> 您的信息已成功提交，您可以安全地关闭此页面。';
                    messageArea.parentNode.appendChild(closeInfo);
                } else {
                    // 显示错误消息
                    showMessage('danger', `提交失败: ${data.message}`);

                    // 恢复提交按钮
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            })
            .catch(error => {
                console.error('提交错误:', error);
                showMessage('danger', '系统错误，请稍后重试');

                // 恢复提交按钮
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
    });

    // 检查项目是否存在
    function checkProject(code) {
        fetch(`./api/get_projects.php`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const project = data.data.find(p => p.code === code);
                    if (project) {
                        document.getElementById('project-name').textContent = project.name;
                        document.getElementById('project-info').classList.remove('d-none');
                    } else {
                        showMessage('danger', '无效的项目代码，此活动可能已结束');
                        disableForm();
                    }
                } else {
                    showMessage('danger', '无法验证项目信息，请稍后再试');
                }
            })
            .catch(error => {
                console.error('请求错误:', error);
                showMessage('danger', '网络错误，请检查您的连接');
            });
    }

    // 禁用表单
    function disableForm() {
        const formInputs = userForm.querySelectorAll('input, textarea, button');
        formInputs.forEach(input => {
            input.disabled = true;
        });
        userForm.classList.add('form-disabled');
    }

    // 表单验证
    function validateForm() {
        let isValid = true;

        // 验证姓名 (不为空)
        if (nameInput.value.trim() === '') {
            isValid = false;
            nameInput.classList.add('is-invalid');
            showMessage('danger', '请输入您的姓名');
        } else {
            nameInput.classList.remove('is-invalid');
        }

        // 验证手机号 (中国大陆手机号格式)
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phoneInput.value.trim())) {
            isValid = false;
            phoneInput.classList.add('is-invalid');
            showMessage('danger', '请输入有效的手机号码');
        } else {
            phoneInput.classList.remove('is-invalid');
        }

        return isValid;
    }

    // 显示消息
    function showMessage(type, message) {
        messageArea.className = `alert alert-${type}`;
        messageArea.textContent = message;
        messageArea.classList.remove('d-none');

        // 滚动到顶部使消息可见
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // 实时表单验证
    nameInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            this.classList.remove('is-invalid');
        }
    });

    phoneInput.addEventListener('input', function() {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (phoneRegex.test(this.value.trim())) {
            this.classList.remove('is-invalid');
        }
    });
});