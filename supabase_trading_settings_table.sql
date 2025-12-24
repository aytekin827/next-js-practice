-- 트레이딩 설정 테이블 생성
CREATE TABLE IF NOT EXISTS trading_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 손절/익절 기본 설정
  default_stop_loss_percent DECIMAL(5,2) DEFAULT 3.0,
  default_profit_percent DECIMAL(5,2) DEFAULT 1.0,

  -- 일괄매수 설정
  max_amount_per_stock INTEGER DEFAULT 50000,

  -- 시초가 갭 필터링 설정
  gap_filter_min_percent DECIMAL(5,2) DEFAULT 3.0,
  gap_filter_max_percent DECIMAL(5,2) DEFAULT 7.0,

  -- 조회 조건 기본값
  default_stock_count INTEGER DEFAULT 20,
  default_min_volume INTEGER DEFAULT 50000,

  -- 기타 설정
  default_market VARCHAR(10) DEFAULT 'KOSPI',

  -- 퀀텀종목추천 관련 설정
  quantum_default_profit_percent DECIMAL(5,2) DEFAULT 1.0,
  quantum_default_stop_loss_percent DECIMAL(5,2) DEFAULT 3.0,
  quantum_max_amount_per_stock INTEGER DEFAULT 50000,

  -- 손절가 활성화 설정
  default_stop_loss_enabled BOOLEAN DEFAULT true,
  quantum_default_stop_loss_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자별 유니크 제약 조건
ALTER TABLE trading_settings ADD CONSTRAINT unique_user_settings UNIQUE (user_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE trading_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view own trading settings" ON trading_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading settings" ON trading_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading settings" ON trading_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading settings" ON trading_settings
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_trading_settings_user_id ON trading_settings(user_id);