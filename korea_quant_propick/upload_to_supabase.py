import os
import glob
import datetime
import re
import math
import hashlib
import pandas as pd
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv

# .env 로드
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# 설정
BUCKET_NAME = "stock-data"
TARGET_DIR = "strategies"

def get_file_hash(file_path):
    """파일의 MD5 해시값을 계산합니다."""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def check_storage_exists(supabase, bucket_name, storage_path):
    """Storage에 파일이 이미 존재하는지 확인합니다."""
    try:
        response = supabase.storage.from_(bucket_name).list(path=os.path.dirname(storage_path))
        filename = os.path.basename(storage_path)
        return any(file['name'] == filename for file in response)
    except Exception:
        return False

def check_db_exists(supabase, strategy_number, ref_date):
    """DB에 같은 전략/날짜 데이터가 이미 존재하는지 확인합니다."""
    try:
        response = supabase.table("stock_rankings").select("id").eq("strategy_number", strategy_number).eq("ref_date", ref_date).execute()
        return len(response.data) > 0
    except Exception:
        return False

def check_file_hash_exists(supabase, file_hash):
    """DB에 같은 해시값의 파일이 이미 업로드되었는지 확인합니다."""
    try:
        response = supabase.table("stock_rankings").select("id").eq("file_hash", file_hash).limit(1).execute()
        return len(response.data) > 0
    except Exception:
        return False

def get_today_str():
    return datetime.datetime.now().strftime("%Y%m%d")

def is_weekend():
    return datetime.datetime.today().weekday() >= 5

def make_safe_storage_name(filename):
    # 예: "전략 9 ...csv" -> "strategy_9_20251219.csv"
    match = re.search(r'전략\s*(\d+)', filename)
    strategy_num = match.group(1) if match else "unknown"
    time_match = re.search(r'_(\d{14})\.csv', filename)
    timestamp = time_match.group(1) if time_match else get_today_str()
    return f"strategy_{strategy_num}_{timestamp}.csv"

# [핵심] JSON 전송 전 데이터 정제 함수
def clean_record_for_json(record):
    new_record = {}
    for k, v in record.items():
        # 1. 실수(float)인 경우 무한대/NaN 체크
        if isinstance(v, float):
            if math.isinf(v) or math.isnan(v):
                new_record[k] = None
            else:
                new_record[k] = v
        # 2. Numpy 타입(int64, float64 등) 처리
        elif isinstance(v, (np.float32, np.float64, np.number)):
            if np.isinf(v) or np.isnan(v):
                new_record[k] = None
            else:
                # JSON은 numpy 타입을 모르므로 python 기본 타입으로 변환
                new_record[k] = v.item()
        # 3. 나머지는 그대로
        else:
            new_record[k] = v
    return new_record

def upload_and_insert():
    if is_weekend():
        print("[INFO] 주말이라 실행하지 않습니다.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[ERROR] Supabase 연결 실패: {e}")
        return

    today_str = get_today_str()
    file_pattern = os.path.join(TARGET_DIR, f"*{today_str}*.csv")
    files = glob.glob(file_pattern)

    if not files:
        print(f"[WARN] 오늘({today_str}) 생성된 파일이 없습니다.")
        return

    print(f"[INFO] 발견된 파일: {len(files)}개")

    for file_path in files:
        original_filename = os.path.basename(file_path)
        safe_filename = make_safe_storage_name(original_filename)
        storage_path = f"{today_str}/{safe_filename}"[:-8]

        # 파일 해시 계산
        file_hash = get_file_hash(file_path)

        # 전략 번호 추출
        strategy_number = original_filename.split('_')[0].split()[1] if '전략' in original_filename else "unknown"

        # 중복 체크
        storage_exists = check_storage_exists(supabase, BUCKET_NAME, storage_path)
        db_exists = check_db_exists(supabase, strategy_number, today_str)
        hash_exists = check_file_hash_exists(supabase, file_hash)

        if hash_exists:
            print(f"[SKIP] 동일한 파일이 이미 업로드됨 (해시 일치): {original_filename}")
            continue

        if storage_exists and db_exists:
            print(f"[SKIP] 이미 업로드됨: {original_filename}")
            continue

        # A. Storage 업로드
        try:
            if not storage_exists:
                with open(file_path, 'rb') as f:
                    supabase.storage.from_(BUCKET_NAME).upload(
                        path=storage_path,
                        file=f,
                        file_options={"content-type": "text/csv", "x-upsert": "true"}
                    )
                print(f"[Storage] 업로드 성공: {original_filename}")
            else:
                print(f"[Storage] 이미 존재함: {original_filename}")
        except Exception as e:
            # 403 에러가 나면 SQL 실행 여부를 확인하세요.
            print(f"[Storage] 에러 (SQL 권한 설정을 확인하세요): {e}")
            continue

        # B. DB Insert
        try:
            if db_exists:
                print(f"[DB] 이미 존재함: {original_filename}")
                continue

            df = pd.read_csv(file_path)

            # 컬럼 매핑
            rename_map = {
                "종목코드": "ticker", "종목명": "name", "시장": "market",
                "시총구간": "sector", "스타일": "style",
                "시가총액": "market_cap_bil", "거래대금": "trading_val_won",
                "total_score": "total_score", "value_score": "value_score",
                "quality_score": "quality_score", "momentum_score": "momentum_score",
                "risk_score": "risk_score",
                "PER": "per", "PBR": "pbr", "DIV": "div_yield",
                "mom_3m": "mom_3m", "mom_12m": "mom_12m"
            }

            # 필요한 컬럼만 추출 및 이름 변경
            available_cols = [c for c in rename_map.keys() if c in df.columns]
            db_df = df[available_cols].rename(columns=rename_map)

            # 숫자형 컬럼 강제 변환 (문자 'inf' 등을 float inf로 변환)
            numeric_cols = [
                "market_cap_bil", "trading_val_won", "total_score",
                "value_score", "quality_score", "momentum_score", "risk_score",
                "per", "pbr", "div_yield", "mom_3m", "mom_12m"
            ]
            for col in numeric_cols:
                if col in db_df.columns:
                    db_df[col] = pd.to_numeric(db_df[col], errors='coerce')

            # 메타데이터 추가
            db_df['strategy_number'] = strategy_number
            db_df['strategy_name'] = ''.join(original_filename.split('_')[0].split()[2:])
            db_df['ref_date'] = today_str
            db_df['storage_path'] = storage_path
            db_df['file_hash'] = file_hash

            # [수정] Dictionary 변환 후 정밀 세탁 (Sanitize)
            raw_records = db_df.to_dict(orient='records')
            cleaned_records = [clean_record_for_json(r) for r in raw_records]

            # Supabase 전송
            _ = supabase.table("stock_rankings").insert(cleaned_records).execute()
            print(f"[DB] 저장 성공: {db_df['strategy_name'].iloc[0]} ({len(cleaned_records)}행)")

        except Exception as e:
            print(f"[DB] 저장 에러 ({original_filename}): {e}")
            continue

    print("[INFO] 모든 작업 완료")

if __name__ == "__main__":
    upload_and_insert()