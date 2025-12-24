-- stock_rankings 테이블에 file_hash 컬럼 추가
-- 중복 업로드 방지를 위한 파일 해시값 저장

ALTER TABLE stock_rankings
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(32);

-- file_hash에 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_stock_rankings_file_hash
ON stock_rankings(file_hash);

-- 중복 방지를 위한 복합 유니크 인덱스 추가
-- 같은 날짜, 같은 전략 번호의 데이터는 한 번만 저장
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_rankings_unique_strategy_date
ON stock_rankings(strategy_number, ref_date, ticker);

COMMENT ON COLUMN stock_rankings.file_hash IS '파일의 MD5 해시값 (중복 업로드 방지용)';
