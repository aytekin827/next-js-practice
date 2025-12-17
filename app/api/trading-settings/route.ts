import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface TradingSettings {
  defaultStopLossPercent: number;
  defaultProfitPercent: number;
  maxAmountPerStock: number;
  gapFilterMinPercent: number;
  gapFilterMaxPercent: number;
  defaultStockCount: number;
  defaultMinVolume: number;
  defaultMarket: 'KOSPI' | 'KOSDAQ';
  // 퀀텀종목추천 관련 설정
  quantumDefaultProfitPercent: number;
  quantumDefaultStopLossPercent: number;
  quantumMaxAmountPerStock: number;
}

// 기본 설정값
const DEFAULT_SETTINGS: TradingSettings = {
  defaultStopLossPercent: 3.0,
  defaultProfitPercent: 1.0,
  maxAmountPerStock: 50000,
  gapFilterMinPercent: 3.0,
  gapFilterMaxPercent: 7.0,
  defaultStockCount: 20,
  defaultMinVolume: 50000,
  defaultMarket: 'KOSPI',
  // 퀀텀종목추천 기본값
  quantumDefaultProfitPercent: 1.0,
  quantumDefaultStopLossPercent: 3.0,
  quantumMaxAmountPerStock: 50000
};

// 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자별 설정 조회
    const { data, error } = await supabase
      .from('trading_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터가 없을 때
      console.error('설정 조회 실패:', error);
      return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 });
    }

    // 데이터가 없으면 기본값 반환
    if (!data) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // DB 데이터를 클라이언트 형식으로 변환
    const settings: TradingSettings = {
      defaultStopLossPercent: parseFloat(data.default_stop_loss_percent) || DEFAULT_SETTINGS.defaultStopLossPercent,
      defaultProfitPercent: parseFloat(data.default_profit_percent) || DEFAULT_SETTINGS.defaultProfitPercent,
      maxAmountPerStock: data.max_amount_per_stock || DEFAULT_SETTINGS.maxAmountPerStock,
      gapFilterMinPercent: parseFloat(data.gap_filter_min_percent) || DEFAULT_SETTINGS.gapFilterMinPercent,
      gapFilterMaxPercent: parseFloat(data.gap_filter_max_percent) || DEFAULT_SETTINGS.gapFilterMaxPercent,
      defaultStockCount: data.default_stock_count || DEFAULT_SETTINGS.defaultStockCount,
      defaultMinVolume: data.default_min_volume || DEFAULT_SETTINGS.defaultMinVolume,
      defaultMarket: data.default_market || DEFAULT_SETTINGS.defaultMarket,
      // 퀀텀종목추천 설정
      quantumDefaultProfitPercent: parseFloat(data.quantum_default_profit_percent) || DEFAULT_SETTINGS.quantumDefaultProfitPercent,
      quantumDefaultStopLossPercent: parseFloat(data.quantum_default_stop_loss_percent) || DEFAULT_SETTINGS.quantumDefaultStopLossPercent,
      quantumMaxAmountPerStock: data.quantum_max_amount_per_stock || DEFAULT_SETTINGS.quantumMaxAmountPerStock
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('설정 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 설정 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const settings: TradingSettings = await request.json();

    // 입력값 검증
    if (settings.defaultStopLossPercent < 0 || settings.defaultStopLossPercent > 50) {
      return NextResponse.json({ error: '손절 퍼센트는 0-50% 범위여야 합니다' }, { status: 400 });
    }
    if (settings.defaultProfitPercent < 0 || settings.defaultProfitPercent > 50) {
      return NextResponse.json({ error: '익절 퍼센트는 0-50% 범위여야 합니다' }, { status: 400 });
    }
    if (settings.maxAmountPerStock < 1000 || settings.maxAmountPerStock > 10000000) {
      return NextResponse.json({ error: '종목당 최대 금액은 1,000원-10,000,000원 범위여야 합니다' }, { status: 400 });
    }

    // 클라이언트 데이터를 DB 형식으로 변환
    const dbData = {
      user_id: user.id,
      default_stop_loss_percent: settings.defaultStopLossPercent,
      default_profit_percent: settings.defaultProfitPercent,
      max_amount_per_stock: settings.maxAmountPerStock,
      gap_filter_min_percent: settings.gapFilterMinPercent,
      gap_filter_max_percent: settings.gapFilterMaxPercent,
      default_stock_count: settings.defaultStockCount,
      default_min_volume: settings.defaultMinVolume,
      default_market: settings.defaultMarket,
      // 퀀텀종목추천 설정
      quantum_default_profit_percent: settings.quantumDefaultProfitPercent,
      quantum_default_stop_loss_percent: settings.quantumDefaultStopLossPercent,
      quantum_max_amount_per_stock: settings.quantumMaxAmountPerStock,
      updated_at: new Date().toISOString()
    };

    // UPSERT (있으면 업데이트, 없으면 생성)
    const { error } = await supabase
      .from('trading_settings')
      .upsert(dbData, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('설정 저장 실패:', error);
      return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '설정이 저장되었습니다' });
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}