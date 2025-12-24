-- 트레이딩 설정 테이블에 할인율 컬럼 추가
ALTER TABLE trading_settings
ADD COLUMN IF NOT EXISTS default_discount_percent DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS quantum_default_discount_percent DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS sell_profit_percent DECIMAL(5,2) DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS crypto_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS crypto_max_investment_percent DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS crypto_stop_loss_percent DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS crypto_profit_taking_percent DECIMAL(5,2) DEFAULT 10.0;

-- 기존 데이터에 기본값 설정 (NULL인 경우만)
UPDATE trading_settings
SET
  default_discount_percent = 1.0
WHERE default_discount_percent IS NULL;

UPDATE trading_settings
SET
  quantum_default_discount_percent = 1.0
WHERE quantum_default_discount_percent IS NULL;

UPDATE trading_settings
SET
  sell_profit_percent = 3.0
WHERE sell_profit_percent IS NULL;

UPDATE trading_settings
SET
  crypto_enabled = false
WHERE crypto_enabled IS NULL;

UPDATE trading_settings
SET
  crypto_max_investment_percent = 10.0
WHERE crypto_max_investment_percent IS NULL;

UPDATE trading_settings
SET
  crypto_stop_loss_percent = 5.0
WHERE crypto_stop_loss_percent IS NULL;

UPDATE trading_settings
SET
  crypto_profit_taking_percent = 10.0
WHERE crypto_profit_taking_percent IS NULL;