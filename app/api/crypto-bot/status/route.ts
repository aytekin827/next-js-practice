import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const CRYPTO_BOT_SERVER = 'http://localhost:8001';
const BOT_SECRET_KEY = '2121';

export async function GET() {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 외부 봇 서버에 상태 확인 요청
    const response = await fetch(`${CRYPTO_BOT_SERVER}/api/bot/status`, {
      method: 'GET',
      headers: {
        'Authorization': BOT_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      // 타임아웃 설정 (5초)
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `봇 서버 응답 오류: ${response.status}`,
        isRunning: false,
        lastUpdate: new Date().toISOString(),
        message: '봇 서버에서 오류 응답을 받았습니다',
        runningCoins: []
      }, { status: 500 });
    }

    const data = await response.json();

    // 새로운 봇 서버 응답 형식 처리
    if (data.success && data.data) {
      const { active_coins, coin_status, total_active, server_time } = data.data;

      // active_coins 배열을 RunningCoin 형식으로 변환
      const runningCoins = active_coins.map((coinMarket: string) => {
        const coinInfo = coin_status[coinMarket];
        return {
          market: coinMarket,
          korean_name: coinInfo?.korean_name || coinMarket.replace('KRW-', ''),
          english_name: coinInfo?.english_name || coinMarket.replace('KRW-', ''),
          symbol: coinMarket.replace('KRW-', ''),
          startTime: coinInfo?.start_time || server_time
        };
      });

      return NextResponse.json({
        isRunning: total_active > 0,
        lastUpdate: server_time || new Date().toISOString(),
        message: total_active > 0 ? `${total_active}개 코인이 실행 중입니다` : '실행 중인 코인이 없습니다',
        runningCoins: runningCoins
      });
    }

    // 기존 형식 지원 (fallback)
    return NextResponse.json({
      isRunning: data.isRunning || false,
      lastUpdate: data.lastUpdate || new Date().toISOString(),
      message: data.message || '상태 확인 완료',
      runningCoins: data.runningCoins || []
    });

  } catch (error) {
    console.error('봇 상태 확인 실패:', error);

    // 네트워크 오류 또는 타임아웃
    return NextResponse.json({
      error: '봇 서버와 연결할 수 없습니다',
      isRunning: false,
      lastUpdate: new Date().toISOString(),
      message: '봇 서버가 오프라인이거나 응답하지 않습니다',
      runningCoins: []
    }, { status: 503 });
  }
}