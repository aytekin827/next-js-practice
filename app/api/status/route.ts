import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // TODO: 한국투자증권 API 연결 상태 확인
    // 실제 API 상태 체크 로직 구현

    // 임시로 랜덤 상태 반환
    const isOnline = Math.random() > 0.2; // 80% 확률로 온라인

    return NextResponse.json({
      status: isOnline ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
      apiProvider: '한국투자증권'
    });
  } catch (error) {
    console.error('API 상태 확인 실패:', error);
    return NextResponse.json({
      status: 'offline',
      error: '상태 확인 중 오류 발생'
    }, { status: 500 });
  }
}