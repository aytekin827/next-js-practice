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

    // Upbit 마켓 데이터 조회 (공개 API)
    const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-ADA,KRW-DOT,KRW-LINK,KRW-LTC,KRW-BCH,KRW-SOL,KRW-AVAX');
    
    if (!response.ok) {
      console.error('Upbit 마켓 데이터 조회 실패:', response.status);
      return NextResponse.json({ error: 'Upbit API 호출에 실패했습니다' }, { status: 400 });
    }

    const marketData = await response.json();

    // 코인 이름 매핑
    const coinNames: Record<string, { korean: string; english: string }> = {
      'KRW-BTC': { korean: '비트코인', english: 'Bitcoin' },
      'KRW-ETH': { korean: '이더리움', english: 'Ethereum' },
      'KRW-XRP': { korean: '리플', english: 'Ripple' },
      'KRW-ADA': { korean: '에이다', english: 'Cardano' },
      'KRW-DOT': { korean: '폴카닷', english: 'Polkadot' },
      'KRW-LINK': { korean: '체인링크', english: 'Chainlink' },
      'KRW-LTC': { korean: '라이트코인', english: 'Litecoin' },
      'KRW-BCH': { korean: '비트코인캐시', english: 'Bitcoin Cash' },
      'KRW-SOL': { korean: '솔라나', english: 'Solana' },
      'KRW-AVAX': { korean: '아발란체', english: 'Avalanche' }
    };

    // 데이터 포맷팅
    const formattedData = marketData.map((coin: any) => ({
      market: coin.market,
      koreanName: coinNames[coin.market]?.korean || coin.market,
      englishName: coinNames[coin.market]?.english || coin.market,
      tradePrice: coin.trade_price,
      changeRate: coin.change_rate,
      changePrice: coin.change_price,
      signedChangeRate: coin.signed_change_rate,
      signedChangePrice: coin.signed_change_price,
      tradeVolume: coin.trade_volume,
      accTradePrice24h: coin.acc_trade_price_24h
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('마켓 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: '마켓 데이터 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}