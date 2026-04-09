# 部署指南

本指南帮助你将游戏部署到线上，让朋友通过链接就能玩。

## 最简单的部署方式：Vercel

Vercel 是免费且极其简单的部署平台，支持自动部署。

### 前置准备
1. 将项目推送到 GitHub/GitLab/Bitbucket
2. 访问 [vercel.com](https://vercel.com) 注册账号

### 步骤

1. **登录 Vercel 后点击 "Add New Project"**
2. **导入你的 GitHub 仓库**
3. **配置项目（保持默认即可）**
4. **点击 Deploy**

等待1-2分钟，你的游戏就上线了！

## 其他部署方式

### Netlify
同样简单免费，访问 [netlify.com](https://netlify.com)

### GitHub Pages
1. 构建项目：`npm run build`
2. 将 dist 文件夹推送到 gh-pages 分支

### 本地构建测试
```bash
npm run build
npm run preview
```

## 分享链接
部署成功后，将生成的链接发给朋友，他们在微信/浏览器中直接打开就能玩！
