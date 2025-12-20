import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUpbitConfig, createUpbitHeaders } from '@/utils/upbit-config';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Upbit 설정 가져오기
    const upbitConfig = await getUpbitConfig(user.id);
    if (!upbitConfig) {
      return NextResponse.json({
        error: 'Upbit API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // Upbit 주문 내역 조회 API 호출
    const headers = createUpbitHeaders(upbitConfig);
    
    const response = await fetch(`${upbitConfig.baseUrl}/v1/orders?state=done&limit=100`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.error('Upbit 주문 내역 조회 실패:', response.status);
      return NextResponse.json({
        error: 'Upbit API 호출에 실패했습니다'
      }, { status: 400 });
    }

    const orders = await response.json();

    // 오늘 날짜 필터링
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((order: { created_at: string }) => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return orderDate === today;
    });

    // 데이터 변환
    const cryptoTrades = todayOrders.map((order: {
      uuid: string;
      market: string;
      side: string;
      volume: string;
      executed_volume: string;
      price?: string;
      avg_price?: string;
      state: string;
      ord_type: string;
      created_at: string;
      trades?: Array<{ created_at: string }>;
      paid_fee?: string;
    }) => ({
      id: order.uuid,
      market: order.market,
      side: order.side, // 'bid' (매수) 또는 'ask' (매도)
      volume: parseFloat(order.volume),
      executedVolume: parseFloat(order.executed_volume),
      price: parseFloat(order.price || '0'),
      executedPrice: parseFloat(order.avg_price || order.price || '0'),
      status: order.state, // 'done', 'cancel', 'wait'
      orderType: order.ord_type, // 'limit', 'price', 'market'
      orderTime: order.created_at,
      executedTime: order.trades && order.trades.length > 0 ? order.trades[0].created_at : null,
      fee: order.paid_fee ? parseFloat(order.paid_fee) : 0,
      upbitOrderId: order.uuid
    }));

    return NextResponse.json(cryptoTrades);
  } catch (error) {
    console.error('코인 거래 내역 조회 실패:', error);
    return NextResponse.json(
      { error: '코인 거래 내역 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}