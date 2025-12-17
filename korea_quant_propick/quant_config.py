
# quant_config.py

# 유니버스: 코스피 / 코스닥 각각 시총 상위 N개
UNIVERSE_SIZE_PER_MARKET = 500

# 랭킹 출력 시 상위 N개
TOP_N_TO_SHOW = 30

# 모멘텀 기간 (개월)
MONTHS_3 = 3
MONTHS_12 = 12

# 팩터 가중치
WEIGHT_VALUE = 0.40
WEIGHT_QUALITY = 0.25
WEIGHT_MOMENTUM = 0.25
WEIGHT_LOW_RISK = 0.10

# 유동성 필터: 일평균 거래대금 최소 기준 (원)
MIN_TRADING_VALUE = 100_000_000  # 1억 (유동성 필터 완화)

# 백테스트 설정
BACKTEST_START_DATE = "20180101"
BACKTEST_END_DATE = None
BACKTEST_TOP_N = 30
INITIAL_CAPITAL = 100_000_000

# 거래량 필터: 일평균 거래량 최소 기준 (주)
MIN_VOLUME_SHARES = 100_000  # 10만주 미만 종목 제외

# 1주당 가격(종가) 필터: 너무 비싼 종목 제외 (원)
MAX_PRICE_PER_SHARE = 70_000  # 7만원 초과 종목 제외

# 시가총액 필터: 최소 시가총액 기준 (원) - 3,000억 미만 제외
MIN_MARKET_CAP_WON = 3000 * 100_000_000  # 3000억
