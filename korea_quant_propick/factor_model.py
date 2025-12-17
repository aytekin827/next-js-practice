
# factor_model.py

import numpy as np
import pandas as pd

from quant_config import (
    WEIGHT_VALUE,
    WEIGHT_QUALITY,
    WEIGHT_MOMENTUM,
    WEIGHT_LOW_RISK,
)
from data_loader import (
    get_universe,
    get_fundamentals,
    get_momentum,
    percentile_rank,
)


def build_factor_table(as_of: str) -> pd.DataFrame:
    print(f"[INFO] 기준일 {as_of} 데이터 수집 중...")

    universe = get_universe(as_of)
    fund = get_fundamentals(as_of)
    mom = get_momentum(as_of)

    df = universe.join(fund, how="left", rsuffix="_fund")

    mom_to_join = mom.drop(columns=["시장"], errors="ignore")
    df = df.join(mom_to_join, how="left")

    if "시장_fund" in df.columns:
        df = df.drop(columns=["시장_fund"])

    per = df["PER"].copy()
    per_clean = per.replace({0: np.nan})
    per_rank = percentile_rank(per_clean, higher_is_better=False)

    pbr = df["PBR"].copy()
    pbr_clean = pbr.replace({0: np.nan})
    pbr_rank = percentile_rank(pbr_clean, higher_is_better=False)

    div = df["DIV"].copy()
    div_rank = percentile_rank(div, higher_is_better=True)

    value_score = (0.5 * per_rank + 0.3 * pbr_rank + 0.2 * div_rank) * 100

    eps = df["EPS"].copy()
    bps = df["BPS"].replace({0: np.nan})
    roe_proxy = eps / bps
    roe_rank = percentile_rank(roe_proxy, higher_is_better=True)

    quality_score = (0.7 * roe_rank + 0.3 * div_rank) * 100

    mom3 = df["mom_3m"]
    mom12 = df["mom_12m"]

    mom3_rank = percentile_rank(mom3, higher_is_better=True)
    mom12_rank = percentile_rank(mom12, higher_is_better=True)

    momentum_score = (0.4 * mom3_rank + 0.6 * mom12_rank) * 100

    marcap = df["시가총액"]
    trading_value = df["거래대금"]

    size_rank = percentile_rank(marcap, higher_is_better=True)
    liq_rank = percentile_rank(trading_value, higher_is_better=True)

    risk_proxy = 1 - (0.7 * size_rank + 0.3 * liq_rank)
    risk_proxy = risk_proxy.clip(0, 1)
    risk_score = risk_proxy * 100

    total_score = (
        WEIGHT_VALUE * value_score +
        WEIGHT_QUALITY * quality_score +
        WEIGHT_MOMENTUM * momentum_score +
        WEIGHT_LOW_RISK * (100 - risk_score)
    )

    df["value_score"] = value_score
    df["quality_score"] = quality_score
    df["momentum_score"] = momentum_score
    df["risk_score"] = risk_score
    df["total_score"] = total_score

    return df


def make_stock_comment(row: pd.Series) -> str:
    name = row.get("종목명", "")
    ticker = row.name
    market = row.get("시장", "")
    per = row.get("PER", np.nan)
    pbr = row.get("PBR", np.nan)
    div = row.get("DIV", np.nan)
    mom3 = row.get("mom_3m", np.nan)
    mom12 = row.get("mom_12m", np.nan)
    marcap = row.get("시가총액", np.nan)
    total = row.get("total_score", np.nan)

    parts = []
    parts.append(f"[{name}({ticker}) / {market}] 종합점수 {total:.1f}점")

    if not np.isnan(marcap):
        if marcap >= 5e12:
            parts.append(f"- 시가총액 {marcap/1e12:.2f}조: 대형주")
        elif marcap >= 1e12:
            parts.append(f"- 시가총액 {marcap/1e12:.2f}조: 중대형주")
        else:
            parts.append(f"- 시가총액 {marcap/1e12:.2f}조: 중소형주")

    if per > 0 and not np.isnan(per):
        if per < 10:
            parts.append(f"- PER {per:.1f}배: 이익 대비 저평가 구간")
        elif per > 30:
            parts.append(f"- PER {per:.1f}배: 이익 대비 고평가 구간 가능성")
        else:
            parts.append(f"- PER {per:.1f}배: 적정~보통 밸류에이션")
    else:
        parts.append("- PER 데이터가 없거나 적자 상태")

    if not np.isnan(pbr):
        if pbr < 1:
            parts.append(f"- PBR {pbr:.2f}배: 장부가 대비 저평가(1배 미만)")
        elif pbr > 3:
            parts.append(f"- PBR {pbr:.2f}배: 장부가 대비 프리미엄 구간")
        else:
            parts.append(f"- PBR {pbr:.2f}배: 보통 수준")

    if not np.isnan(div):
        if div >= 4:
            parts.append(f"- 배당수익률 {div:.1f}%: 배당 매력 높음")
        elif div > 0:
            parts.append(f"- 배당수익률 {div:.1f}%: 배당 지급 중")
        else:
            parts.append("- 배당 없음 또는 매우 낮음")

    if not np.isnan(mom12):
        if mom12 > 30:
            parts.append(f"- 12개월 수익률 {mom12:.1f}%: 강한 상승 추세")
        elif mom12 < -20:
            parts.append(f"- 12개월 수익률 {mom12:.1f}%: 뚜렷한 하락 추세")
        else:
            parts.append(f"- 12개월 수익률 {mom12:.1f}%: 중립~보통 수준")

    if not np.isnan(mom3):
        if mom3 > 15:
            parts.append(f"- 3개월 수익률 {mom3:.1f}%: 단기 모멘텀 양호")
        elif mom3 < -10:
            parts.append(f"- 3개월 수익률 {mom3:.1f}%: 단기 조정 국면")
        else:
            parts.append(f"- 3개월 수익률 {mom3:.1f}%: 단기 움직임 크지 않음")

    return "\n".join(parts)
