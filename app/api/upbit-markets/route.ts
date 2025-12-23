import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface UpbitMarket {
  market: string;
  korean_name: string;
  english_name: string;
}

interface ProcessedMarket {
  market: string;
  korean_name: string;
  english_name: string;
  symbol: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Upbit API에서 마켓 정보 가져오기
    const response = await fetch('https://api.upbit.com/v1/market/all?isDetails=false', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Upbit API 오류: ${response.status}`
      }, { status: 500 });
    }

    const markets: UpbitMarket[] = await response.json();

    // KRW 마켓만 필터링하고 정렬
    const krwMarkets: ProcessedMarket[] = markets
      .filter((market: UpbitMarket) => market.market.startsWith('KRW-'))
      .map((market: UpbitMarket) => ({
        market: market.market,
        korean_name: market.korean_name,
        english_name: market.english_name,
        symbol: market.market.replace('KRW-', ''),
      }))
      .sort((a: ProcessedMarket, b: ProcessedMarket) => a.korean_name.localeCompare(b.korean_name));

    return NextResponse.json({
      success: true,
      markets: krwMarkets,
      count: krwMarkets.length
    });

  } catch (error) {
    console.error('Upbit 마켓 정보 조회 실패:', error);
    return NextResponse.json({
      error: 'Upbit 마켓 정보를 가져올 수 없습니다'
    }, { status: 500 });
  }
}