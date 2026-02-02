-- NetFusion SEO Dashboard - Supabase Database Schema
-- 請在 Supabase SQL Editor 中執行以下指令以建立表格

-- 1. 建立站點資料表
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_url TEXT UNIQUE NOT NULL,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立 SEO 歷史數據表
CREATE TABLE IF NOT EXISTS seo_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_url TEXT NOT NULL REFERENCES sites(site_url),
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DOUBLE PRECISION DEFAULT 0,
  position DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_url, date)
);

-- 3. 建立熱門關鍵字表
CREATE TABLE IF NOT EXISTS top_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_url TEXT NOT NULL REFERENCES sites(site_url),
  keyword TEXT NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  position DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 啟用 Row Level Security (RLS)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_keywords ENABLE ROW LEVEL SECURITY;

-- 警告：這裡需要根據你的 Auth 邏輯設定 Policy
-- 暫時允許所有人讀寫 (僅供測試，生產環境請限制為 auth.uid())
CREATE POLICY "Allow all for testing" ON sites FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON seo_stats FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON top_keywords FOR ALL USING (true);
