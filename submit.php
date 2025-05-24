<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>抽号器 - 信息提交</title>
    <link href="https://www.unpkg.com/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://www.unpkg.com/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="css/submit.css" rel="stylesheet">
</head>
<body>
<div class="container">
    <div class="form-container">
        <h1 class="text-center mb-4">参与抽号</h1>

        <!-- 项目信息 -->
        <div id="project-info" class="alert alert-primary mb-4 d-none">
            <h5 class="mb-2"><i class="bi bi-award"></i> 活动项目:</h5>
            <h4 id="project-name" class="mb-0">项目名称</h4>
        </div>

        <div id="message" class="alert d-none"></div>

        <form id="userForm">
            <div class="mb-3">
                <label for="name" class="form-label">姓名</label>
                <input type="text" class="form-control" id="name" name="name" required>
            </div>
            <div class="mb-3">
                <label for="phone" class="form-label">手机号码</label>
                <input type="tel" class="form-control" id="phone" name="phone" pattern="[0-9]{11}" required>
                <div class="form-text">请输入11位手机号码</div>
            </div>
            <div class="mb-3">
                <label for="remark" class="form-label">备注 (可选)</label>
                <textarea class="form-control" id="remark" name="remark" rows="2"></textarea>
            </div>
            <button type="submit" class="btn btn-primary w-100 btn-lg">提交信息</button>
        </form>
    </div>
</div>

<script src="https://www.unpkg.com/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
<script src="js/submit.js"></script>
</body>
<footer class="text-center py-4 mt-4">
    <p class="text-muted">design by whx</p>
</footer>
</html>