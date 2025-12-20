import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 전략별 거래내역 조회 (최근 100개)
    const { data, error } = await supabase
      .from('crypto_strategy_trades')
      .select(`
        *,
        crypto_strategies!inner(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('전략 거래내역 조회 실패:', error);
      return NextResponse.json({ error: '거래내역 조회에 실패했습니다' }, { status: 500 });
    }

    // 데이터 변환
    const trades = (data || []).map(trade => ({
      id: trade.id,
      strategyId: trade.strategy_id,
      strategyName: trade.crypto_strategies.name,
      market: trade.market,
      type: trade.trade_type,
      quantity: parseFloat(trade.quantity),
      price: parseFloat(trade.price),
      totalAmount: parseFloat(trade.total_amount),
      timestamp: trade.created_at,
      status: trade.status,
      reason: trade.reason || ''
    }));

    return NextResponse.json(trades);
  } catch (error) {
    console.error('전략 거래내역 조회 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}