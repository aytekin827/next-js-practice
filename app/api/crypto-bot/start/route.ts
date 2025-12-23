import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const CRYPTO_BOT_SERVER = 'http://localhost:8001';
const BOT_SECRET_KEY = '2121';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 요청 본문에서 코인 정보 가져오기
    const body = await request.json().catch(() => ({}));
    const { selectedCoin } = body;

    const queryParams = new URLSearchParams({
      coin: selectedCoin || 'KRW-BTC' // 기본값으로 KRW-BTC 사용
    });

    const response = await fetch(`${CRYPTO_BOT_SERVER}/api/bot/start?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': BOT_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      // 타임아웃 설정 (10초)
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error || `봇 시작 실패: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: data.message || '봇이 성공적으로 시작되었습니다',
      isRunning: true,
      lastUpdate: new Date().toISOString(),
      selectedCoin: selectedCoin || 'KRW-BTC'
    });

  } catch (error) {
    console.error('봇 시작 실패:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        error: '봇 서버 응답 시간 초과'
      }, { status: 408 });
    }

    return NextResponse.json({
      error: '봇 서버와 연결할 수 없습니다'
    }, { status: 503 });
  }
}