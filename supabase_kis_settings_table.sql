-- KIS 설정을 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS kis_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  kis_app_key TEXT,
  kis_app_secret TEXT,
  kis_cano TEXT,
  kis_acnt_prdt_cd TEXT DEFAULT '01',
  kis_base_url TEXT DEFAULT 'https://openapi.koreainvestment.com:9443',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE kis_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view own KIS settings" ON kis_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KIS settings" ON kis_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KIS settings" ON kis_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own KIS settings" ON kis_settings
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kis_settings_user_id ON kis_settings(user_id);