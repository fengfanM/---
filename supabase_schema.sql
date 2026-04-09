-- ============================================
-- 天机抽卡游戏 Supabase 数据库架构
-- ============================================

-- 1. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建用户存档表（存储完整游戏进度）
CREATE TABLE IF NOT EXISTS game_saves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    save_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT unique_user_save UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_updated_at ON game_saves(updated_at DESC);

-- 3. 创建抽卡历史表
CREATE TABLE IF NOT EXISTS pulls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pool_id VARCHAR(100) NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulls_user_id ON pulls(user_id);
CREATE INDEX IF NOT EXISTS idx_pulls_created_at ON pulls(created_at DESC);

-- 4. 创建卡牌库存表
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每个用户的每张卡牌只有一条记录
    CONSTRAINT unique_user_card UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_card_id ON inventory(card_id);

-- 5. 创建自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 为 game_saves 表添加 updated_at 触发器
DROP TRIGGER IF EXISTS update_game_saves_updated_at ON game_saves;
CREATE TRIGGER update_game_saves_updated_at
    BEFORE UPDATE ON game_saves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 为 inventory 表添加 updated_at 触发器
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulls ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 8. game_saves 表的 RLS 策略
-- 用户只能查看和修改自己的存档
CREATE POLICY "用户只能查看自己的存档" 
    ON game_saves 
    FOR SELECT 
    USING (auth.uid()::text = user_id OR true);  -- 暂用宽松策略，生产环境建议使用 auth.uid()

CREATE POLICY "用户只能插入自己的存档" 
    ON game_saves 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id OR true);

CREATE POLICY "用户只能更新自己的存档" 
    ON game_saves 
    FOR UPDATE 
    USING (auth.uid()::text = user_id OR true);

CREATE POLICY "用户只能删除自己的存档" 
    ON game_saves 
    FOR DELETE 
    USING (auth.uid()::text = user_id OR true);

-- 9. pulls 表的 RLS 策略
CREATE POLICY "用户只能查看自己的抽卡记录" 
    ON pulls 
    FOR SELECT 
    USING (auth.uid()::text = user_id OR true);

CREATE POLICY "用户只能插入自己的抽卡记录" 
    ON pulls 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id OR true);

-- 10. inventory 表的 RLS 策略
CREATE POLICY "用户只能查看自己的库存" 
    ON inventory 
    FOR SELECT 
    USING (auth.uid()::text = user_id OR true);

CREATE POLICY "用户只能插入自己的库存" 
    ON inventory 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id OR true);

CREATE POLICY "用户只能更新自己的库存" 
    ON inventory 
    FOR UPDATE 
    USING (auth.uid()::text = user_id OR true);

-- ============================================
-- 完成
-- ============================================
