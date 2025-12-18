// timezone.ts - 한국 시간대 유틸리티

/**
 * 한국 표준시(KST) 기준으로 현재 날짜를 반환
 * 배포 환경의 시간대와 관계없이 항상 한국 시간 기준으로 동작
 */
export function getKoreanDate(): Date {
  // 현재 UTC 시간을 가져온 후 한국 시간대(UTC+9)로 변환
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const koreanTime = new Date(utc + (9 * 3600000)); // UTC+9 (한국 시간)

  return koreanTime;
}

/**
 * 한국 시간 기준으로 YYYYMMDD 형식의 날짜 문자열 반환
 */
export function getKoreanDateString(): string {
  const koreanDate = getKoreanDate();

  const year = koreanDate.getFullYear();
  const month = (koreanDate.getMonth() + 1).toString().padStart(2, '0');
  const day = koreanDate.getDate().toString().padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * 한국 시간 기준으로 YYYY-MM-DD 형식의 날짜 문자열 반환
 */
export function getKoreanDateStringFormatted(): string {
  const koreanDate = getKoreanDate();

  const year = koreanDate.getFullYear();
  const month = (koreanDate.getMonth() + 1).toString().padStart(2, '0');
  const day = koreanDate.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 한국 시간 기준으로 HHMMSS 형식의 시간 문자열 반환
 */
export function getKoreanTimeString(): string {
  const koreanDate = getKoreanDate();

  const hours = koreanDate.getHours().toString().padStart(2, '0');
  const minutes = koreanDate.getMinutes().toString().padStart(2, '0');
  const seconds = koreanDate.getSeconds().toString().padStart(2, '0');

  return `${hours}${minutes}${seconds}`;
}

/**
 * 한국 시간 기준으로 특정 날짜로부터 N일 전/후 날짜를 YYYYMMDD 형식으로 반환
 * @param days - 더할 일수 (음수면 과거, 양수면 미래)
 */
export function getKoreanDateStringWithOffset(days: number): string {
  const koreanDate = getKoreanDate();
  koreanDate.setDate(koreanDate.getDate() + days);

  const year = koreanDate.getFullYear();
  const month = (koreanDate.getMonth() + 1).toString().padStart(2, '0');
  const day = koreanDate.getDate().toString().padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * 한국 시간 기준으로 현재 시간이 한국 주식시장 거래시간인지 확인
 * 거래시간: 평일 09:00 ~ 15:30 (점심시간 포함)
 */
export function isKoreanTradingHours(): boolean {
  const koreanDate = getKoreanDate();
  const dayOfWeek = koreanDate.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

  // 주말 체크
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const hours = koreanDate.getHours();
  const minutes = koreanDate.getMinutes();
  const currentTime = hours * 100 + minutes; // HHMM 형식으로 변환

  // 거래시간: 09:00 ~ 15:30
  return currentTime >= 900 && currentTime <= 1530;
}

/**
 * 한국 시간 기준으로 현재 시간 정보를 객체로 반환
 */
export function getKoreanTimeInfo() {
  const koreanDate = getKoreanDate();

  return {
    date: koreanDate,
    dateString: getKoreanDateString(),
    dateStringFormatted: getKoreanDateStringFormatted(),
    timeString: getKoreanTimeString(),
    isTradingHours: isKoreanTradingHours(),
    timezone: 'Asia/Seoul',
    utcOffset: '+09:00'
  };
}