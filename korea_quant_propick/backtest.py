
# backtest.py

from datetime import datetime

import numpy as np
import pandas as pd

from quant_config import (
    BACKTEST_START_DATE,
    BACKTEST_END_DATE,
    BACKTEST_TOP_N,
    INITIAL_CAPITAL,
    MIN_TRADING_VALUE,
)
from data_loader import (
    to_yyyymmdd,
    get_trading_date_on_or_before,
    get_recent_trading_date,
    get_ohlcv,
)
from factor_model import build_factor_table


def _next_year_month(year: int, month: int):
    if month == 12:
        return year + 1, 1
    return year, month + 1


def build_rebalance_dates(start_date: str, end_date: str | None) -> list[str]:
    if end_date is None:
        end_date = get_recent_trading_date()

    start_dt = datetime.strptime(start_date, "%Y%m%d")
    end_dt = datetime.strptime(end_date, "%Y%m%d")

    dates: list[str] = []
    year = start_dt.year
    month = start_dt.month

    while True:
        current = datetime(year, month, 1)
        if current > end_dt:
            break

        date_str = to_yyyymmdd(current)
        try:
            trade_date = get_trading_date_on_or_before(date_str, max_back_days=10)
        except RuntimeError:
            year, month = _next_year_month(year, month)
            continue

        if not dates or trade_date != dates[-1]:
            dates.append(trade_date)

        year, month = _next_year_month(year, month)

    if len(dates) < 2:
        raise RuntimeError("리밸런싱 날짜가 2개 미만입니다. 백테스트 기간을 늘려주세요.")

    return dates


def calc_portfolio_return(symbols: list[str], start: str, end: str) -> tuple[float, int]:
    rets = []
    used = 0
    for ticker in symbols:
        try:
            df = get_ohlcv(ticker, start, end)
        except Exception:
            continue
        if df is None or df.empty or len(df) < 2:
            continue
        entry = float(df["종가"].iloc[0])
        exit_ = float(df["종가"].iloc[-1])
        if entry <= 0 or exit_ <= 0:
            continue
        r = exit_ / entry - 1.0
        rets.append(r)
        used += 1
    if used == 0:
        return 0.0, 0
    return float(np.mean(rets)), used


def run_backtest():
    rebalance_dates = build_rebalance_dates(BACKTEST_START_DATE, BACKTEST_END_DATE)
    print("[INFO] 리밸런싱 날짜 목록:")
    print(rebalance_dates)

    equity = INITIAL_CAPITAL
    records: list[dict] = []

    for i in range(len(rebalance_dates) - 1):
        reb_date = rebalance_dates[i]
        next_date = rebalance_dates[i + 1]

        print(f"\n[INFO] 리밸런싱 {i+1}/{len(rebalance_dates)-1}: {reb_date} -> {next_date}")

        factors = build_factor_table(reb_date)
        liquid = factors[factors["거래대금"] >= MIN_TRADING_VALUE]

        if liquid.empty:
            print("[WARN] 유동성 필터 통과 종목 없음. 수익률 0으로 처리.")
            period_ret = 0.0
            num_used = 0
        else:
            ranked = liquid.sort_values("total_score", ascending=False)
            selected = ranked.head(BACKTEST_TOP_N)
            symbols = list(selected.index)
            period_ret, num_used = calc_portfolio_return(symbols, reb_date, next_date)

        equity *= (1.0 + period_ret)

        records.append({
            "rebalance_date": reb_date,
            "next_date": next_date,
            "period_return": period_ret,
            "equity": equity,
            "num_positions": num_used,
        })

    if not records:
        raise RuntimeError("백테스트 결과가 없습니다.")

    result = pd.DataFrame(records)
    _print_summary(result)

    end_label = BACKTEST_END_DATE or "LATEST"
    outfile = f"backtest_result_{BACKTEST_START_DATE}_{end_label}.csv"
    result.to_csv(outfile, encoding="utf-8-sig", index=False)
    print(f"[INFO] 백테스트 결과를 {outfile} 로 저장했습니다.")


def _print_summary(df: pd.DataFrame):
    print("\n==============================")
    print("=== 백테스트 결과 요약 ===")
    print("==============================\n")

    start_date = df["rebalance_date"].iloc[0]
    end_date = df["next_date"].iloc[-1]

    total_return = df["equity"].iloc[-1] / INITIAL_CAPITAL - 1.0

    start_dt = datetime.strptime(start_date, "%Y%m%d")
    end_dt = datetime.strptime(end_date, "%Y%m%d")
    days = (end_dt - start_dt).days
    years = days / 365.0 if days > 0 else 0.0
    if years > 0:
        cagr = (df["equity"].iloc[-1] / INITIAL_CAPITAL) ** (1.0 / years) - 1.0
    else:
        cagr = float("nan")

    equity = df["equity"].values
    peak = np.maximum.accumulate(equity)
    drawdown = equity / peak - 1.0
    mdd = float(drawdown.min())

    winrate = float((df["period_return"] > 0).mean())

    print(f"백테스트 기간          : {start_date} ~ {end_date} ({days}일)")
    print(f"초기 자본              : {INITIAL_CAPITAL:,.0f}원")
    print(f"최종 자본              : {df['equity'].iloc[-1]:,.0f}원")
    print(f"총 수익률              : {total_return*100:,.2f}%")
    print(f"연복리 수익률(CAGR)    : {cagr*100:,.2f}%")
    print(f"최대낙폭(MDD)          : {mdd*100:,.2f}%")
    print(f"승률(리밸런싱 기준)    : {winrate*100:,.2f}%")
    print(f"리밸런싱 횟수          : {len(df)}회")

    print("\n[DEBUG] 리밸런싱별 요약 일부:\n")
    print(df.head())


if __name__ == "__main__":
    run_backtest()
