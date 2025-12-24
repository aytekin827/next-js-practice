-- KIS 액세스 토큰을 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS kis_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE kis_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 토큰만 조회/수정 가능
CREATE POLICY "Users can view own KIS tokens" ON kis_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KIS tokens" ON kis_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KIS tokens" ON kis_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own KIS tokens" ON kis_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kis_tokens_user_id ON kis_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_kis_tokens_expires_at ON kis_tokens(expires_at);

-- 만료된 토큰 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_kis_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM kis_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 매일 자정에 만료된 토큰 삭제하는 크론 작업 (선택사항)
-- SELECT cron.schedule('cleanup-expired-kis-tokens', '0 0 * * *', 'SELECT cleanup_expired_kis_tokens();');