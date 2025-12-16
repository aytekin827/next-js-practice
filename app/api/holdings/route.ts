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
    // 실제 보유 종목 데이터를 가져오는 로직 구현

    // 임시 응답 데이터
    const holdings = [
      {
        id: '1',
        symbol: '005930',
        name: '삼성전자',
        quantity: 50,
        currentPrice: 71000,
        avgPrice: 68000,
        marketValue: 3550000,
        returnRate: 4.41
      },
      {
        id: '2',
        symbol: '000660',
        name: 'SK하이닉스',
        quantity: 30,
        currentPrice: 125000,
        avgPrice: 130000,
        marketValue: 3750000,
        returnRate: -3.85
      }
    ];

    return NextResponse.json(holdings);
  } catch (error) {
    console.error('보유 종목 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}