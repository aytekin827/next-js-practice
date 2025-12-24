-- Supabase에서 실행할 RPC 함수
-- 이 함수는 특정 날짜의 고유한 전략 목록을 반환합니다

CREATE OR REPLACE FUNCTION get_distinct_strategies(query_date DATE)
RETURNS TABLE (
  strategy_number INTEGER,
  strategy_name TEXT
)
LANGUAGE sql
AS $$
  SELECT DISTINCT
    sr.strategy_number,
    sr.strategy_name
  FROM stock_rankings sr
  WHERE sr.ref_date = query_date
  ORDER BY sr.strategy_number;
$$;