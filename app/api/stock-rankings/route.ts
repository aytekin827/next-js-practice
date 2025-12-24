import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // URL에서 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const strategy = searchParams.get('strategy');
    const date = searchParams.get('date');

    // 오늘 날짜를 기본값으로 사용
    const today = new Date().toISOString().split('T')[0];
    const queryDate = date || today;

    let query = supabase
      .from('stock_rankings')
      .select('*')
      .eq('ref_date', queryDate)
      .order('total_score', { ascending: false });

    // 전략이 지정된 경우 필터링
    if (strategy) {
      query = query.eq('strategy_number', strategy);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase 조회 오류:', error);
      return NextResponse.json({
        error: '데이터 조회에 실패했습니다',
        details: error.message
      }, { status: 500 });
    }

    // 데이터를 기존 QuantStock 인터페이스 형식으로 변환
    const transformedData = (data || []).map(item => {
      // 시가총액(억원)과 거래대금(원)을 이용해 대략적인 주가 추정
      // 실제로는 별도 API에서 현재가를 가져와야 하지만, 임시로 계산
      const marketCapWon = parseFloat(item.market_cap_bil || '0') * 100000000; // 억원을 원으로 변환
      const tradingValWon = parseInt(item.trading_val_won || '0');

      // 임시 주가 계산 (실제로는 정확하지 않음)
      let estimatedPrice = 50000; // 기본값 5만원
      if (marketCapWon > 0 && tradingValWon > 0) {
        // 거래대금 기준으로 대략적인 주가 추정
        estimatedPrice = Math.max(1000, Math.min(500000, tradingValWon / 1000000)); // 1천원~50만원 범위
      }

      return {
        종목명: item.name || '',
        종목코드: item.ticker || '',
        종가: Math.round(estimatedPrice),
        시가총액: parseFloat(item.market_cap_bil || '0'),
        거래량: 0, // 데이터베이스에 없는 필드
        거래대금: parseInt(item.trading_val_won || '0'),
        상장주식수: 0, // 데이터베이스에 없는 필드
        시장: item.market || '',
        BPS: 0, // 데이터베이스에 없는 필드
        PER: parseFloat(item.per || '0'),
        PBR: parseFloat(item.pbr || '0'),
        EPS: 0, // 데이터베이스에 없는 필드
        DIV: parseFloat(item.div_yield || '0'),
        DPS: 0, // 데이터베이스에 없는 필드
        mom_3m: parseFloat(item.mom_3m || '0'),
        mom_12m: parseFloat(item.mom_12m || '0'),
        value_score: parseFloat(item.value_score || '0'),
        quality_score: parseFloat(item.quality_score || '0'),
        momentum_score: parseFloat(item.momentum_score || '0'),
        risk_score: parseFloat(item.risk_score || '0'),
        total_score: parseFloat(item.total_score || '0'),
        시총구간: item.sector || '',
        리스크구간: '', // 데이터베이스에 없는 필드
        스타일: item.style || '',
        // 추가 메타데이터
        strategy_number: item.strategy_number,
        strategy_name: item.strategy_name,
        ref_date: item.ref_date
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length,
      date: queryDate,
      strategy: strategy || 'ALL'
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 사용 가능한 전략 목록 조회
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { action, date } = body;

    if (action === 'getStrategies') {
      // 오늘 날짜를 기본값으로 사용
      const today = new Date().toISOString().split('T')[0];
      const queryDate = date || today;

      // RPC 함수를 사용하여 DISTINCT 쿼리 실행
      const { data, error } = await supabase
        .rpc('get_distinct_strategies', {
          query_date: queryDate
        });

      if (error) {
        console.error('전략 목록 조회 오류:', error);
        // RPC 함수가 없는 경우 fallback으로 일반 쿼리 사용
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('stock_rankings')
          .select('strategy_number, strategy_name')
          .eq('ref_date', queryDate)
          .order('strategy_number')
          .limit(2000); // 제한을 늘려서 더 많은 데이터 가져오기

        if (fallbackError) {
          return NextResponse.json({
            error: '전략 목록 조회에 실패했습니다',
            details: fallbackError.message
          }, { status: 500 });
        }

        // 중복 제거
        const uniqueStrategies = Array.from(
          new Map(fallbackData.map(item => [item.strategy_number, {
            strategy_number: item.strategy_number,
            strategy_name: item.strategy_name
          }])).values()
        );

        return NextResponse.json({
          success: true,
          strategies: uniqueStrategies
        });
      }

      return NextResponse.json({
        success: true,
        strategies: data || []
      });
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}