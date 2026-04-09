# 天机抽卡 · 网页版算命抽卡游戏

纯前端（React + Vite + TypeScript + Zustand），进度保存在浏览器 LocalStorage。

## 玩法

- **单抽 / 十连**：稀有度 N/R/SR/SSR，含 SR（10 抽）与 SSR（60 抽）保底。
- **今日运势**：按日生成签文与幸运元素。
- **三牌阵**：过去 / 现在 / 未来三张牌与组合解读。
- **命运轮盘**：每日一次，可影响抽卡权重或任务奖励等。
- **任务与成就**：每日任务领灵石；里程碑成就。

## 本地运行

```bash
cd web-fortune-game
npm install
npm run dev
```

浏览器打开终端提示的本地地址即可。

## Supabase（可选：用于跨设备历史/背包）

### 1) 配置环境变量

在 `web-fortune-game/` 下新建 `.env.local`：

```bash
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="xxxx"
```

### 2) 建表（SQL）

在 Supabase 控制台 SQL editor 执行：

```sql
create table if not exists pulls (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pool_id text not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists inventory (
  user_id text not null,
  card_id text not null,
  count int not null default 0,
  primary key (user_id, card_id)
);
```

（首期我们只做写 `pulls`；`inventory` 可以先手动维护，或后续用触发器/函数从 `pulls` 聚合生成。）

## 构建

```bash
npm run build
npm run preview
```

## 说明

内容为娱乐向随机与规则生成，不构成任何现实决策建议。
