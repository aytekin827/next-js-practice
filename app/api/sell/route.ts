import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { holdingId, quantity } = await request.json();

    if (!holdingId) {
      return NextResponse.json({ error: '종목 ID가 필요합니다' }, { status: 400 });
    }

    // TODO: 한국투자증권 API 연동
    // 실제 매도 주문 로직 구현
    console.log(`매도 주문: ${holdingId}, 수량: ${quantity || '전량'}`);

    // 임시 응답
    return NextResponse.json({
      success: true,
      message: '매도 주문이 전송되었습니다',
      orderId: `ORDER_${Date.now()}`
    });
  } catch (error) {
    console.error('매도 주문 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}