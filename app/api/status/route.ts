import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken } from '@/utils/kis-config';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // KIS 설정 가져오기
    const kisConfig = await getKISConfig(user.id);
    if (!kisConfig) {
      return NextResponse.json({
        status: 'offline',
        error: 'KIS API 설정이 필요합니다',
        timestamp: new Date().toISOString(),
        apiProvider: '한국투자증권'
      });
    }

    // KIS 액세스 토큰 발급으로 연결 상태 확인
    const accessToken = await getKISAccessToken(kisConfig);

    const isOnline = !!accessToken;

    return NextResponse.json({
      status: isOnline ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
      apiProvider: '한국투자증권',
      baseUrl: kisConfig.baseUrl,
      accountNumber: kisConfig.accountNumber.replace(/(\d{4})(\d{4})/, '$1****') // 계좌번호 마스킹
    });
  } catch (error) {
    console.error('API 상태 확인 실패:', error);
    return NextResponse.json({
      status: 'offline',
      error: '상태 확인 중 오류 발생',
      timestamp: new Date().toISOString(),
      apiProvider: '한국투자증권'
    }, { status: 500 });
  }
}