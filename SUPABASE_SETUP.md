# Supabase 云存档配置指南

## 前置条件

1. 注册 [Supabase](https://supabase.com) 账号
2. 创建一个新项目

## 步骤 1：获取项目密钥

1. 在 Supabase 项目中，进入 **Settings → API**
2. 复制以下信息：
   - **Project URL** (如：`https://xxxxxx.supabase.co`)
   - **anon/public key** (以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 开头的长字符串)

## 步骤 2：配置环境变量

1. 在项目根目录创建 `.env.local` 文件（如果不存在）
2. 添加以下内容：

```env
VITE_SUPABASE_URL=你的Project_URL
VITE_SUPABASE_ANON_KEY=你的anon_key
```

3. 保存文件

## 步骤 3：创建数据库表

1. 在 Supabase 项目中，进入 **SQL Editor**
2. 点击 **New query**
3. 复制项目中的 `supabase_schema.sql` 文件内容
4. 粘贴到 SQL Editor 中
5. 点击 **Run** 执行

## 步骤 4：验证配置

1. 启动开发服务器：`npm run dev`
2. 进入游戏的 **设置** 页面
3. 找到 **云存档** 部分
4. 开启云存档功能
5. 点击 **保存到云端**，如果成功保存说明配置正确

## 注意事项

- `.env.local` 文件不要提交到 Git 仓库（已在 `.gitignore` 中排除）
- 如果更换设备或浏览器，只需使用相同的 Supabase 配置即可同步存档
- 云存档功能完全可选，即使不配置也不影响游戏使用
