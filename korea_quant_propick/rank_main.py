
# rank_main.py
# 0~14번 전략 선택형 멀티팩터 랭킹 (전략명 + 타임스탬프 기반 파일명)
# 모든 전략: total_score 기준 내림차순 정렬
# CSV/콘솔에서 종목명 바로 옆에 종목코드 위치
# CSV는 ./strategies 폴더에 저장, 파일명은 초단위 타임스탬프까지 포함

import os
from datetime import datetime
from pathlib import Path
import warnings

# pykrx 쪽에서 나오는 pkg_resources / FutureWarning 노이즈 제거
warnings.filterwarnings("ignore", category=UserWarning, module="pykrx")
warnings.filterwarnings("ignore", category=FutureWarning, module="pykrx")

import pandas as pd

from quant_config import UNIVERSE_SIZE_PER_MARKET, TOP_N_TO_SHOW, MIN_TRADING_VALUE, MIN_VOLUME_SHARES, MAX_PRICE_PER_SHARE, MIN_MARKET_CAP_WON
from upload_to_supabase import upload_and_insert

# 방어 코드: 구버전 설정 파일에서 상수가 없을 수 있어 기본값을 둔다.
try:
    MIN_VOLUME_SHARES  # noqa: F401
except NameError:
    MIN_VOLUME_SHARES = 100_000
try:
    MAX_PRICE_PER_SHARE  # noqa: F401
except NameError:
    MAX_PRICE_PER_SHARE = 70_000
try:
    MIN_MARKET_CAP_WON  # noqa: F401
except NameError:
    MIN_MARKET_CAP_WON = 3000 * 100_000_000
from data_loader import get_recent_trading_date
from factor_model import build_factor_table, make_stock_comment


RESULT_DIR = "strategies"


STRATEGY_INFO: dict[str, tuple[str, str]] = {
    "1": ("전략 1 멀티팩터 균형형 추천", "멀티팩터 균형형 추천주"),
    "2": ("전략 2 가치주 중심 추천", "가치주 중심 추천주"),
    "3": ("전략 3 퀄리티 배당주 추천", "퀄리티/배당주 추천주"),
    "4": ("전략 4 모멘텀 추세 추종 추천", "모멘텀 추세 추종 추천주"),
    "5": ("전략 5 저위험 대형주 방어형 추천", "저위험 대형주 방어형 추천주"),
    "6": ("전략 6 소형주 하이모멘텀 스윙 추천", "소형주 하이모멘텀 스윙 추천주"),
    "7": ("전략 7 고배당 방어형 추천", "고배당 방어형 추천주"),
    "8": ("전략 8 딥밸류 리레이팅 기대주", "딥밸류 리레이팅 기대주"),
    "9": ("전략 9 우상향 단기조정 매수후보", "우상향 중 단기조정 매수候보"),
    "10": ("전략 10 퀄리티 성장 모멘텀주", "퀄리티 성장 모멘텀주"),
    "11": ("전략 11 단기 스캘핑 1% 타겟", "단기 스캘핑 1% 타겟候보"),
    "12": ("전략 12 단기 스캘핑 고확률", "단기 스캘핑 고확률候보"),
    "13": ("전략 13 단기 눌림목 매수", "단기 눌림목 매수候보"),
    "14": ("전략 14 오늘 최적 종합 추천", "오늘 최적 종합 추천주"),
}


def classify_market_cap(marcap: float) -> str:
    if pd.isna(marcap):
        return "알수없음"
    if marcap >= 10_000_000_000_000:
        return "초대형주(10조↑)"
    if marcap >= 5_000_000_000_000:
        return "대형주(5~10조)"
    if marcap >= 1_000_000_000_000:
        return "중형주(1~5조)"
    return "소형주(1조↓)"


def classify_risk(risk_score: float) -> str:
    if pd.isna(risk_score):
        return "알수없음"
    if risk_score <= 33:
        return "저위험"
    if risk_score <= 66:
        return "중위험"
    return "고위험"


def classify_style(row: pd.Series) -> str:
    v = row.get("value_score", 0.0)
    q = row.get("quality_score", 0.0)
    m = row.get("momentum_score", 0.0)
    max_score = max(v, q, m)

    if max_score == v:
        return "가치주" if v >= 70 else "밸류/균형형"
    if max_score == m:
        return "모멘텀주" if m >= 70 else "모멘텀/균형형"
    return "퀄리티/배당주" if q >= 70 else "퀄리티/균형형"



