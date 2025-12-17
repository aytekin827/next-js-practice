
# data_loader.py

import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from pykrx import stock

from quant_config import UNIVERSE_SIZE_PER_MARKET, MONTHS_3, MONTHS_12


def to_yyyymmdd(d: datetime) -> str:
    return d.strftime("%Y%m%d")


def _is_valid_cap_frame(df: pd.DataFrame) -> bool:
    """시가총액 데이터프레임이 '진짜 영업일'인지 판별.
    - df가 비어 있지 않고
    - '시가총액' 컬럼이 존재하며
    - 시가총액 합계가 0이 아닌 경우만 True
    주말/휴일/장시작 전에는 종종 0으로 채워진 df가 오므로 이걸 걸러낸다.
    """
    if df is None or df.empty:
        return False
    if "시가총액" not in df.columns:
        return False
    try:
        total = float(df["시가총액"].abs().sum())
    except Exception:
        return False
    return total > 0.0


def get_trading_date_on_or_before(date_str: str, max_back_days: int = 10) -> str:
    """입력 날짜 기준, 이전으로 거슬러 올라가며 '시가총액 합계 > 0' 인 첫 영업일을 찾는다."""
    d = datetime.strptime(date_str, "%Y%m%d")
    for _ in range(max_back_days):
        ds = to_yyyymmdd(d)
        try:
            df = stock.get_market_cap(ds)
            if _is_valid_cap_frame(df):
                return ds
        except Exception:
            time.sleep(0.1)
        d = d - timedelta(days=1)
    raise RuntimeError(f"{date_str} 기준 {max_back_days}일 이내 유효한 영업일(시가총액>0)을 찾지 못했습니다.")


def get_recent_trading_date(max_back_days: int = 10) -> str:
    """오늘 기준 가장 가까운 '진짜 영업일' 찾기.
    - 그냥 오늘 날짜로 get_market_cap 호출하면
      장 시작 전에는 시가총액/거래대금이 전부 0으로 나오는 경우가 있어
      그런 날은 스킵하고 전일로 한 칸씩 뒤로 가면서 찾는다.
    """
    today = datetime.today()
    for i in range(max_back_days):
        d = today - timedelta(days=i)
        ds = to_yyyymmdd(d)
        try:
            df = stock.get_market_cap(ds)
            if _is_valid_cap_frame(df):
                return ds
        except Exception:
            time.sleep(0.1)
            continue
    raise RuntimeError(f"최근 {max_back_days}일 안에 유효한 시가총액 데이터를 찾지 못했습니다.")


def percentile_rank(series: pd.Series, higher_is_better: bool = True) -> pd.Series:
    s = series.astype(float).replace([np.inf, -np.inf], np.nan)
    if s.isna().all():
        return pd.Series(0.5, index=s.index)
    median = s.median()
    s = s.fillna(median)
    if not higher_is_better:
        s = -s
    ranks = s.rank(method="average", pct=True)
    return ranks


def get_universe(as_of: str) -> pd.DataFrame:
    kospi_cap = stock.get_market_cap(as_of, market="KOSPI")
    kospi_cap = kospi_cap.sort_values("시가총액", ascending=False).head(UNIVERSE_SIZE_PER_MARKET)
    kospi_cap["시장"] = "KOSPI"

    kosdaq_cap = stock.get_market_cap(as_of, market="KOSDAQ")
    kosdaq_cap = kosdaq_cap.sort_values("시가총액", ascending=False).head(UNIVERSE_SIZE_PER_MARKET)
    kosdaq_cap["시장"] = "KOSDAQ"

    universe = pd.concat([kospi_cap, kosdaq_cap], axis=0)
    universe.index.name = "티커"

    names = {ticker: stock.get_market_ticker_name(ticker)
             for ticker in universe.index}
    universe["종목명"] = pd.Series(names)

    return universe


def get_fundamentals(as_of: str) -> pd.DataFrame:
    kospi_fund = stock.get_market_fundamental(as_of, market="KOSPI")
    kosdaq_fund = stock.get_market_fundamental(as_of, market="KOSDAQ")

    kospi_fund["시장"] = "KOSPI"
    kosdaq_fund["시장"] = "KOSDAQ"

    fund = pd.concat([kospi_fund, kosdaq_fund], axis=0)
    fund.index.name = "티커"
    return fund


def get_price_change_pct(start: str, end: str, market: str) -> pd.Series:
    df = stock.get_market_price_change(start, end, market=market)
    return df["등락률"]


def get_momentum(as_of: str,
                 months_3: int = MONTHS_3,
                 months_12: int = MONTHS_12) -> pd.DataFrame:
    as_of_dt = datetime.strptime(as_of, "%Y%m%d")

    start_3m = to_yyyymmdd(as_of_dt - timedelta(days=30 * months_3))
    start_12m = to_yyyymmdd(as_of_dt - timedelta(days=30 * months_12))

    mom_frames = []
    for market in ["KOSPI", "KOSDAQ"]:
        mom3 = get_price_change_pct(start_3m, as_of, market=market)
        mom12 = get_price_change_pct(start_12m, as_of, market=market)
        df = pd.DataFrame({"mom_3m": mom3, "mom_12m": mom12})
        df["시장"] = market
        mom_frames.append(df)

    mom = pd.concat(mom_frames, axis=0)
    mom.index.name = "티커"
    return mom


def get_ohlcv(ticker: str, start: str, end: str) -> pd.DataFrame:
    df = stock.get_market_ohlcv_by_date(start, end, ticker)
    return df
