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

    // TODO: 한국투자증권 API 연동
    // 실제 자산 데이터를 가져오는 로직 구현

    // 임시 응답 데이터
    const assetData = {
      totalAssets: 15420000,
      totalAssetsChange: 234000,
      realizedPnL: 45000,
      buyingPower: 2340000,
      totalReturn: 12.5
    };

    return NextResponse.json(assetData);
  } catch (error) {
    console.error('자산 데이터 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}