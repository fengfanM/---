# Vercel 部署详细步骤

## 前置准备
1. 一个 GitHub 账号
2. 项目代码已推送到 GitHub 仓库

## 步骤 1：创建 GitHub 仓库

### 如果你还没有 GitHub 仓库：
1. 访问 [github.com](https://github.com)
2. 点击 "New repository"
3. 填写仓库名称（如 `web-fortune-game`）
4. 选择 "Public" 或 "Private"
5. 点击 "Create repository"

### 推送代码到仓库：
```bash
# 初始化 git
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库链接）
git remote add origin https://github.com/your-username/web-fortune-game.git

# 推送代码
git push -u origin main
```

## 步骤 2：部署到 Vercel

1. **访问 Vercel**：https://vercel.com
2. **登录**：使用 GitHub 账号登录
3. **导入项目**：
   - 点击 "Add New Project"
   - 选择 "Import Git Repository"
   - 搜索并选择你的 `web-fortune-game` 仓库
4. **配置项目**：
   - **Framework Preset**：选择 "Vite"
   - **Build Command**：保持默认 `npm run build`
   - **Output Directory**：保持默认 `dist`
   - 点击 "Deploy"

## 步骤 3：等待部署完成

- Vercel 会自动安装依赖、构建项目
- 部署过程大约需要 1-2 分钟
- 部署完成后，Vercel 会显示 "Deployment Complete"

## 步骤 4：获取访问链接

- 部署完成后，点击 "Visit" 按钮
- 复制浏览器地址栏的链接（如 `https://web-fortune-game.vercel.app`）

## 步骤 5：分享给朋友

- 将链接发送到微信聊天
- 朋友点击链接，在微信内直接打开就能玩！

## 常见问题

### 部署失败怎么办？
- 检查 package.json 中的构建脚本
- 确保所有依赖都已正确安装
- 查看 Vercel 部署日志，找出错误原因

### 链接在微信中无法打开？
- 微信可能会拦截新域名，建议先在浏览器中打开
- 或者使用已备案的域名

### 如何更新部署？
- 推送代码到 GitHub 仓库
- Vercel 会自动检测并重新部署