def enrich_table(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # 종목코드: 항상 6자리 0패딩 (예: 270 -> '000270'), 엑셀에서 0이 안날아가도록 문자열로 저장
    df["종목코드"] = df.index.astype(str).str.zfill(6)
    df["시총구간"] = df["시가총액"].apply(classify_market_cap)
    df["리스크구간"] = df["risk_score"].apply(classify_risk)
    df["스타일"] = df.apply(classify_style, axis=1)
    return df


def reorder_columns_for_output(df: pd.DataFrame) -> pd.DataFrame:
    # 출력/CSV 용 정리: 시가총액을 '억' 단위로 변환해서 보여준다.
    df = df.copy()
    if "시가총액" in df.columns:
        # 원단위 -> 억단위 (예: 12,340,000,000 -> 123.4)
        df["시가총액"] = (df["시가총액"] / 100_000_000).round(1)
    first_cols = ["종목명", "종목코드"]
    other_cols = [c for c in df.columns if c not in first_cols]
    return df[first_cols + other_cols]
def apply_strategy(df: pd.DataFrame, choice: str):
    if choice not in STRATEGY_INFO:
        raise ValueError("지원하지 않는 전략 코드")

    prefix, title = STRATEGY_INFO[choice]
    # 기본 베이스: 유동성(거래대금) + 거래량(10만주 이상) + 1주당 가격(7만원 이하) + 시총(3000억 이상) 필터
    base = df[(df["거래대금"] >= MIN_TRADING_VALUE) & (df["거래량"] >= MIN_VOLUME_SHARES) & (df["종가"] <= MAX_PRICE_PER_SHARE) & (df["시가총액"] >= MIN_MARKET_CAP_WON)].copy()
    if base.empty:
        # 유동성 기준을 통과하는 종목이 전혀 없으면, 거래대금 필터만 제거하고
        # 최소 거래량(10만주) + 1주당 가격(7만원 이하) + 시총(3000억 이상) 조건만 적용해서 베이스를 구성한다.
        print("[WARN] 유동성 필터 통과 종목이 없어 거래대금 필터를 제거하고 거래량+가격+시총 필터만 적용합니다.")
        base = df[(df["거래량"] >= MIN_VOLUME_SHARES) & (df["종가"] <= MAX_PRICE_PER_SHARE) & (df["시가총액"] >= MIN_MARKET_CAP_WON)].copy()

    if choice == "1":
        filt = base

    elif choice == "2":
        filt = base[base["value_score"] >= 60]

    elif choice == "3":
        filt = base[base["quality_score"] >= 60]

    elif choice == "4":
        filt = base[base["mom_12m"] > 0]

    elif choice == "5":
        filt = base[
            (base["시가총액"] >= 5_000_000_000_000) &
            (base["risk_score"] <= 40)
        ]

    elif choice == "6":
        filt = base[
            (base["시가총액"] < 5_000_000_000_000) &
            (base["momentum_score"] >= 60)
        ]

    elif choice == "7":
        filt = base[
            (base["DIV"] >= 3.0) &
            (base["risk_score"] <= 60) &
            (base["시가총액"] >= 1_000_000_000_000)
        ]

    elif choice == "8":
        filt = base[
            (base["value_score"] >= 60) &
            (base["mom_12m"] >= 0)
        ]

    elif choice == "9":
        filt = base[
            (base["mom_12m"] >= 20) &
            (base["mom_3m"] <= 0)
        ]

    elif choice == "10":
        filt = base[
            (base["quality_score"] >= 70) &
            (base["momentum_score"] >= 60)
        ]

    elif choice == "11":
        high_liq = MIN_TRADING_VALUE * 3
        filt = base[
            (base["거래대금"] >= high_liq) &
            (base["mom_3m"] >= 5) &
            (base["mom_3m"] <= 40) &
            (base["risk_score"] >= 40) &
            (base["risk_score"] <= 80)
        ]

    elif choice == "12":
        super_liq = MIN_TRADING_VALUE * 5
        filt = base[
            (base["거래대금"] >= super_liq) &
            (base["mom_12m"] >= 10) &
            (base["mom_12m"] <= 60) &
            (base["mom_3m"] >= 3) &
            (base["mom_3m"] <= 25) &
            (base["risk_score"] >= 20) &
            (base["risk_score"] <= 60) &
            (base["quality_score"] >= 50)
        ]


    elif choice == "13":
        # 단기 눌림목 매수 전략:
        # - 최근 12개월은 상승 추세 (15%~80%)
        # - 최근 3개월은 과도한 급등은 아니고, -15% ~ +5% 구간의 적당한 조정
        # - 거래대금은 기본 유동성 기준보다 2배 이상
        # - 리스크는 너무 낮지도/높지도 않은 중간 구간
        strong_liq = MIN_TRADING_VALUE * 2
        filt = base[
            (base["거래대금"] >= strong_liq) &
            (base["mom_12m"] >= 15) & (base["mom_12m"] <= 80) &
            (base["mom_3m"] >= -15) & (base["mom_3m"] <= 5) &
            (base["risk_score"] >= 20) & (base["risk_score"] <= 70)
        ]

    elif choice == "14":
        # 전략 14: 2~13번 전략(특히 팩터 전략들)의 후보군 중에서
        # total_score 기준 최적 50개를 뽑는 최종 종합 전략.
        # 여기서는 2~13번 전략 각각의 상위 종목들을 모아 합집합을 만들고,
        # 중복 제거 후 total_score로 다시 정렬한다.
        candidates = []
        for sub in [str(i) for i in range(2, 14)]:  # 2~13번 전략만 활용 (14 자신은 제외)
            _, _, sub_ranked = apply_strategy(df, sub)
            if sub_ranked is not None and not sub_ranked.empty:
                # 각 전략에서 상위 일부만 사용 (예: 상위 80개)
                candidates.append(sub_ranked.head(80))

        if candidates:
            combined = pd.concat(candidates, axis=0)
            # 동일 종목(티커)은 처음 등장한 전략에서의 점수를 사용
            combined = combined[~combined.index.duplicated(keep="first")]
            filt = combined
        else:
            # 만약 어떤 전략도 후보를 내지 못한 극단적 상황이면 전체 유니버스를 사용
            filt = df.copy()

    # 정렬 기준: 기본은 total_score, 전략 14는 "거래량" 많은 순(동률 시 total_score 순)
    if choice == "14" and "거래량" in filt.columns:
        ranked = filt.sort_values(["거래량", "total_score"], ascending=[False, False]).copy()
    else:
        ranked = filt.sort_values("total_score", ascending=False).copy()
    return prefix, title, ranked


def run_single_strategy(df: pd.DataFrame, as_of: str, timestamp: str, choice: str):
    prefix, title, df_ranked = apply_strategy(df, choice)

    if df_ranked.empty:
        print(f"[WARN] '{title}' 조건을 만족하는 종목이 없습니다.")
        return

    df_ranked = reorder_columns_for_output(df_ranked)

    top = df_ranked.head(TOP_N_TO_SHOW).copy()

    pd.set_option("display.max_columns", 80)
    pd.set_option("display.width", 240)

    print("\n==========================================================")
    print(f"=== {as_of} 기준 {title} 상위 {TOP_N_TO_SHOW} 종목 ===")
    print("==========================================================\n")

    cols_to_show = [
        "종목명", "종목코드", "시장", "시총구간", "리스크구간", "스타일",
        "시가총액", "거래대금",
        "PER", "PBR", "DIV", "EPS", "BPS",
        "mom_3m", "mom_12m",
        "value_score", "quality_score", "momentum_score", "risk_score", "total_score",
    ]
    cols_to_show = [c for c in cols_to_show if c in top.columns]
    print(top[cols_to_show])

    print("\n==========================================================")
    print(f"=== {title} 상위 종목 애널리스트 코멘트 ===")
    print("============================================================\n")

    for i, (ticker, row) in enumerate(top.iterrows(), start=1):
        print(f"[{i}] ------------------------------------------")
        print(make_stock_comment(row))
        print()

    os.makedirs(RESULT_DIR, exist_ok=True)
    outfile = os.path.join(RESULT_DIR, f"{prefix}_{timestamp}.csv")
    # 전략 14는 최종 요약본 50개만 저장, 나머지는 전체 저장
    if choice == "14":
        df_to_save = df_ranked.head(50).copy()
    else:
        df_to_save = df_ranked
    df_to_save.to_csv(outfile, encoding="utf-8-sig", index=False)
    print(f"[INFO] 선택한 전략 '{title}' 리스트를 {outfile} 로 저장했습니다.")


def run_all_strategies(df: pd.DataFrame, as_of: str, timestamp: str):
    os.makedirs(RESULT_DIR, exist_ok=True)
    for choice in [str(i) for i in range(1, 15)]:
        prefix, title, df_ranked = apply_strategy(df, choice)

        if df_ranked.empty:
            print(f"[WARN] '{title}' 조건을 만족하는 종목이 없습니다. (전략 {choice})")
            continue

        df_ranked = reorder_columns_for_output(df_ranked)

        # 기존 프로젝트
        outfile = os.path.join(RESULT_DIR, f"{prefix}_{timestamp}.csv")

        # 자동화에 사용할 경로
        # outfile = Path(rf'C:\Users\ok\Desktop\BlogAlmighty\data\stock_propick\{datetime.today().strftime("%Y%m%d")}\{prefix}.csv')
        # outfile.parent.mkdir(parents=True, exist_ok=True)

        if choice == "14":
            df_to_save = df_ranked.head(50).copy()
        else:
            df_to_save = df_ranked
        df_to_save.to_csv(outfile, encoding="utf-8-sig", index=False)
        print(f"[INFO] 전략 {choice} '{title}' 리스트를 {outfile} 로 저장했습니다.")

    print("\n[INFO] 1~14번 모든 전략 CSV 저장을 완료했습니다.")


def select_strategy(df: pd.DataFrame, as_of: str, timestamp: str):
    print("\n==============================")
    print(f"=== {as_of} 기준 추천 전략 선택 ===")
    print("==============================")
    print("0. 모든 전략 CSV 한번에 생성")
    print("1. 멀티팩터 균형형 추천주 (total_score 상위)")
    print("2. 가치주 중심 추천주 (value_score 필터 + total_score 정렬)")
    print("3. 퀄리티/배당주 추천주 (quality_score 필터 + total_score 정렬)")
    print("4. 모멘텀 추세 추종 추천주 (12M 플러스 + total_score 정렬)")
    print("5. 저위험 대형주 방어형 추천주 (대형·초대형 + 저리스크 + total_score 정렬)")
    print("6. 소형주 하이모멘텀 스윙 추천주 (소/중형 + 모멘텀 필터 + total_score 정렬)")
    print("7. 고배당 방어형 추천주 (배당 3%↑ + 중저위험 + total_score 정렬)")
    print("8. 딥밸류 리레이팅 기대주 (밸류 상위 + 12M 플러스 + total_score 정렬)")
    print("9. 우상향 중 단기조정 매수候보 (12M 강세 + 3M 조정 + total_score 정렬)")
    print("10. 퀄리티 성장 모멘텀주 (퀄리티 70↑ + 모멘텀 60↑ + total_score 정렬)")
    print("11. 단기 스캘핑 1% 타겟候보 (초고유동성 + 단기모멘텀 5~40% + 리스크 40~80)")
    print("12. 단기 스캘핑 고확률候보 (슈퍼유동성 + 완만한 우상향 + 중저위험 + 퀄리티 필터)")
    print("13. 단기 눌림목 매수候보 (12M 우상향 + 3M 적당한 조정 + 중간 리스크 + 강화 유동성)")
    print("14. 오늘 최적 종합 추천주 (전략 2~13 상위 후보 중 total_score 기준 TOP 50)")
    print("==============================")

    choice = input("원하는 번호를 입력하고 엔터를 눌러주세요: ").strip()
    if choice == "0":
        run_all_strategies(df, as_of, timestamp)
    elif choice in STRATEGY_INFO:
        run_single_strategy(df, as_of, timestamp, choice)
    else:
        print("잘못된 입력입니다. 0~14 중에서 선택해주세요.")


def main():
    as_of = get_recent_trading_date()
    print(f"[INFO] 기준일(최근 영업일): {as_of}")

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    df_raw = build_factor_table(as_of)
    df = enrich_table(df_raw)

    run_all_strategies(df, as_of, timestamp)
    upload_and_insert()
    # select_strategy(df, as_of, timestamp)


if __name__ == "__main__":
    main()